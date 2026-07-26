import "server-only";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { ReceiptBusiness, Sale } from "@/features/sales/types";

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
    .select("id, sale_number, sold_at, subtotal, total, total_cost, gross_profit, discount, payment_method_name, customer_name, customers(phone), status, note, void_reason, voided_at, sale_items(id, product_name, product_sku, quantity, unit_cost, unit_price, subtotal, gross_profit), sale_payments(id, payment_method_name, amount)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as unknown as Sale | null;
}

export async function getReceiptBusiness(): Promise<ReceiptBusiness> {
  const supabase = await client();
  const { data, error } = await supabase
    .from("businesses")
    .select("name, logo_path, currency_code, timezone, contact_email, contact_phone, address")
    .single();
  if (error) throw new Error(error.message);

  let logoUrl: string | null = null;
  if (data.logo_path) {
    const { data: signed } = await supabase.storage
      .from("business-assets")
      .createSignedUrl(data.logo_path, 3600);
    logoUrl = signed?.signedUrl ?? null;
  }

  return {
    name: data.name,
    logo_url: logoUrl,
    currency_code: data.currency_code,
    timezone: data.timezone,
    contact_email: data.contact_email,
    contact_phone: data.contact_phone,
    address: data.address,
  };
}
