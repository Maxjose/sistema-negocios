import "server-only";

import { requireRole } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { effectiveRate } from "@/features/currency/conversion";
import type { BusinessCurrency, CurrencyDisplayConfig, GlobalExchangeRate } from "@/features/currency/types";

export async function getCurrencyDisplayConfig(): Promise<CurrencyDisplayConfig> {
  await requireRole("owner");
  const supabase = await createClient();
  const [{ data: business, error: businessError }, { data: settings, error: settingsError }, { data: rates, error: ratesError }] = await Promise.all([
    supabase.from("businesses").select("currency_code, enable_multicurrency").single(),
    supabase.from("business_currencies").select("id, currency_code, is_enabled, rate_mode, manual_rate, adjustment_percent, rounding_increment, display_order").order("display_order"),
    supabase.from("exchange_rates").select("id, base_currency, quote_currency, rate, source, effective_date, retrieved_at, status, error_message"),
  ]);
  if (businessError || settingsError || ratesError) throw new Error(businessError?.message ?? settingsError?.message ?? ratesError?.message);
  const globalRates = rates as unknown as GlobalExchangeRate[];
  const currencies = (settings ?? []).map((setting) => {
    const automatic = globalRates.find((rate) => rate.base_currency === business.currency_code && rate.quote_currency === setting.currency_code);
    const automaticRate = automatic?.rate === null || automatic?.rate === undefined ? null : Number(automatic.rate);
    const manualRate = setting.manual_rate === null ? null : Number(setting.manual_rate);
    return {
      ...setting,
      manual_rate: manualRate,
      adjustment_percent: Number(setting.adjustment_percent),
      rounding_increment: Number(setting.rounding_increment),
      automatic_rate: automaticRate,
      automatic_source: automatic?.source ?? null,
      automatic_effective_date: automatic?.effective_date ?? null,
      automatic_status: automatic?.status ?? null,
      effective_rate: effectiveRate({ automaticRate, manualRate, mode: setting.rate_mode, adjustmentPercent: Number(setting.adjustment_percent) }),
    } as BusinessCurrency;
  });
  return { baseCurrency: business.currency_code, enabled: business.enable_multicurrency, currencies };
}

export async function getGlobalExchangeRates(): Promise<GlobalExchangeRate[]> {
  await requireRole("super_admin");
  const admin = createAdminClient();
  const { data, error } = await admin.from("exchange_rates").select("id, base_currency, quote_currency, rate, source, effective_date, retrieved_at, status, error_message").order("quote_currency");
  if (error) throw new Error(error.message);
  return data as unknown as GlobalExchangeRate[];
}
