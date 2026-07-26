import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publicKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !publicKey || !serviceKey) throw new Error("Supabase variables required.");

const service = createClient(url, serviceKey, { auth: { persistSession: false } });
const suffix = randomUUID();
const email = `receivables-${suffix}@example.invalid`;
const password = `Receivables!${randomUUID()}Aa1`;
const ids = {};

try {
  const { data: business, error: businessError } = await service.from("businesses").insert({
    name: `Receivables QA ${suffix}`, use_stock: true,
    enable_customers: false, enable_credits: false, enable_stock_adjustments: false,
  }).select("id").single();
  if (businessError) throw businessError;
  ids.business = business.id;
  const { data: authData, error: authError } = await service.auth.admin.createUser({ email, password, email_confirm: true });
  if (authError) throw authError;
  ids.user = authData.user.id;
  const { error: profileError } = await service.from("profiles").insert({
    id: ids.user, business_id: ids.business, full_name: "Receivables QA", role: "owner", status: "active",
  });
  if (profileError) throw profileError;
  const { data: method, error: methodError } = await service.from("payment_methods").insert({
    business_id: ids.business, name: "Efectivo",
  }).select("id").single();
  if (methodError) throw methodError;
  ids.method = method.id;
  const { data: product, error: productError } = await service.from("products").insert({
    business_id: ids.business, name: "Producto crédito QA", cost_price: 4, sale_price: 10, stock_quantity: 10,
  }).select("id").single();
  if (productError) throw productError;
  ids.product = product.id;

  const client = createClient(url, publicKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error: signInError } = await client.auth.signInWithPassword({ email, password });
  if (signInError) throw signInError;
  const { error: disabledAdjustment } = await client.rpc("adjust_product_stock", {
    p_product_id: ids.product, p_new_quantity: 12, p_reason: "Prueba desactivada",
  });
  if (!disabledAdjustment?.message.includes("STOCK_ADJUSTMENTS_DISABLED")) throw new Error("Disabled stock adjustments were accepted.");

  const { error: enableError } = await service.from("businesses").update({
    enable_customers: true, enable_credits: true, enable_stock_adjustments: true,
  }).eq("id", ids.business);
  if (enableError) throw enableError;
  const { data: customer, error: customerError } = await client.from("customers").insert({
    business_id: ids.business, name: "Cliente QA", phone: "0000",
  }).select("id").single();
  if (customerError) throw customerError;
  ids.customer = customer.id;

  const cashItems = [{ product_id: ids.product, quantity: 1 }];
  const { data: cashSaleId, error: cashSaleError } = await client.rpc("confirm_sale_v3", {
    p_items: cashItems,
    p_payments: [{ payment_method_id: ids.method, amount: 10 }],
    p_customer_id: ids.customer,
    p_discount: 0,
    p_note: "",
  });
  if (cashSaleError) throw cashSaleError;
  ids.cashSale = cashSaleId;
  const { data: cashSale, error: cashSaleReadError } = await service.from("sales")
    .select("customer_id, customer_name").eq("id", cashSaleId).single();
  if (cashSaleReadError) throw cashSaleReadError;
  if (cashSale.customer_id !== ids.customer || cashSale.customer_name !== "Cliente QA") {
    throw new Error("Cash sale did not preserve the selected customer.");
  }

  const { data: adjustmentId, error: adjustmentError } = await client.rpc("adjust_product_stock", {
    p_product_id: ids.product, p_new_quantity: 12, p_reason: "Reposición QA",
  });
  if (adjustmentError) throw adjustmentError;
  ids.adjustment = adjustmentId;
  const { data: adjustedProduct } = await service.from("products").select("stock_quantity").eq("id", ids.product).single();
  if (adjustedProduct.stock_quantity !== 12) throw new Error("Stock adjustment did not update the product.");

  const dueDate = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
  const { data: saleId, error: saleError } = await client.rpc("confirm_credit_sale", {
    p_items: [{ product_id: ids.product, quantity: 2 }],
    p_customer_id: ids.customer, p_due_date: dueDate, p_discount: 0, p_note: "",
  });
  if (saleError) throw saleError;
  ids.sale = saleId;
  const { data: receivable, error: receivableError } = await service.from("receivables")
    .select("id, original_amount, balance, status").eq("sale_id", saleId).single();
  if (receivableError) throw receivableError;
  ids.receivable = receivable.id;
  if (Number(receivable.balance) !== 20 || receivable.status !== "open") throw new Error("Credit sale did not create the expected receivable.");

  const { error: paymentError } = await client.rpc("record_receivable_payment", {
    p_receivable_id: ids.receivable, p_amount: 7, p_payment_method_id: ids.method, p_note: "Abono QA",
  });
  if (paymentError) throw paymentError;
  const { data: afterPayment } = await service.from("receivables").select("balance, status").eq("id", ids.receivable).single();
  if (Number(afterPayment.balance) !== 13 || afterPayment.status !== "open") throw new Error("Partial payment was not applied.");
  const { error: overpaymentError } = await client.rpc("record_receivable_payment", {
    p_receivable_id: ids.receivable, p_amount: 14, p_payment_method_id: ids.method, p_note: "",
  });
  if (!overpaymentError?.message.includes("INVALID_PAYMENT_AMOUNT")) throw new Error("Overpayment was accepted.");

  const { error: voidError } = await client.rpc("void_sale", { p_sale_id: ids.sale, p_reason: "Anulación QA" });
  if (voidError) throw voidError;
  const { data: cancelled } = await service.from("receivables").select("balance, status").eq("id", ids.receivable).single();
  if (Number(cancelled.balance) !== 0 || cancelled.status !== "cancelled") throw new Error("Voided sale did not cancel its receivable.");
  const { data: restoredProduct } = await service.from("products").select("stock_quantity").eq("id", ids.product).single();
  if (restoredProduct.stock_quantity !== 12) throw new Error("Voided credit sale did not restore stock.");

  console.log("Customers, receivables, credit sales and stock adjustments check passed.");
} finally {
  if (ids.business) await service.from("audit_logs").delete().eq("business_id", ids.business);
  if (ids.receivable) await service.from("receivable_payments").delete().eq("receivable_id", ids.receivable);
  if (ids.business) await service.from("receivables").delete().eq("business_id", ids.business);
  if (ids.sale || ids.cashSale) {
    const saleIds = [ids.sale, ids.cashSale].filter(Boolean);
    await service.from("sale_payments").delete().in("sale_id", saleIds);
    await service.from("sale_items").delete().in("sale_id", saleIds);
    await service.from("sales").delete().in("id", saleIds);
  }
  if (ids.business) await service.from("inventory_adjustments").delete().eq("business_id", ids.business);
  if (ids.product) await service.from("products").delete().eq("id", ids.product);
  if (ids.customer) await service.from("customers").delete().eq("id", ids.customer);
  if (ids.method) await service.from("payment_methods").delete().eq("id", ids.method);
  if (ids.user) {
    await service.from("profiles").delete().eq("id", ids.user);
    await service.auth.admin.deleteUser(ids.user);
  }
  if (ids.business) await service.from("businesses").delete().eq("id", ids.business);
}
