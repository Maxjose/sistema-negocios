"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireRole } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { AccentTheme } from "@/features/catalog/types";

export type CatalogState = { error?: string; success?: string };
const accentSchema = z.enum(["emerald", "blue", "violet", "rose", "amber", "cyan"]);

export async function setBusinessAccent(accent: AccentTheme) {
  await requireRole("owner");
  const parsed = accentSchema.safeParse(accent);
  if (!parsed.success) throw new Error("Color de acento inválido.");
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_business_accent", { p_accent_theme: parsed.data });
  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
}

async function context() {
  const profile = await requireRole("owner");
  if (!profile.business_id) throw new Error("Owner has no business.");
  return {
    profile,
    businessId: profile.business_id,
    supabase: await createClient(),
  };
}

async function audit(input: {
  action: string;
  type: string;
  id: string;
  businessId: string;
  actorId: string;
  before?: unknown;
  after?: unknown;
}) {
  const admin = createAdminClient();
  const { error } = await admin.from("audit_logs").insert({
    actor_user_id: input.actorId,
    business_id: input.businessId,
    action: input.action,
    entity_type: input.type,
    entity_id: input.id,
    before_data: input.before ?? null,
    after_data: input.after ?? null,
  });
  if (error) throw new Error(`Unable to write audit log: ${error.message}`);
}

const settingSchema = z.object({
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().max(250).optional(),
  display_order: z.coerce.number().int().min(0).max(999),
});

export async function createCategory(
  _state: CatalogState,
  formData: FormData,
): Promise<CatalogState> {
  const { profile, businessId, supabase } = await context();
  const parsed = settingSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
    display_order: formData.get("display_order") || 0,
  });
  if (!parsed.success) return { error: "Revisa los datos de la categoría." };
  const { data, error } = await supabase
    .from("categories")
    .insert({ ...parsed.data, business_id: businessId })
    .select()
    .single();
  if (error || !data) return { error: error?.message ?? "No se pudo crear." };
  await audit({ action: "category.created", type: "category", id: data.id, businessId, actorId: profile.id, after: parsed.data });
  revalidatePath("/settings");
  return { success: "Categoría creada." };
}

export async function toggleCategory(id: string, isActive: boolean) {
  const { profile, businessId, supabase } = await context();
  const { error } = await supabase.from("categories").update({ is_active: isActive }).eq("id", id);
  if (error) throw new Error(error.message);
  await audit({ action: "category.status_changed", type: "category", id, businessId, actorId: profile.id, after: { is_active: isActive } });
  revalidatePath("/settings");
}

export async function deleteCategory(id: string): Promise<{ error?: string }> {
  const { profile, businessId, supabase } = await context();
  const { count, error: usageError } = await supabase.from("products").select("*", { count: "exact", head: true }).eq("category_id", id);
  if (usageError) return { error: usageError.message };
  if ((count ?? 0) > 0) return { error: "No puedes borrar esta categoría porque está asignada a uno o más productos. Cambia primero la categoría de esos productos." };
  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) return { error: "No se pudo borrar la categoría porque contiene información relacionada." };
  await audit({ action: "category.deleted", type: "category", id, businessId, actorId: profile.id });
  revalidatePath("/settings");
  return {};
}

export async function updateCategory(id: string, formData: FormData) {
  const { profile, businessId, supabase } = await context();
  const parsed = settingSchema.safeParse({
    name: formData.get("name"),
    description: "",
    display_order: formData.get("display_order") || 0,
  });
  if (!parsed.success) throw new Error("Datos de categoría inválidos.");
  const { error } = await supabase
    .from("categories")
    .update(parsed.data)
    .eq("id", id);
  if (error) throw new Error(error.message);
  await audit({ action: "category.updated", type: "category", id, businessId, actorId: profile.id, after: parsed.data });
  revalidatePath("/settings");
}

export async function createPaymentMethod(
  _state: CatalogState,
  formData: FormData,
): Promise<CatalogState> {
  const { profile, businessId, supabase } = await context();
  const parsed = settingSchema.omit({ description: true }).safeParse({
    name: formData.get("name"),
    display_order: formData.get("display_order") || 0,
  });
  if (!parsed.success) return { error: "Revisa los datos del método." };
  const { data, error } = await supabase
    .from("payment_methods")
    .insert({ ...parsed.data, business_id: businessId })
    .select()
    .single();
  if (error || !data) return { error: error?.message ?? "No se pudo crear." };
  await audit({ action: "payment_method.created", type: "payment_method", id: data.id, businessId, actorId: profile.id, after: parsed.data });
  revalidatePath("/settings");
  return { success: "Método de pago creado." };
}

export async function togglePaymentMethod(id: string, isActive: boolean) {
  const { profile, businessId, supabase } = await context();
  const { error } = await supabase.from("payment_methods").update({ is_active: isActive }).eq("id", id);
  if (error) throw new Error(error.message);
  await audit({ action: "payment_method.status_changed", type: "payment_method", id, businessId, actorId: profile.id, after: { is_active: isActive } });
  revalidatePath("/settings");
}

export async function deletePaymentMethod(id: string): Promise<{ error?: string }> {
  const { profile, businessId, supabase } = await context();
  const [{ count: salesCount }, { count: paymentsCount }, { count: receivablePaymentsCount }] = await Promise.all([
    supabase.from("sales").select("*", { count: "exact", head: true }).eq("payment_method_id", id),
    supabase.from("sale_payments").select("*", { count: "exact", head: true }).eq("payment_method_id", id),
    supabase.from("receivable_payments").select("*", { count: "exact", head: true }).eq("payment_method_id", id),
  ]);
  if ((salesCount ?? 0) + (paymentsCount ?? 0) + (receivablePaymentsCount ?? 0) > 0) {
    return { error: "No puedes borrar este método porque ya fue utilizado en ventas o abonos. Puedes conservarlo para mantener el historial." };
  }
  const { error } = await supabase.from("payment_methods").delete().eq("id", id);
  if (error) return { error: "No se pudo borrar el método de pago porque contiene información relacionada." };
  await audit({ action: "payment_method.deleted", type: "payment_method", id, businessId, actorId: profile.id });
  revalidatePath("/settings");
  return {};
}

export async function updatePaymentMethod(id: string, formData: FormData) {
  const { profile, businessId, supabase } = await context();
  const parsed = settingSchema.omit({ description: true }).safeParse({
    name: formData.get("name"),
    display_order: formData.get("display_order") || 0,
  });
  if (!parsed.success) throw new Error("Datos de método inválidos.");
  const { error } = await supabase
    .from("payment_methods")
    .update(parsed.data)
    .eq("id", id);
  if (error) throw new Error(error.message);
  await audit({ action: "payment_method.updated", type: "payment_method", id, businessId, actorId: profile.id, after: parsed.data });
  revalidatePath("/settings");
}

export async function reorderSettings(kind: "categories" | "payment_methods", orderedIds: string[]) {
  const parsed = z.object({ kind: z.enum(["categories", "payment_methods"]), ids: z.array(z.uuid()).max(200) }).safeParse({ kind, ids: orderedIds });
  if (!parsed.success) throw new Error("Orden inválido.");
  const { profile, businessId, supabase } = await context();
  const { data, error: readError } = await supabase.from(kind).select("id");
  if (readError) throw new Error(readError.message);
  const allowed = new Set((data ?? []).map((item) => item.id));
  if (parsed.data.ids.length !== allowed.size || parsed.data.ids.some((id) => !allowed.has(id))) throw new Error("La lista cambió. Recarga e inténtalo nuevamente.");
  const results = await Promise.all(parsed.data.ids.map((id, index) => supabase.from(kind).update({ display_order: index }).eq("id", id)));
  const updateError = results.find((result) => result.error)?.error;
  if (updateError) throw new Error(updateError.message);
  await audit({ action: `${kind}.reordered`, type: kind, id: "order", businessId, actorId: profile.id, after: { ids: parsed.data.ids } });
  revalidatePath("/settings");
}

const productSchema = z.object({
  name: z.string().trim().min(1).max(160),
  sku: z.string().trim().max(80).optional(),
  description: z.string().trim().max(1000).optional(),
  category_id: z.union([z.literal(""), z.uuid()]),
  cost_price: z.coerce.number().min(0).max(999999999999),
  sale_price: z.coerce.number().min(0).max(999999999999),
  stock_quantity: z.coerce.number().int().min(0),
  low_stock_threshold: z.coerce.number().int().min(0),
  is_active: z.enum(["true", "false"]).transform((value) => value === "true"),
});

function productInput(formData: FormData) {
  return productSchema.safeParse({
    name: formData.get("name"),
    sku: formData.get("sku"),
    description: formData.get("description"),
    category_id: formData.get("category_id"),
    cost_price: formData.get("cost_price"),
    sale_price: formData.get("sale_price"),
    stock_quantity: formData.get("stock_quantity"),
    low_stock_threshold: formData.get("low_stock_threshold"),
    is_active: formData.get("is_active"),
  });
}

export async function createProduct(
  _state: CatalogState,
  formData: FormData,
): Promise<CatalogState> {
  const { profile, businessId, supabase } = await context();
  const parsed = productInput(formData);
  if (!parsed.success) return { error: "Revisa precios, cantidades y campos obligatorios." };
  const payload = { ...parsed.data, business_id: businessId, category_id: parsed.data.category_id || null, sku: parsed.data.sku || null, description: parsed.data.description || null };
  const { data, error } = await supabase.from("products").insert(payload).select().single();
  if (error || !data) return { error: error?.message ?? "No se pudo crear." };
  await audit({ action: "product.created", type: "product", id: data.id, businessId, actorId: profile.id, after: payload });
  revalidatePath("/products");
  redirect(`/products/${data.id}`);
}

export async function updateProduct(
  id: string,
  _state: CatalogState,
  formData: FormData,
): Promise<CatalogState> {
  const { profile, businessId, supabase } = await context();
  const parsed = productInput(formData);
  if (!parsed.success) return { error: "Revisa precios, cantidades y campos obligatorios." };
  const { data: before } = await supabase.from("products").select().eq("id", id).single();
  if (!before) return { error: "El producto no existe." };
  const { data: business } = await supabase.from("businesses").select("enable_stock_adjustments").eq("id", businessId).single();
  const payload = { ...parsed.data, stock_quantity: business?.enable_stock_adjustments ? before.stock_quantity : parsed.data.stock_quantity, category_id: parsed.data.category_id || null, sku: parsed.data.sku || null, description: parsed.data.description || null };
  const { error } = await supabase.from("products").update(payload).eq("id", id);
  if (error) return { error: error.message };
  await audit({ action: before.stock_quantity !== payload.stock_quantity ? "product.stock_updated" : "product.updated", type: "product", id, businessId, actorId: profile.id, before, after: payload });
  revalidatePath("/products");
  revalidatePath(`/products/${id}`);
  return { success: "Producto actualizado." };
}

const adjustmentSchema = z.object({
  new_quantity: z.coerce.number().int().min(0),
  reason: z.string().trim().min(3).max(250),
});

export async function adjustProductStock(id: string, _state: CatalogState, formData: FormData): Promise<CatalogState> {
  const parsed = adjustmentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Indica la nueva cantidad y un motivo." };
  const { supabase } = await context();
  const { error } = await supabase.rpc("adjust_product_stock", {
    p_product_id: id,
    p_new_quantity: parsed.data.new_quantity,
    p_reason: parsed.data.reason,
  });
  if (error) return { error: error.message };
  revalidatePath("/products");
  revalidatePath(`/products/${id}`);
  return { success: "Existencia ajustada correctamente." };
}

export async function uploadProductImage(
  id: string,
  _state: CatalogState,
  formData: FormData,
): Promise<CatalogState> {
  const { profile, businessId, supabase } = await context();
  const file = formData.get("image");
  if (!(file instanceof File) || file.size === 0) return { error: "Selecciona una imagen." };
  if (file.size > 5 * 1024 * 1024) return { error: "La imagen supera 5 MB." };
  const extensions: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
  const extension = extensions[file.type];
  if (!extension) return { error: "Usa JPG, PNG o WebP." };
  const path = `${businessId}/products/${id}.${extension}`;
  const { error: uploadError } = await supabase.storage.from("business-assets").upload(path, file, { contentType: file.type, upsert: true });
  if (uploadError) return { error: uploadError.message };
  const { error } = await supabase.from("products").update({ image_path: path }).eq("id", id);
  if (error) return { error: error.message };
  await audit({ action: "product.image_updated", type: "product", id, businessId, actorId: profile.id, after: { image_path: path } });
  revalidatePath(`/products/${id}`);
  return { success: "Imagen actualizada." };
}

function parseCsvLine(line: string) {
  const values: string[] = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"' && quoted && line[index + 1] === '"') { value += '"'; index += 1; }
    else if (character === '"') quoted = !quoted;
    else if (character === "," && !quoted) { values.push(value.trim()); value = ""; }
    else value += character;
  }
  values.push(value.trim());
  return values;
}

export async function importProducts(_state: CatalogState, formData: FormData): Promise<CatalogState> {
  const { profile, businessId, supabase } = await context();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Selecciona un archivo CSV." };
  if (file.size > 1024 * 1024) return { error: "El archivo supera 1 MB." };
  const lines = (await file.text()).replace(/^\uFEFF/, "").split(/\r?\n/).filter(Boolean);
  if (lines.length < 2 || lines.length > 501) return { error: "Incluye entre 1 y 500 productos." };
  const headers = parseCsvLine(lines[0]).map((header) => header.toLowerCase());
  const required = ["nombre", "precio_costo", "precio_venta"];
  if (required.some((header) => !headers.includes(header))) return { error: "Faltan columnas: nombre, precio_costo o precio_venta." };
  const { data: categories } = await supabase.from("categories").select("id, name");
  const categoryMap = new Map((categories ?? []).map((category) => [category.name.toLowerCase(), category.id]));
  const payload = [];
  for (let index = 1; index < lines.length; index += 1) {
    const values = parseCsvLine(lines[index]);
    const row = Object.fromEntries(headers.map((header, position) => [header, values[position] ?? ""]));
    const parsed = productSchema.safeParse({
      name: row.nombre, sku: row.sku, description: row.descripcion,
      category_id: row.categoria ? categoryMap.get(row.categoria.toLowerCase()) ?? "" : "",
      cost_price: row.precio_costo, sale_price: row.precio_venta,
      stock_quantity: row.existencia || 0, low_stock_threshold: row.minimo || 0,
      is_active: "true",
    });
    if (!parsed.success) return { error: `La fila ${index + 1} contiene datos inválidos.` };
    payload.push({ ...parsed.data, business_id: businessId, category_id: parsed.data.category_id || null, sku: parsed.data.sku || null, description: parsed.data.description || null });
  }
  const { error } = await supabase.from("products").insert(payload);
  if (error) return { error: `No se pudo importar: ${error.message}` };
  await audit({ action: "products.imported", type: "product", id: "bulk", businessId, actorId: profile.id, after: { count: payload.length } });
  revalidatePath("/products");
  return { success: `${payload.length} productos importados correctamente.` };
}
