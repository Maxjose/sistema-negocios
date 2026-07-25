import "server-only";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { BusinessReport } from "@/features/reports/types";

export async function getBusinessReport(from: string, to: string): Promise<BusinessReport> {
  await requireRole("owner");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("business_report", { p_from: from, p_to: to });
  if (error) throw new Error(error.message);
  return data as BusinessReport;
}
