import "server-only";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { Sale } from "@/features/sales/types";

async function client() {
  await requireRole("owner");
  return createClient();
}

export async function getSales(): Promise<Sale[]> {
  const supabase = await client();
  const { data, error } = await supabase
    .from("sales")
    .select("id, sale_number, sold_at, total, total_cost, gross_profit, discount, payment_method_name, status, note, void_reason, voided_at")
    .order("sold_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data as Sale[];
}

export async function getSale(id: string): Promise<Sale | null> {
  const supabase = await client();
  const { data, error } = await supabase
    .from("sales")
    .select("id, sale_number, sold_at, subtotal, total, total_cost, gross_profit, discount, payment_method_name, status, note, void_reason, voided_at, sale_items(id, product_name, product_sku, quantity, unit_cost, unit_price, subtotal, gross_profit)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as unknown as Sale | null;
}
