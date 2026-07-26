import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publicKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !publicKey || !serviceKey) throw new Error("Supabase variables required.");
const service = createClient(url, serviceKey, { auth: { persistSession: false } });
const suffix = randomUUID();
const email = `maintenance-${suffix}@example.invalid`;
const password = `Maintenance!${randomUUID()}Aa1`;
const ids = {};

try {
  const { data: setting, error: settingError } = await service.from("platform_settings").select("maintenance_mode").eq("id", true).single();
  if (settingError) throw settingError;
  const anonymous = createClient(url, publicKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: publicState, error: publicError } = await anonymous.rpc("is_maintenance_mode");
  if (publicError) throw publicError;
  if (publicState !== setting.maintenance_mode) throw new Error("Public maintenance state does not match stored state.");

  const { data: business, error: businessError } = await service.from("businesses").insert({ name: `Maintenance QA ${suffix}` }).select("id").single();
  if (businessError) throw businessError;
  ids.business = business.id;
  const { data: authData, error: authError } = await service.auth.admin.createUser({ email, password, email_confirm: true });
  if (authError) throw authError;
  ids.user = authData.user.id;
  const { error: profileError } = await service.from("profiles").insert({ id: ids.user, business_id: ids.business, full_name: "Maintenance QA", role: "owner", status: "active" });
  if (profileError) throw profileError;

  const owner = createClient(url, publicKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error: loginError } = await owner.auth.signInWithPassword({ email, password });
  if (loginError) throw loginError;
  await owner.from("platform_settings").update({ maintenance_mode: !setting.maintenance_mode }).eq("id", true);
  const { data: unchanged } = await service.from("platform_settings").select("maintenance_mode").eq("id", true).single();
  if (unchanged.maintenance_mode !== setting.maintenance_mode) throw new Error("Maintenance mode changed during permission test.");
  console.log("Maintenance mode check passed.");
} finally {
  if (ids.user) {
    await service.from("profiles").delete().eq("id", ids.user);
    await service.auth.admin.deleteUser(ids.user);
  }
  if (ids.business) await service.from("businesses").delete().eq("id", ids.business);
}
