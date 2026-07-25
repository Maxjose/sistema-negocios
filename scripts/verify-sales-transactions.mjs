import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publicKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !publicKey || !serviceKey) throw new Error("Supabase variables required.");

const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
const suffix = randomUUID();
const password = `Sale!${randomUUID()}Aa1`;
const ids = {};

try {
  const { data: business, error: businessError } = await admin.from("businesses").insert({ name: `Sales QA ${suffix}` }).select("id").single();
  if (businessError) throw businessError; ids.business = business.id;
  const { data: authData, error: authError } = await admin.auth.admin.createUser({ email: `sales-${suffix}@example.invalid`, password, email_confirm: true });
  if (authError) throw authError; ids.user = authData.user.id;
  const { error: profileError } = await admin.from("profiles").insert({ id: ids.user, business_id: ids.business, full_name: "Sales QA", role: "owner", status: "active" });
  if (profileError) throw profileError;
  const { data: method, error: methodError } = await admin.from("payment_methods").insert({ business_id: ids.business, name: "Cash" }).select("id").single();
  if (methodError) throw methodError; ids.method = method.id;
  const { data: product, error: productError } = await admin.from("products").insert({ business_id: ids.business, name: "QA Product", cost_price: 4, sale_price: 10, stock_quantity: 5 }).select("id").single();
  if (productError) throw productError; ids.product = product.id;

  const client = createClient(url, publicKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error: signInError } = await client.auth.signInWithPassword({ email: `sales-${suffix}@example.invalid`, password });
  if (signInError) throw signInError;
  const { data: saleId, error: saleError } = await client.rpc("confirm_sale", { p_items: [{ product_id: ids.product, quantity: 2 }], p_payment_method_id: ids.method, p_discount: 1, p_note: "QA" });
  if (saleError) throw saleError; ids.sale = saleId;
  const { data: afterSale } = await admin.from("products").select("stock_quantity").eq("id", ids.product).single();
  if (afterSale.stock_quantity !== 3) throw new Error("Stock was not discounted.");

  const { error: overstockError } = await client.rpc("confirm_sale", { p_items: [{ product_id: ids.product, quantity: 99 }], p_payment_method_id: ids.method, p_discount: 0, p_note: "" });
  if (!overstockError) throw new Error("Overstock sale was accepted.");
  const { error: voidError } = await client.rpc("void_sale", { p_sale_id: ids.sale, p_reason: "QA cancellation" });
  if (voidError) throw voidError;
  const { data: afterVoid } = await admin.from("products").select("stock_quantity").eq("id", ids.product).single();
  if (afterVoid.stock_quantity !== 5) throw new Error("Stock was not restored.");
  const { error: secondVoidError } = await client.rpc("void_sale", { p_sale_id: ids.sale, p_reason: "Again" });
  if (!secondVoidError) throw new Error("Sale was voided twice.");
  console.log("Sales transaction check passed.");
} finally {
  if (ids.business) await admin.from("audit_logs").delete().eq("business_id", ids.business);
  if (ids.sale) { await admin.from("sale_items").delete().eq("sale_id", ids.sale); await admin.from("sales").delete().eq("id", ids.sale); }
  if (ids.product) await admin.from("products").delete().eq("id", ids.product);
  if (ids.method) await admin.from("payment_methods").delete().eq("id", ids.method);
  if (ids.user) { await admin.from("profiles").delete().eq("id", ids.user); await admin.auth.admin.deleteUser(ids.user); }
  if (ids.business) await admin.from("businesses").delete().eq("id", ids.business);
}
