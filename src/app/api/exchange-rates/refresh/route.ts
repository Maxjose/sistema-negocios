import { refreshAutomaticRates } from "@/features/currency/rate-service";

export async function GET(request: Request) {
  const startedAt = Date.now();
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const results = await refreshAutomaticRates();
    console.log(JSON.stringify({ event: "exchange_rates_refresh_completed", duration_ms: Date.now() - startedAt, results }));
    return Response.json({ results });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido.";
    console.error(JSON.stringify({ event: "exchange_rates_refresh_failed", duration_ms: Date.now() - startedAt, error: message }));
    return Response.json({ error: "No se pudieron actualizar las tasas." }, { status: 500 });
  }
}
