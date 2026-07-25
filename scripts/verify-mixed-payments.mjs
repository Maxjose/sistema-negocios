import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publicKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !publicKey || !serviceKey) throw new Error("Supabase variables required.");

const service = createClient(url, serviceKey, { auth: { persistSession: false } });
const suffix = randomUUID();
const email = `payments-${suffix}@example.invalid`;
const password = `Payments!${randomUUID()}Aa1`;
const ids = { sales: [], methods: [] };

try {
  const { data: business, error: businessError } = await service.from("businesses").insert({ name: `Payments QA ${suffix}` }).select("id").single();
  if (businessError) throw businessError;
  ids.business = business.id;
  const { data: authData, error: authError } = await service.auth.admin.createUser({ email, password, email_confirm: true });
  if (authError) throw authError;
  ids.user = authData.user.id;
  const { error: profileError } = await service.from("profiles").insert({ id: ids.user, business_id: ids.business, full_name: "Payments QA", role: "owner", status: "active" });
  if (profileError) throw profileError;
  const { data: methods, error: methodsError } = await service.from("payment_methods").insert([
    { business_id: ids.business, name: "Efectivo" },
    { business_id: ids.business, name: "Transferencia" },
  ]).select("id, name");
  if (methodsError) throw methodsError;
  ids.methods = methods.map((method) => method.id);
  const { data: product, error: productError } = await service.from("products").insert({
    business_id: ids.business, name: "Producto pagos QA", cost_price: 4, sale_price: 10, stock_quantity: 10,
  }).select("id").single();
  if (productError) throw productError;
  ids.product = product.id;

  const client = createClient(url, publicKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error: signInError } = await client.auth.signInWithPassword({ email, password });
  if (signInError) throw signInError;
  const items = [{ product_id: ids.product, quantity: 2 }];

  const { data: simpleId, error: simpleError } = await client.rpc("confirm_sale_v2", {
    p_items: items, p_payments: [{ payment_method_id: ids.methods[0], amount: 20 }], p_discount: 0, p_note: "",
  });
  if (simpleError) throw simpleError;
  ids.sales.push(simpleId);

  const { data: mixedId, error: mixedError } = await client.rpc("confirm_sale_v2", {
    p_items: items,
    p_payments: [
      { payment_method_id: ids.methods[0], amount: 7 },
      { payment_method_id: ids.methods[1], amount: 13 },
    ],
    p_discount: 0,
    p_note: "",
  });
  if (mixedError) throw mixedError;
  ids.sales.push(mixedId);

  const { data: mixedSale, error: readError } = await service.from("sales")
    .select("payment_method_name, sale_payments(payment_method_name, amount)")
    .eq("id", mixedId).single();
  if (readError) throw readError;
  if (mixedSale.payment_method_name !== "Pago mixto" || mixedSale.sale_payments.length !== 2) {
    throw new Error("Mixed payment detail was not stored correctly.");
  }
  const totalPaid = mixedSale.sale_payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
  if (totalPaid !== 20) throw new Error("Mixed payment total is incorrect.");

  const { count: beforeInvalid } = await service.from("sales").select("*", { count: "exact", head: true }).eq("business_id", ids.business);
  const { error: mismatchError } = await client.rpc("confirm_sale_v2", {
    p_items: items, p_payments: [{ payment_method_id: ids.methods[0], amount: 19 }], p_discount: 0, p_note: "",
  });
  if (!mismatchError?.message.includes("PAYMENT_TOTAL_MISMATCH")) throw new Error("Invalid payment total was accepted.");
  const { count: afterInvalid } = await service.from("sales").select("*", { count: "exact", head: true }).eq("business_id", ids.business);
  if (beforeInvalid !== afterInvalid) throw new Error("Invalid sale was partially persisted.");

  console.log("Mixed payments check passed.");
} finally {
  if (ids.business) await service.from("audit_logs").delete().eq("business_id", ids.business);
  if (ids.sales.length) {
    await service.from("sale_payments").delete().in("sale_id", ids.sales);
    await service.from("sale_items").delete().in("sale_id", ids.sales);
    await service.from("sales").delete().in("id", ids.sales);
  }
  if (ids.product) await service.from("products").delete().eq("id", ids.product);
  if (ids.methods.length) await service.from("payment_methods").delete().in("id", ids.methods);
  if (ids.user) {
    await service.from("profiles").delete().eq("id", ids.user);
    await service.auth.admin.deleteUser(ids.user);
  }
  if (ids.business) await service.from("businesses").delete().eq("id", ids.business);
}
