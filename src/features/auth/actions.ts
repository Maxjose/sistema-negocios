"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

export type LoginState = {
  error?: string;
};

export type PasswordChangeState = {
  error?: string;
  success?: string;
};

const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
});

export async function login(
  _previousState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: "Introduce un correo y una contraseña válidos." };
  }

  const supabase = await createClient();
  const { data: authData, error: authError } =
    await supabase.auth.signInWithPassword(parsed.data);

  if (authError || !authData.user) {
    return { error: "El correo o la contraseña no son correctos." };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role, status, must_change_password, businesses(status, plan_expires_at)")
    .eq("id", authData.user.id)
    .single();

  const business = Array.isArray(profile?.businesses)
    ? profile.businesses[0]
    : profile?.businesses;
  const businessIsAllowed =
    profile?.role === "super_admin" || business?.status === "active";

  if (
    profileError ||
    !profile ||
    profile.status !== "active" ||
    !businessIsAllowed
  ) {
    await supabase.auth.signOut();
    return { error: "Esta cuenta no está activa. Contacta al administrador." };
  }
  const { data: maintenanceMode, error: maintenanceError } = await supabase.rpc("is_maintenance_mode");
  if (maintenanceError || (profile.role === "owner" && maintenanceMode)) {
    await supabase.auth.signOut();
    return { error: maintenanceMode ? "El sistema está temporalmente en mantenimiento." : "No se pudo verificar el estado del sistema." };
  }

  const { error: loginAuditError } = await supabase.rpc(
    "record_authenticated_login",
  );
  if (loginAuditError) {
    await supabase.auth.signOut();
    return { error: "No se pudo completar el acceso. Intenta nuevamente." };
  }

  const planExpired = profile.role === "owner" && business?.plan_expires_at && new Date(business.plan_expires_at) <= new Date();
  redirect(
    planExpired
      ? "/plan-expired"
      : profile.must_change_password
      ? "/change-password"
      : profile.role === "super_admin"
        ? "/admin"
        : "/dashboard",
  );
}

const passwordChangeSchema = z
  .object({
    password: z.string().min(12).max(128),
    confirmation: z.string().min(12).max(128),
  })
  .refine((values) => values.password === values.confirmation, {
    message: "Las contraseñas no coinciden.",
  });

export async function changeInitialPassword(
  _previousState: PasswordChangeState,
  formData: FormData,
): Promise<PasswordChangeState> {
  const parsed = passwordChangeSchema.safeParse({
    password: formData.get("password"),
    confirmation: formData.get("confirmation"),
  });
  if (!parsed.success) {
    return {
      error:
        parsed.error.issues[0]?.message ??
        "Usa una contraseña de al menos 12 caracteres.",
    };
  }

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect("/login");

  const { error: passwordError } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });
  if (passwordError) return { error: "No se pudo actualizar la contraseña." };

  const { error: profileError } = await supabase.rpc(
    "complete_initial_password_change",
  );
  if (profileError) {
    return {
      error: "La contraseña cambió, pero no se pudo completar el proceso.",
    };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();
  redirect(profile?.role === "super_admin" ? "/admin" : "/dashboard");
}

const accountPasswordSchema = z
  .object({
    current_password: z.string().min(8).max(128),
    password: z.string().min(12).max(128),
    confirmation: z.string().min(12).max(128),
  })
  .refine((values) => values.password === values.confirmation, {
    message: "Las contraseñas nuevas no coinciden.",
  })
  .refine((values) => values.current_password !== values.password, {
    message: "La nueva contraseña debe ser diferente a la actual.",
  });

export async function changeAccountPassword(
  _previousState: PasswordChangeState,
  formData: FormData,
): Promise<PasswordChangeState> {
  const parsed = accountPasswordSchema.safeParse({
    current_password: formData.get("current_password"),
    password: formData.get("password"),
    confirmation: formData.get("confirmation"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Revisa las contraseñas." };
  }

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const email = userData.user?.email;
  if (!email) redirect("/login");

  const { error: verificationError } = await supabase.auth.signInWithPassword({
    email,
    password: parsed.data.current_password,
  });
  if (verificationError) return { error: "La contraseña actual no es correcta." };

  const { error: passwordError } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });
  if (passwordError) return { error: "No se pudo actualizar la contraseña." };

  const { error: auditError } = await supabase.rpc("record_password_change");
  if (auditError) return { error: "La contraseña cambió, pero no se pudo registrar la acción." };
  return { success: "Contraseña actualizada correctamente." };
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
