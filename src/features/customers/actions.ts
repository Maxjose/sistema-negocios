"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireRole } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { joinPhone, phoneCountries } from "./phone";

export type CustomerState = { error?: string; success?: string };

async function context(requireCredits = false) {
  const profile = await requireRole("owner");
  if (!profile.business_id) throw new Error("El usuario no tiene un negocio asignado.");
  const supabase = await createClient();
  const { data: business } = await supabase.from("businesses").select("enable_customers, enable_credits").eq("id", profile.business_id).single();
  if (!business?.enable_customers || (requireCredits && !business.enable_credits)) throw new Error("Esta función no está habilitada.");
  return { profile, businessId: profile.business_id, supabase };
}

async function audit(action: string, type: string, id: string, businessId: string, actorId: string, after: unknown) {
  const { error } = await createAdminClient().from("audit_logs").insert({
    action, entity_type: type, entity_id: id, business_id: businessId, actor_user_id: actorId, after_data: after,
  });
  if (error) throw new Error(error.message);
}

const customerSchema = z.object({
  name: z.string().trim().min(2).max(160),
  phone_country_code: z.enum(phoneCountries.map((country) => country.code) as [string, ...string[]]),
  phone_number: z.string().trim().max(20).regex(/^[\d\s()-]*$/),
  email: z.union([z.literal(""), z.email()]).optional(),
  notes: z.string().trim().max(1000).optional(),
});

export async function createCustomer(_state: CustomerState, formData: FormData): Promise<CustomerState> {
  const parsed = customerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Revisa el nombre, teléfono y correo." };
  const { profile, businessId, supabase } = await context();
  const phone = joinPhone(parsed.data.phone_country_code, parsed.data.phone_number);
  if (phone && phone.replace(/\D/g, "").length < 7) return { error: "El número de teléfono es demasiado corto." };
  const payload = { name: parsed.data.name, phone, email: parsed.data.email || null, notes: parsed.data.notes || null, business_id: businessId };
  const { data, error } = await supabase.from("customers").insert(payload).select("id").single();
  if (error || !data) return { error: error?.message ?? "No se pudo crear el cliente." };
  await audit("customer.created", "customer", data.id, businessId, profile.id, payload);
  revalidatePath("/customers");
  return { success: "Cliente creado correctamente." };
}

export async function toggleCustomer(id: string, active: boolean) {
  const { profile, businessId, supabase } = await context();
  const { error } = await supabase.from("customers").update({ is_active: active, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) throw new Error(error.message);
  await audit("customer.status_changed", "customer", id, businessId, profile.id, { is_active: active });
  revalidatePath("/customers");
}

export async function updateCustomer(id: string, _state: CustomerState, formData: FormData): Promise<CustomerState> {
  const parsed = customerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Revisa el nombre, teléfono y correo." };
  const { profile, businessId, supabase } = await context();
  const phone = joinPhone(parsed.data.phone_country_code, parsed.data.phone_number);
  if (phone && phone.replace(/\D/g, "").length < 7) return { error: "El número de teléfono es demasiado corto." };
  const payload = { name: parsed.data.name, phone, email: parsed.data.email || null, notes: parsed.data.notes || null, updated_at: new Date().toISOString() };
  const { data, error } = await supabase.from("customers").update(payload).eq("id", id).select("id").maybeSingle();
  if (error || !data) return { error: error?.message ?? "El cliente no existe." };
  await audit("customer.updated", "customer", id, businessId, profile.id, payload);
  revalidatePath("/customers");
  return { success: "Cliente actualizado." };
}

const receivableSchema = z.object({
  customer_id: z.uuid(),
  description: z.string().trim().min(2).max(250),
  amount: z.coerce.number().positive().max(999999999999),
  due_date: z.iso.date(),
});

export async function createReceivable(_state: CustomerState, formData: FormData): Promise<CustomerState> {
  const parsed = receivableSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Revisa el cliente, monto y fecha de vencimiento." };
  const { profile, businessId, supabase } = await context(true);
  const { data: customer } = await supabase.from("customers").select("id").eq("id", parsed.data.customer_id).eq("is_active", true).maybeSingle();
  if (!customer) return { error: "El cliente no está disponible." };
  const payload = {
    business_id: businessId, customer_id: customer.id, description: parsed.data.description,
    original_amount: parsed.data.amount, balance: parsed.data.amount, due_date: parsed.data.due_date,
    created_by: profile.id,
  };
  const { data, error } = await supabase.from("receivables").insert(payload).select("id").single();
  if (error || !data) return { error: error?.message ?? "No se pudo crear la cuenta." };
  await audit("receivable.created", "receivable", data.id, businessId, profile.id, payload);
  revalidatePath("/receivables");
  redirect(`/receivables/${data.id}`);
}

const paymentSchema = z.object({
  amount: z.coerce.number().positive().max(999999999999),
  payment_method_id: z.uuid(),
  note: z.string().trim().max(500).optional(),
});

export async function recordReceivablePayment(id: string, _state: CustomerState, formData: FormData): Promise<CustomerState> {
  const parsed = paymentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Revisa el monto y el método de pago." };
  const { supabase } = await context(true);
  const { error } = await supabase.rpc("record_receivable_payment", {
    p_receivable_id: id, p_amount: parsed.data.amount, p_payment_method_id: parsed.data.payment_method_id, p_note: parsed.data.note || null,
  });
  if (error) {
    const message = error.message.includes("INVALID_PAYMENT_AMOUNT") ? "El abono supera el saldo pendiente." : error.message;
    return { error: message };
  }
  revalidatePath("/receivables");
  revalidatePath(`/receivables/${id}`);
  return { success: "Abono registrado correctamente." };
}
