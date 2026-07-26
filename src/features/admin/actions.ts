"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireRole } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type AdminActionState = {
  error?: string;
  success?: string;
};

export async function updateMaintenanceMode(_state: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const actor = await requireRole("super_admin");
  const enabled = formData.get("maintenance_mode") === "on";
  const admin = createAdminClient();
  const { data: before } = await admin.from("platform_settings").select("maintenance_mode").eq("id", true).single();
  const { error } = await admin.from("platform_settings").update({ maintenance_mode: enabled, updated_at: new Date().toISOString(), updated_by: actor.id }).eq("id", true);
  if (error) return { error: error.message };
  await audit({ action: "platform.maintenance_updated", entityType: "platform", entityId: "maintenance", before, after: { maintenance_mode: enabled } });
  revalidatePath("/admin/settings");
  return { success: enabled ? "Modo mantenimiento activado." : "Modo mantenimiento desactivado." };
}

const optionalText = z.string().trim().max(250).optional();

const businessSchema = z.object({
  name: z.string().trim().min(2).max(120),
  currency_code: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/),
  timezone: z.string().trim().min(3).max(80),
  contact_email: z.union([z.literal(""), z.email()]).optional(),
  contact_phone: optionalText,
  address: optionalText,
  status: z.enum(["active", "inactive"]),
});

const ownerSchema = z.object({
  full_name: z.string().trim().min(2).max(120),
  email: z.email(),
  password: z.string().min(12).max(128),
  business_id: z.uuid(),
});

const updateOwnerSchema = z.object({
  full_name: z.string().trim().min(2).max(120),
  email: z.email(),
  business_id: z.uuid(),
  status: z.enum(["active", "inactive"]),
  password: z.union([z.literal(""), z.string().min(12).max(128)]),
});

const businessFeaturesSchema = z.object({
  use_stock: z.boolean(),
  allow_discounts: z.boolean(),
  allow_sale_notes: z.boolean(),
});
const planSchema = z.enum(["free", "basic", "premium", "unlimited"]);

export async function updateBusinessPlan(id: string, _state: AdminActionState, formData: FormData): Promise<AdminActionState> {
  await requireRole("super_admin");
  const parsed = planSchema.safeParse(formData.get("plan_tier"));
  if (!parsed.success) return { error: "Selecciona un plan válido." };
  const admin = createAdminClient();
  const { data: before } = await admin.from("businesses").select("plan_tier, plan_started_at, plan_expires_at").eq("id", id).single();
  if (!before) return { error: "El negocio no existe." };
  const startedAt = new Date();
  const expiresAt = parsed.data === "unlimited" ? null : new Date(startedAt.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const payload = { plan_tier: parsed.data, plan_started_at: startedAt.toISOString(), plan_expires_at: expiresAt };
  const { error } = await admin.from("businesses").update(payload).eq("id", id);
  if (error) return { error: error.message };
  await audit({ action: "business.plan_updated", entityType: "business", entityId: id, businessId: id, before, after: payload });
  revalidatePath("/admin/businesses");
  revalidatePath(`/admin/businesses/${id}`);
  return { success: parsed.data === "unlimited" ? "Plan Unlimited activado sin vencimiento." : "Plan actualizado por 30 días." };
}

async function audit(input: {
  action: string;
  entityType: string;
  entityId?: string;
  businessId?: string | null;
  before?: unknown;
  after?: unknown;
}) {
  const actor = await requireRole("super_admin");
  const admin = createAdminClient();
  const { error } = await admin.from("audit_logs").insert({
    actor_user_id: actor.id,
    business_id: input.businessId ?? null,
    action: input.action,
    entity_type: input.entityType,
    entity_id: input.entityId ?? null,
    before_data: input.before ?? null,
    after_data: input.after ?? null,
  });

  if (error) throw new Error(`Unable to write audit log: ${error.message}`);
}

async function revokeOwnerSessions(userId: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("revoke_owner_sessions", {
    p_user_id: userId,
  });
  if (error) throw new Error(`Unable to revoke sessions: ${error.message}`);
}

function businessInput(formData: FormData) {
  return businessSchema.safeParse({
    name: formData.get("name"),
    currency_code: formData.get("currency_code"),
    timezone: formData.get("timezone"),
    contact_email: formData.get("contact_email"),
    contact_phone: formData.get("contact_phone"),
    address: formData.get("address"),
    status: formData.get("status"),
  });
}

export async function createBusiness(
  _state: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await requireRole("super_admin");
  const parsed = businessInput(formData);
  if (!parsed.success) return { error: "Revisa los datos del negocio." };

  const admin = createAdminClient();
  const payload = {
    ...parsed.data,
    contact_email: parsed.data.contact_email || null,
    contact_phone: parsed.data.contact_phone || null,
    address: parsed.data.address || null,
  };
  const { data: business, error } = await admin
    .from("businesses")
    .insert(payload)
    .select()
    .single();

  if (error || !business) return { error: error?.message ?? "No se pudo crear." };

  const { error: defaultsError } = await admin.from("payment_methods").insert([
    { business_id: business.id, name: "Efectivo", display_order: 0 },
    { business_id: business.id, name: "Transferencia", display_order: 1 },
  ]);
  const { error: categoryError } = await admin.from("categories").insert({
    business_id: business.id,
    name: "General",
  });

  if (defaultsError || categoryError) {
    await admin.from("payment_methods").delete().eq("business_id", business.id);
    await admin.from("categories").delete().eq("business_id", business.id);
    await admin.from("businesses").delete().eq("id", business.id);
    return { error: "No se pudo completar la configuración inicial." };
  }

  await audit({
    action: "business.created",
    entityType: "business",
    entityId: business.id,
    businessId: business.id,
    after: payload,
  });
  revalidatePath("/admin");
  redirect(`/admin/businesses/${business.id}`);
}

export async function updateBusiness(
  id: string,
  _state: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await requireRole("super_admin");
  const parsed = businessInput(formData);
  if (!parsed.success) return { error: "Revisa los datos del negocio." };

  const admin = createAdminClient();
  const { data: before } = await admin.from("businesses").select().eq("id", id).single();
  if (!before) return { error: "El negocio no existe." };

  const payload = {
    ...parsed.data,
    contact_email: parsed.data.contact_email || null,
    contact_phone: parsed.data.contact_phone || null,
    address: parsed.data.address || null,
  };
  const { error } = await admin.from("businesses").update(payload).eq("id", id);
  if (error) return { error: error.message };

  await audit({
    action: "business.updated",
    entityType: "business",
    entityId: id,
    businessId: id,
    before,
    after: payload,
  });
  revalidatePath("/admin");
  revalidatePath("/admin/businesses");
  revalidatePath(`/admin/businesses/${id}`);
  return { success: "Información actualizada correctamente." };
}

export async function updateBusinessFeatures(
  id: string,
  _state: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await requireRole("super_admin");
  const parsed = businessFeaturesSchema.safeParse({
    use_stock: formData.get("use_stock") === "on",
    allow_discounts: formData.get("allow_discounts") === "on",
    allow_sale_notes: formData.get("allow_sale_notes") === "on",
  });
  if (!parsed.success) return { error: "No se pudo validar la configuración." };

  const admin = createAdminClient();
  const { data: before } = await admin
    .from("businesses")
    .select("use_stock, allow_discounts, allow_sale_notes")
    .eq("id", id)
    .single();
  if (!before) return { error: "El negocio no existe." };

  const { error } = await admin.from("businesses").update(parsed.data).eq("id", id);
  if (error) return { error: error.message };
  await audit({
    action: "business.features_updated",
    entityType: "business",
    entityId: id,
    businessId: id,
    before,
    after: parsed.data,
  });
  revalidatePath(`/admin/businesses/${id}`);
  return { success: "Funciones actualizadas correctamente." };
}

export async function uploadBusinessLogo(
  id: string,
  _state: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await requireRole("super_admin");
  const file = formData.get("logo");
  if (!(file instanceof File) || file.size === 0) return { error: "Selecciona una imagen." };
  if (file.size > 5 * 1024 * 1024) return { error: "La imagen supera 5 MB." };

  const extensions: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
  };
  const extension = extensions[file.type];
  if (!extension) return { error: "Usa una imagen JPG, PNG o WebP." };

  const admin = createAdminClient();
  const path = `${id}/logo.${extension}`;
  const { error: uploadError } = await admin.storage
    .from("business-assets")
    .upload(path, file, { contentType: file.type, upsert: true });
  if (uploadError) return { error: uploadError.message };

  const { data: before } = await admin.from("businesses").select("logo_path").eq("id", id).single();
  const { error } = await admin.from("businesses").update({ logo_path: path }).eq("id", id);
  if (error) return { error: error.message };

  if (before?.logo_path && before.logo_path !== path) {
    await admin.storage.from("business-assets").remove([before.logo_path]);
  }

  await audit({
    action: "business.logo_updated",
    entityType: "business",
    entityId: id,
    businessId: id,
    before,
    after: { logo_path: path },
  });
  revalidatePath(`/admin/businesses/${id}`);
  return { success: "Logotipo actualizado correctamente." };
}

export async function createOwner(
  _state: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await requireRole("super_admin");
  const parsed = ownerSchema.safeParse({
    full_name: formData.get("full_name"),
    email: formData.get("email"),
    password: formData.get("password"),
    business_id: formData.get("business_id"),
  });
  if (!parsed.success) return { error: "Revisa los datos y usa una contraseña de 12 caracteres." };

  const admin = createAdminClient();
  const { data: business } = await admin
    .from("businesses")
    .select("id, status")
    .eq("id", parsed.data.business_id)
    .single();
  if (!business || business.status !== "active") return { error: "Selecciona un negocio activo." };

  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email: parsed.data.email.toLowerCase(),
    password: parsed.data.password,
    email_confirm: true,
    user_metadata: { full_name: parsed.data.full_name },
  });
  if (authError || !authData.user) return { error: authError?.message ?? "No se pudo crear el acceso." };

  const { error: profileError } = await admin.from("profiles").insert({
    id: authData.user.id,
    business_id: parsed.data.business_id,
    full_name: parsed.data.full_name,
    role: "owner",
    status: "active",
    must_change_password: true,
  });
  if (profileError) {
    await admin.auth.admin.deleteUser(authData.user.id);
    return { error: profileError.message };
  }

  await audit({
    action: "owner.created",
    entityType: "profile",
    entityId: authData.user.id,
    businessId: parsed.data.business_id,
    after: {
      full_name: parsed.data.full_name,
      email: parsed.data.email.toLowerCase(),
      role: "owner",
    },
  });
  revalidatePath("/admin");
  redirect("/admin/users");
}

export async function setOwnerStatus(userId: string, status: "active" | "inactive") {
  await requireRole("super_admin");
  const admin = createAdminClient();
  const { data: before } = await admin.from("profiles").select().eq("id", userId).single();
  if (!before || before.role !== "owner") return;

  const { error } = await admin.from("profiles").update({ status }).eq("id", userId);
  if (error) throw new Error(error.message);
  if (status === "inactive") await revokeOwnerSessions(userId);

  await audit({
    action: status === "active" ? "owner.activated" : "owner.deactivated",
    entityType: "profile",
    entityId: userId,
    businessId: before.business_id,
    before: { status: before.status },
    after: { status },
  });
  revalidatePath("/admin");
  revalidatePath("/admin/users");
}

export async function updateOwner(
  userId: string,
  _state: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await requireRole("super_admin");
  const parsed = updateOwnerSchema.safeParse({
    full_name: formData.get("full_name"),
    email: formData.get("email"),
    business_id: formData.get("business_id"),
    status: formData.get("status"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: "Revisa los datos del propietario." };

  const admin = createAdminClient();
  const { data: business } = await admin
    .from("businesses")
    .select("id")
    .eq("id", parsed.data.business_id)
    .single();
  if (!business) return { error: "El negocio seleccionado no existe." };

  const { data: before } = await admin.from("profiles").select().eq("id", userId).single();
  if (!before || before.role !== "owner") return { error: "El propietario no existe." };

  const profilePayload = {
    full_name: parsed.data.full_name,
    business_id: parsed.data.business_id,
    status: parsed.data.status,
    must_change_password: parsed.data.password ? true : before.must_change_password,
  };
  const { error: profileError } = await admin.from("profiles").update(profilePayload).eq("id", userId);
  if (profileError) return { error: profileError.message };

  const authPayload: {
    email: string;
    email_confirm: boolean;
    user_metadata: { full_name: string };
    password?: string;
  } = {
    email: parsed.data.email.toLowerCase(),
    email_confirm: true,
    user_metadata: { full_name: parsed.data.full_name },
  };
  if (parsed.data.password) authPayload.password = parsed.data.password;

  const { error: authError } = await admin.auth.admin.updateUserById(userId, authPayload);
  if (authError) {
    await admin
      .from("profiles")
      .update({
        full_name: before.full_name,
        business_id: before.business_id,
        status: before.status,
        must_change_password: before.must_change_password,
      })
      .eq("id", userId);
    return { error: authError.message };
  }

  if (parsed.data.status === "inactive" || parsed.data.password) {
    await revokeOwnerSessions(userId);
  }

  await audit({
    action: "owner.updated",
    entityType: "profile",
    entityId: userId,
    businessId: parsed.data.business_id,
    before: {
      full_name: before.full_name,
      business_id: before.business_id,
      status: before.status,
    },
    after: {
      ...profilePayload,
      email: parsed.data.email.toLowerCase(),
      password_reset: Boolean(parsed.data.password),
    },
  });
  revalidatePath("/admin");
  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${userId}`);
  return { success: "Propietario actualizado correctamente." };
}
