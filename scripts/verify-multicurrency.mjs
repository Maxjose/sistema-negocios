import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publicKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !publicKey || !serviceKey) throw new Error("Missing Supabase environment variables.");

const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
const suffix = randomUUID();
const email = `currency-${suffix}@example.invalid`;
const password = `Currency!${randomUUID()}Aa1`;
const ids = {};

try {
  for (const table of ["exchange_rates", "business_currencies", "sale_exchange_rates"]) {
    const { error } = await admin.from(table).select("*", { head: true, count: "exact" });
    if (error) throw new Error(`${table}: ${error.message}`);
  }
  const { data: rates, error: ratesError } = await admin.from("exchange_rates").select("base_currency, quote_currency").eq("base_currency", "USD");
  if (ratesError) throw ratesError;
  for (const quote of ["VES", "COP"]) if (!rates?.some((rate) => rate.quote_currency === quote)) throw new Error(`Missing USD/${quote} rate row.`);

  const { data: business, error: businessError } = await admin.from("businesses").insert({ name: `Currency QA ${suffix}`, currency_code: "USD", enable_multicurrency: true, use_stock: false }).select("id").single();
  if (businessError) throw businessError;
  ids.business = business.id;
  const { data: defaults, error: defaultsError } = await admin.from("business_currencies").select("id, currency_code").eq("business_id", ids.business);
  if (defaultsError) throw defaultsError;
  if (defaults?.length !== 2) throw new Error("Default business currencies were not created.");
  const { error: configError } = await admin.from("business_currencies").update({ is_enabled: true, rate_mode: "manual", manual_rate: 750, rounding_increment: 1 }).eq("business_id", ids.business).eq("currency_code", "VES");
  if (configError) throw configError;

  const { data: authData, error: authError } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (authError) throw authError;
  ids.user = authData.user.id;
  const { error: profileError } = await admin.from("profiles").insert({ id: ids.user, business_id: ids.business, full_name: "Currency QA", role: "owner", status: "active", must_change_password: false });
  if (profileError) throw profileError;
  const { data: method, error: methodError } = await admin.from("payment_methods").insert({ business_id: ids.business, name: "Cash" }).select("id").single();
  if (methodError) throw methodError;
  ids.method = method.id;
  const { data: product, error: productError } = await admin.from("products").insert({ business_id: ids.business, name: "Currency Product", cost_price: 5, sale_price: 10, stock_quantity: 0 }).select("id").single();
  if (productError) throw productError;
  ids.product = product.id;

  const client = createClient(url, publicKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error: signInError } = await client.auth.signInWithPassword({ email, password });
  if (signInError) throw signInError;
  const { data: visibleSettings, error: settingsError } = await client.from("business_currencies").select("business_id, currency_code");
  if (settingsError) throw settingsError;
  if (visibleSettings.length !== 2 || visibleSettings.some((setting) => setting.business_id !== ids.business)) throw new Error("Business currency RLS isolation failed.");

  const { data: saleId, error: saleError } = await client.rpc("confirm_sale", { p_items: [{ product_id: ids.product, quantity: 2 }], p_payment_method_id: ids.method, p_discount: 0, p_note: "" });
  if (saleError) throw saleError;
  ids.sale = saleId;
  const { data: snapshot, error: snapshotError } = await client.from("sale_exchange_rates").select("base_currency, quote_currency, rate, rounding_increment, source").eq("sale_id", ids.sale).single();
  if (snapshotError) throw snapshotError;
  if (snapshot.base_currency !== "USD" || snapshot.quote_currency !== "VES" || Number(snapshot.rate) !== 750 || snapshot.source !== "MANUAL") throw new Error("Sale exchange-rate snapshot is incorrect.");

  console.log("Multicurrency schema, defaults, RLS, and sale snapshots verified.");
} finally {
  if (ids.business) await admin.from("audit_logs").delete().eq("business_id", ids.business);
  if (ids.sale) {
    await admin.from("sale_exchange_rates").delete().eq("sale_id", ids.sale);
    await admin.from("sale_items").delete().eq("sale_id", ids.sale);
    await admin.from("sales").delete().eq("id", ids.sale);
  }
  if (ids.product) await admin.from("products").delete().eq("id", ids.product);
  if (ids.method) await admin.from("payment_methods").delete().eq("id", ids.method);
  if (ids.user) {
    await admin.from("profiles").delete().eq("id", ids.user);
    await admin.auth.admin.deleteUser(ids.user);
  }
  if (ids.business) await admin.from("businesses").delete().eq("id", ids.business);
}
