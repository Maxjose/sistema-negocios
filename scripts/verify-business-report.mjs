import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publicKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !publicKey || !serviceKey) throw new Error("Supabase variables required.");

const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
const suffix = randomUUID();
const email = `report-${suffix}@example.invalid`;
const password = `Report!${randomUUID()}Aa1`;
const today = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Caracas",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).format(new Date());
const ids = {};

try {
  const { data: business, error: businessError } = await admin
    .from("businesses")
    .insert({ name: `Report QA ${suffix}`, currency_code: "USD", timezone: "America/Caracas" })
    .select("id")
    .single();
  if (businessError) throw businessError;
  ids.business = business.id;

  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (authError) throw authError;
  ids.user = authData.user.id;

  const { error: profileError } = await admin.from("profiles").insert({
    id: ids.user,
    business_id: ids.business,
    full_name: "Report QA",
    role: "owner",
    status: "active",
  });
  if (profileError) throw profileError;

  const { data: method, error: methodError } = await admin
    .from("payment_methods")
    .insert({ business_id: ids.business, name: "Cash" })
    .select("id")
    .single();
  if (methodError) throw methodError;
  ids.method = method.id;

  const { data: product, error: productError } = await admin
    .from("products")
    .insert({
      business_id: ids.business,
      name: "Report Product",
      cost_price: 4,
      sale_price: 10,
      stock_quantity: 5,
      low_stock_threshold: 3,
    })
    .select("id")
    .single();
  if (productError) throw productError;
  ids.product = product.id;

  const client = createClient(url, publicKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error: signInError } = await client.auth.signInWithPassword({ email, password });
  if (signInError) throw signInError;

  const { data: saleId, error: saleError } = await client.rpc("confirm_sale", {
    p_items: [{ product_id: ids.product, quantity: 2 }],
    p_payment_method_id: ids.method,
    p_discount: 1,
    p_note: "Report QA",
  });
  if (saleError) throw saleError;
  ids.sale = saleId;

  const { data: report, error: reportError } = await client.rpc("business_report", {
    p_from: today,
    p_to: today,
  });
  if (reportError) throw reportError;
  if (Number(report.summary.total_sales) !== 19) throw new Error("Incorrect total sales.");
  if (Number(report.summary.total_cost) !== 8) throw new Error("Incorrect total cost.");
  if (Number(report.summary.gross_profit) !== 11) throw new Error("Incorrect gross profit.");
  if (Number(report.summary.sale_count) !== 1) throw new Error("Incorrect sale count.");
  if (Number(report.summary.units_sold) !== 2) throw new Error("Incorrect units sold.");
  if (Number(report.inventory.low_stock) !== 1) throw new Error("Incorrect low-stock count.");
  if (report.top_products?.[0]?.product_name !== "Report Product") throw new Error("Incorrect product ranking.");

  const { error: voidError } = await client.rpc("void_sale", {
    p_sale_id: ids.sale,
    p_reason: "Report QA cancellation",
  });
  if (voidError) throw voidError;

  const { data: voidedReport, error: voidedReportError } = await client.rpc("business_report", {
    p_from: today,
    p_to: today,
  });
  if (voidedReportError) throw voidedReportError;
  if (Number(voidedReport.summary.sale_count) !== 0 || Number(voidedReport.summary.total_sales) !== 0) {
    throw new Error("Voided sale is still included in the report.");
  }

  console.log("Business report check passed.");
} finally {
  if (ids.business) await admin.from("audit_logs").delete().eq("business_id", ids.business);
  if (ids.sale) {
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
