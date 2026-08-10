import { refreshAutomaticRates } from "@/features/currency/rate-service";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const results = await refreshAutomaticRates();
  return Response.json({ results });
}
