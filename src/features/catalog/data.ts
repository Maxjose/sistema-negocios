import "server-only";

import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type {
  Category,
  PaymentMethod,
  Product,
  BusinessFeatures,
  AccentTheme,
} from "@/features/catalog/types";

async function ownerClient() {
  await requireRole("owner");
  return createClient();
}

export async function getBusinessAccent(): Promise<AccentTheme> {
  const supabase = await ownerClient();
  const { data, error } = await supabase.from("businesses").select("accent_theme").single();
  if (error) throw new Error(error.message);
  return data.accent_theme as AccentTheme;
}

export async function getCategories(): Promise<Category[]> {
  const supabase = await ownerClient();
  const { data, error } = await supabase
    .from("categories")
    .select("id, name, description, is_active, display_order")
    .order("display_order")
    .order("name");
  if (error) throw new Error(error.message);
  return data as Category[];
}

export async function getPaymentMethods(): Promise<PaymentMethod[]> {
  const supabase = await ownerClient();
  const { data, error } = await supabase
    .from("payment_methods")
    .select("id, name, is_active, display_order")
    .order("display_order")
    .order("name");
  if (error) throw new Error(error.message);
  return data as PaymentMethod[];
}

export async function getBusinessFeatures(): Promise<BusinessFeatures> {
  const supabase = await ownerClient();
  const { data, error } = await supabase
    .from("businesses")
    .select("use_stock, allow_discounts, allow_sale_notes, enable_customers, enable_credits, enable_stock_adjustments")
    .single();
  if (error) throw new Error(error.message);
  return data as BusinessFeatures;
}

export async function getProducts(): Promise<Product[]> {
  const supabase = await ownerClient();
  const { data, error } = await supabase
    .from("products")
    .select(
      "id, name, sku, description, image_path, cost_price, sale_price, stock_quantity, low_stock_threshold, is_active, category_id, categories(name), created_at",
    )
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data as unknown as Product[];
}

export async function getProduct(id: string): Promise<Product | null> {
  const products = await getProducts();
  return products.find((product) => product.id === id) ?? null;
}

export async function getInventoryAdjustments(productId: string) {
  const supabase = await ownerClient();
  const { data, error } = await supabase
    .from("inventory_adjustments")
    .select("id, previous_quantity, new_quantity, difference, reason, created_at")
    .eq("product_id", productId)
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) throw new Error(error.message);
  return data;
}
