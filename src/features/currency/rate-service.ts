import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeEffectiveDate } from "@/features/currency/rate-date";

type RetrievedRate = { quote: "VES" | "COP"; rate: number; effectiveDate: string; source: string; raw: unknown };

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
  const rows = await response.json() as Array<{ valor?: string; vigenciadesde?: string }>;
  const row = rows[0];
  if (!row?.valor || !row.vigenciadesde) throw new Error("La TRM no devolvió datos.");
  return { quote: "COP", rate: validRate(row.valor), effectiveDate: normalizeEffectiveDate(row.vigenciadesde), source: "BANREP_TRM", raw: row };
}

async function fetchVesRate(): Promise<RetrievedRate> {
  const apiKey = process.env.BCV_API_KEY;
  if (!apiKey) throw new Error("Falta configurar BCV_API_KEY en Vercel.");
  const response = await fetch("https://bcvapi.tech/api/v1/dolar", {
    headers: { Accept: "application/json", Authorization: apiKey },
    signal: AbortSignal.timeout(12_000),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`BCV API respondió ${response.status}.`);
  const data = await response.json() as { tasa?: number | string; fecha?: string };
  if (!data.fecha) throw new Error("BCV API no devolvió la fecha efectiva.");
  return { quote: "VES", rate: validRate(data.tasa), effectiveDate: normalizeEffectiveDate(data.fecha), source: "BCV", raw: data };
}

export async function refreshAutomaticRates() {
  const admin = createAdminClient();
  const results = await Promise.allSettled([fetchVesRate(), fetchCopRate()]);
  const summary: Array<{ quote: string; success: boolean; message: string }> = [];
  for (const [index, result] of results.entries()) {
    const quote = index === 0 ? "VES" : "COP";
    if (result.status === "fulfilled") {
      const value = result.value;
      const { data: previous } = await admin.from("exchange_rates").select("rate").eq("base_currency", "USD").eq("quote_currency", quote).single();
      const previousRate = previous?.rate ? Number(previous.rate) : null;
      const variation = previousRate ? Math.abs(value.rate / previousRate - 1) : 0;
      if (previousRate && variation > 0.25) {
        const message = `Variación anómala de ${(variation * 100).toFixed(1)}%; requiere revisión manual.`;
        await admin.from("exchange_rates").update({ status: "error", error_message: message, retrieved_at: new Date().toISOString(), raw_reference: value.raw, updated_at: new Date().toISOString() }).eq("base_currency", "USD").eq("quote_currency", quote);
        summary.push({ quote, success: false, message });
        continue;
      }
      const { error } = await admin.from("exchange_rates").update({ rate: value.rate, source: value.source, effective_date: value.effectiveDate, retrieved_at: new Date().toISOString(), status: "current", error_message: null, raw_reference: value.raw, updated_at: new Date().toISOString() }).eq("base_currency", "USD").eq("quote_currency", quote);
      if (error) throw new Error(error.message);
      summary.push({ quote, success: true, message: `1 USD = ${value.rate} ${quote}` });
    } else {
      const message = result.reason instanceof Error ? result.reason.message : "Error desconocido.";
      await admin.from("exchange_rates").update({ status: "error", error_message: message, retrieved_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("base_currency", "USD").eq("quote_currency", quote);
      summary.push({ quote, success: false, message });
    }
  }
  return summary;
}
