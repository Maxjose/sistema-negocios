import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publicKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !publicKey || !serviceKey) throw new Error("Supabase variables required.");

const service = createClient(url, serviceKey, { auth: { persistSession: false } });
const suffix = randomUUID();
const email = `accent-${suffix}@example.invalid`;
const password = `Accent!${randomUUID()}Aa1`;
const ids = {};

try {
  const { data: business, error: businessError } = await service.from("businesses").insert({ name: `Accent QA ${suffix}` }).select("id").single();
  if (businessError) throw businessError;
  ids.business = business.id;
  const { data: authData, error: authError } = await service.auth.admin.createUser({ email, password, email_confirm: true });
  if (authError) throw authError;
  ids.user = authData.user.id;
  const { error: profileError } = await service.from("profiles").insert({ id: ids.user, business_id: ids.business, full_name: "Accent QA", role: "owner", status: "active" });
  if (profileError) throw profileError;

  const client = createClient(url, publicKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error: signInError } = await client.auth.signInWithPassword({ email, password });
  if (signInError) throw signInError;
  const { error: updateError } = await client.rpc("set_business_accent", { p_accent_theme: "violet" });
  if (updateError) throw updateError;
  const { data: saved, error: readError } = await service.from("businesses").select("accent_theme").eq("id", ids.business).single();
  if (readError) throw readError;
  if (saved.accent_theme !== "violet") throw new Error("Accent theme was not persisted.");

  const { error: invalidError } = await client.rpc("set_business_accent", { p_accent_theme: "invalid" });
  if (!invalidError?.message.includes("INVALID_ACCENT_THEME")) throw new Error("Invalid accent theme was accepted.");
  const { count: auditCount, error: auditError } = await service.from("audit_logs").select("*", { count: "exact", head: true }).eq("business_id", ids.business).eq("action", "business.accent_changed");
  if (auditError) throw auditError;
  if (auditCount !== 1) throw new Error("Accent change was not audited.");
  console.log("Accent theme check passed.");
} finally {
  if (ids.business) await service.from("audit_logs").delete().eq("business_id", ids.business);
  if (ids.user) {
    await service.from("profiles").delete().eq("id", ids.user);
    await service.auth.admin.deleteUser(ids.user);
  }
  if (ids.business) await service.from("businesses").delete().eq("id", ids.business);
}
