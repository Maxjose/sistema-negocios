import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publicKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !publicKey || !serviceKey) throw new Error("Supabase variables required.");

const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
const suffix = randomUUID();
const email = `features-${suffix}@example.invalid`;
const password = `Features!${randomUUID()}Aa1`;
const changedPassword = `Changed!${randomUUID()}Bb2`;
const ids = {};

try {
  const { data: business, error: businessError } = await admin
    .from("businesses")
    .insert({
      name: `Features QA ${suffix}`,
      use_stock: false,
      allow_discounts: false,
      allow_sale_notes: false,
    })
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
    full_name: "Features QA",
    role: "owner",
    status: "active",
    must_change_password: false,
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
      name: "Unlimited Product",
      cost_price: 2,
      sale_price: 5,
      stock_quantity: 0,
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

  const saleInput = {
    p_items: [{ product_id: ids.product, quantity: 3 }],
    p_payment_method_id: ids.method,
    p_discount: 0,
    p_note: "",
  };
  const { data: saleId, error: saleError } = await client.rpc("confirm_sale", saleInput);
  if (saleError) throw saleError;
  ids.sale = saleId;

  const { data: sale, error: saleReadError } = await admin
    .from("sales")
    .select("stock_applied")
    .eq("id", ids.sale)
    .single();
  if (saleReadError) throw saleReadError;
  if (sale.stock_applied) throw new Error("Stock was applied while disabled.");

  const { data: stockAfterSale } = await admin
    .from("products")
    .select("stock_quantity")
    .eq("id", ids.product)
    .single();
  if (stockAfterSale.stock_quantity !== 0) throw new Error("Stock changed while disabled.");

  const { error: discountError } = await client.rpc("confirm_sale", {
    ...saleInput,
    p_discount: 1,
  });
  if (!discountError?.message.includes("DISCOUNTS_DISABLED")) {
    throw new Error("Disabled discount was accepted.");
  }

  const { error: noteError } = await client.rpc("confirm_sale", {
    ...saleInput,
    p_note: "Not allowed",
  });
  if (!noteError?.message.includes("SALE_NOTES_DISABLED")) {
    throw new Error("Disabled sale note was accepted.");
  }

  const { error: voidError } = await client.rpc("void_sale", {
    p_sale_id: ids.sale,
    p_reason: "Feature QA",
  });
  if (voidError) throw voidError;
  const { data: stockAfterVoid } = await admin
    .from("products")
    .select("stock_quantity")
    .eq("id", ids.product)
    .single();
  if (stockAfterVoid.stock_quantity !== 0) throw new Error("Void changed non-stock sale.");

  const { error: enableStockError } = await admin
    .from("businesses")
    .update({ use_stock: true })
    .eq("id", ids.business);
  if (enableStockError) throw enableStockError;
  const { error: stockError } = await client.rpc("confirm_sale", saleInput);
  if (!stockError?.message.includes("INSUFFICIENT_STOCK")) {
    throw new Error("Stock-enabled sale ignored availability.");
  }

  const { error: passwordError } = await client.auth.updateUser({
    password: changedPassword,
  });
  if (passwordError) throw passwordError;
  const { error: passwordAuditError } = await client.rpc("record_password_change");
  if (passwordAuditError) throw passwordAuditError;
  const { count: passwordLogCount, error: passwordLogError } = await admin
    .from("audit_logs")
    .select("*", { count: "exact", head: true })
    .eq("actor_user_id", ids.user)
    .eq("action", "auth.password_changed");
  if (passwordLogError) throw passwordLogError;
  if (passwordLogCount !== 1) throw new Error("Password change was not audited.");

  console.log("Business features check passed.");
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
