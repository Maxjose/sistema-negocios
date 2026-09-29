import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeEffectiveDate } from "@/features/currency/rate-date";
import { parseBcvTodayPayload } from "@/features/currency/rate-provider";
import { rateAlertTransition, type PreviousRateState } from "@/features/currency/rate-alert-policy";
import { sendTelegramAlert } from "@/features/currency/telegram-alert";

type RetrievedRate = { quote: "VES" | "COP"; rate: number; effectiveDate: string; source: string; raw: unknown };

type StoredRate = PreviousRateState & {
  rate?: number | string | null;
  source?: string | null;
  effective_date?: string | null;
};

const bcvSources = [
  { url: "https://bcv.today/api/v1/rate.json", source: "BCV_TODAY" },
  { url: "https://cdn.jsdelivr.net/gh/grupoclip/bcv-api/api/v1/rate.json", source: "BCV_TODAY_CDN" },
] as const;

async function readJson(response: Response, provider: string) {
  const contentType = response.headers.get("content-type") ?? "";
  const body = await response.text();
  if (!contentType.toLowerCase().includes("application/json")) {
    throw new Error(`${provider} devolvió contenido no válido en lugar de JSON.`);
  }
  try {
    return JSON.parse(body) as unknown;
  } catch {
    throw new Error(`${provider} devolvió un JSON inválido.`);
  }
}

async function fetchWithRetry(url: string, attempts = 3) {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(20_000),
        cache: "no-store",
      });
      if (!response.ok) throw new Error(`El proveedor respondió ${response.status}.`);
      return response;
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await new Promise((resolve) => setTimeout(resolve, attempt * 1_000));
    }
  }
  throw lastError instanceof Error ? lastError : new Error("No fue posible consultar el proveedor.");
}

function validRate(value: unknown) {
  const number = typeof value === "string" ? Number(value.replace(",", ".")) : Number(value);
  if (!Number.isFinite(number) || number <= 0) throw new Error("La fuente devolvió una tasa inválida.");
  return number;
}

async function fetchCopRate(): Promise<RetrievedRate> {
  const url = "https://www.datos.gov.co/resource/ceyp-9c7c.json?$limit=1&$order=vigenciadesde%20DESC";
  const response = await fetchWithRetry(url);
  if (!response.ok) throw new Error(`TRM Colombia respondió ${response.status}.`);
  const rows = await readJson(response, "TRM Colombia") as Array<{ valor?: string; vigenciadesde?: string }>;
  const row = rows[0];
  if (!row?.valor || !row.vigenciadesde) throw new Error("La TRM no devolvió datos.");
  return { quote: "COP", rate: validRate(row.valor), effectiveDate: normalizeEffectiveDate(row.vigenciadesde), source: "BANREP_TRM", raw: row };
}

async function fetchVesRate(): Promise<RetrievedRate> {
  const errors: string[] = [];
  for (const provider of bcvSources) {
    try {
      const response = await fetchWithRetry(provider.url, 2);
      const data = await readJson(response, provider.source);
      const parsed = parseBcvTodayPayload(data);
      return {
        quote: "VES",
        rate: parsed.rate,
        effectiveDate: normalizeEffectiveDate(parsed.effectiveDate),
        source: provider.source,
        raw: { ...parsed.raw, provider_url: provider.url },
      };
    } catch (error) {
      errors.push(error instanceof Error ? error.message : "Error desconocido.");
    }
  }
  throw new Error(`No fue posible consultar BCV Today. ${errors.join(" ")}`);
}

function localTimestamp() {
  return new Intl.DateTimeFormat("es-VE", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Caracas",
  }).format(new Date());
}

async function notifyRateTransition(
  quote: "VES" | "COP",
  previous: StoredRate | null,
  next: { status: "current" | "error"; message?: string; value?: RetrievedRate },
) {
  const transition = rateAlertTransition(previous, next);
  if (!transition) return;
  const previousRate = previous?.rate ? `${Number(previous.rate)} ${quote}` : "sin tasa previa";
  const text = transition === "error"
    ? [
        "🚨 Monii App — Falló una tasa de cambio",
        "",
        `Moneda: USD/${quote}`,
        `Detalle: ${next.message ?? "Error desconocido."}`,
        `Última tasa: 1 USD = ${previousRate}`,
        `Hora: ${localTimestamp()}`,
      ].join("\n")
    : [
        "✅ Monii App — Tasa recuperada",
        "",
        `Moneda: USD/${quote}`,
        `Nueva tasa: 1 USD = ${next.value?.rate} ${quote}`,
        `Fuente: ${next.value?.source}`,
        `Hora: ${localTimestamp()}`,
      ].join("\n");
  try {
    await sendTelegramAlert(text);
  } catch (error) {
    console.error(JSON.stringify({
      event: "exchange_rate_telegram_alert_failed",
      quote,
      error: error instanceof Error ? error.message : "Error desconocido.",
    }));
  }
}

export async function refreshAutomaticRates() {
  const admin = createAdminClient();
  const results = await Promise.allSettled([fetchVesRate(), fetchCopRate()]);
  const summary: Array<{ quote: string; success: boolean; message: string }> = [];
  for (const [index, result] of results.entries()) {
    const quote: "VES" | "COP" = index === 0 ? "VES" : "COP";
    const { data: previousData } = await admin
      .from("exchange_rates")
      .select("rate, source, effective_date, status, error_message")
      .eq("base_currency", "USD")
      .eq("quote_currency", quote)
      .single();
    const previous = previousData as StoredRate | null;
    if (result.status === "fulfilled") {
      const value = result.value;
      const previousRate = previous?.rate ? Number(previous.rate) : null;
      const variation = previousRate ? Math.abs(value.rate / previousRate - 1) : 0;
      if (previousRate && variation > 0.25) {
        const message = `Variación anómala de ${(variation * 100).toFixed(1)}%; requiere revisión manual.`;
        await admin.from("exchange_rates").update({ status: "error", error_message: message, retrieved_at: new Date().toISOString(), raw_reference: value.raw, updated_at: new Date().toISOString() }).eq("base_currency", "USD").eq("quote_currency", quote);
        await notifyRateTransition(quote, previous, { status: "error", message });
        summary.push({ quote, success: false, message });
        continue;
      }
      const { error } = await admin.from("exchange_rates").update({ rate: value.rate, source: value.source, effective_date: value.effectiveDate, retrieved_at: new Date().toISOString(), status: "current", error_message: null, raw_reference: value.raw, updated_at: new Date().toISOString() }).eq("base_currency", "USD").eq("quote_currency", quote);
      if (error) throw new Error(error.message);
      await notifyRateTransition(quote, previous, { status: "current", value });
      summary.push({ quote, success: true, message: `1 USD = ${value.rate} ${quote}` });
    } else {
      const message = result.reason instanceof Error ? result.reason.message : "Error desconocido.";
      await admin.from("exchange_rates").update({ status: "error", error_message: message, retrieved_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("base_currency", "USD").eq("quote_currency", quote);
      await notifyRateTransition(quote, previous, { status: "error", message });
      summary.push({ quote, success: false, message });
    }
  }
  return summary;
}
