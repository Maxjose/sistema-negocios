"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireRole } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { refreshAutomaticRates } from "@/features/currency/rate-service";
import { sendTelegramAlert } from "@/features/currency/telegram-alert";

export type CurrencyActionState = { error?: string; success?: string };

const settingsSchema = z.object({
  currency_code: z.enum(["VES", "COP"]),
  is_enabled: z.boolean(),
  rate_mode: z.enum(["automatic", "manual"]),
  manual_rate: z.number().positive().nullable(),
  adjustment_percent: z.number().min(-50).max(100),
  rounding_increment: z.number().positive().max(1_000_000),
});

export async function updateBusinessCurrency(_state: CurrencyActionState, formData: FormData): Promise<CurrencyActionState> {
  const profile = await requireRole("owner");
  if (!profile.business_id) return { error: "El usuario no tiene un negocio asignado." };
  const mode = String(formData.get("rate_mode"));
  const manualValue = String(formData.get("manual_rate") ?? "").trim();
  const parsed = settingsSchema.safeParse({
    currency_code: formData.get("currency_code"),
    is_enabled: formData.get("is_enabled") === "on",
    rate_mode: mode,
    manual_rate: manualValue ? Number(manualValue) : null,
    adjustment_percent: Number(formData.get("adjustment_percent") || 0),
    rounding_increment: Number(formData.get("rounding_increment") || 0.01),
  });
  if (!parsed.success) return { error: "Revisa la tasa, el ajuste y el redondeo." };
  if (parsed.data.rate_mode === "manual" && parsed.data.manual_rate === null) return { error: "Introduce una tasa manual válida." };
  const supabase = await createClient();
  const { data: business } = await supabase.from("businesses").select("enable_multicurrency, currency_code").single();
  if (!business?.enable_multicurrency) return { error: "El superadministrador no ha habilitado la función multimoneda." };
  if (business.currency_code !== "USD") return { error: "La actualización automática está disponible actualmente para negocios con moneda base USD." };
  const { error } = await supabase.from("business_currencies").update({
    is_enabled: parsed.data.is_enabled,
    rate_mode: parsed.data.rate_mode,
    manual_rate: parsed.data.manual_rate,
    adjustment_percent: parsed.data.adjustment_percent,
    rounding_increment: parsed.data.rounding_increment,
    updated_at: new Date().toISOString(),
  }).eq("business_id", profile.business_id).eq("currency_code", parsed.data.currency_code);
  if (error) return { error: error.message };
  const admin = createAdminClient();
  await admin.from("audit_logs").insert({ business_id: profile.business_id, actor_user_id: profile.id, action: "currency.settings_updated", entity_type: "business_currency", entity_id: parsed.data.currency_code, after_data: parsed.data });
  revalidatePath("/settings");
  revalidatePath("/products");
  revalidatePath("/sales/new");
  return { success: `Configuración de ${parsed.data.currency_code} actualizada.` };
}

export async function refreshRatesNow(_state: CurrencyActionState): Promise<CurrencyActionState> {
  void _state;
  await requireRole("super_admin");
  const results = await refreshAutomaticRates();
  revalidatePath("/admin/settings");
  const successes = results.filter((result) => result.success).length;
  return successes > 0
    ? { success: `${successes} tasa(s) actualizada(s). Revisa el estado de cada fuente.` }
    : { error: results.map((result) => `${result.quote}: ${result.message}`).join(" · ") };
}

export async function testTelegramRateAlert(_state: CurrencyActionState): Promise<CurrencyActionState> {
  void _state;
  await requireRole("super_admin");
  try {
    const timestamp = new Intl.DateTimeFormat("es-VE", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "America/Caracas",
    }).format(new Date());
    await sendTelegramAlert([
      "🔔 Monii App — Alerta de prueba",
      "",
      "Las notificaciones de tasas están configuradas correctamente.",
      `Hora: ${timestamp}`,
    ].join("\n"));
    return { success: "Alerta de prueba enviada a Telegram." };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "No se pudo enviar la alerta." };
  }
}

export async function setGlobalExchangeRate(quote: "VES" | "COP", _state: CurrencyActionState, formData: FormData): Promise<CurrencyActionState> {
  const actor = await requireRole("super_admin");
  const parsed = z.coerce.number().positive().max(1_000_000_000).safeParse(formData.get("rate"));
  if (!parsed.success) return { error: "Introduce una tasa válida." };
  const admin = createAdminClient();
  const { data: before } = await admin.from("exchange_rates").select("rate, source, effective_date").eq("base_currency", "USD").eq("quote_currency", quote).single();
  const payload = { rate: parsed.data, source: "ADMIN_MANUAL", effective_date: new Date().toISOString().slice(0, 10), retrieved_at: new Date().toISOString(), status: "current", error_message: null, updated_at: new Date().toISOString() };
  const { error } = await admin.from("exchange_rates").update(payload).eq("base_currency", "USD").eq("quote_currency", quote);
  if (error) return { error: error.message };
  await admin.from("audit_logs").insert({ actor_user_id: actor.id, action: "currency.global_rate_updated", entity_type: "exchange_rate", entity_id: quote, before_data: before, after_data: payload });
  revalidatePath("/admin/settings");
  return { success: `Tasa USD/${quote} actualizada manualmente.` };
}
