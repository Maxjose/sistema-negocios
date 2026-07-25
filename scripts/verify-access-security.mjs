import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publicKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !publicKey || !serviceKey) throw new Error("Supabase variables required.");

const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
const suffix = randomUUID();
const email = `security-${suffix}@example.invalid`;
const password = `Initial!${randomUUID()}Aa1`;
const newPassword = `Changed!${randomUUID()}Bb2`;
const ids = {};

try {
  const { data: business, error: businessError } = await admin
    .from("businesses")
    .insert({ name: `Security QA ${suffix}` })
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
    full_name: "Security QA",
    role: "owner",
    status: "active",
    must_change_password: true,
  });
  if (profileError) throw profileError;

  const anonymous = createClient(url, publicKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error: anonymousError } = await anonymous.rpc("record_authenticated_login");
  if (!anonymousError) throw new Error("Anonymous login audit call was accepted.");

  const client = createClient(url, publicKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error: signInError } = await client.auth.signInWithPassword({ email, password });
  if (signInError) throw signInError;

  const { error: loginError } = await client.rpc("record_authenticated_login");
  if (loginError) throw loginError;

  const { data: afterLogin, error: afterLoginError } = await admin
    .from("profiles")
    .select("last_login_at, must_change_password")
    .eq("id", ids.user)
    .single();
  if (afterLoginError) throw afterLoginError;
  if (!afterLogin.last_login_at) throw new Error("Last login was not recorded.");
  if (!afterLogin.must_change_password) throw new Error("Password flag changed too early.");

  const { error: passwordError } = await client.auth.updateUser({ password: newPassword });
  if (passwordError) throw passwordError;
  const { error: completionError } = await client.rpc("complete_initial_password_change");
  if (completionError) throw completionError;

  const { data: afterChange, error: afterChangeError } = await admin
    .from("profiles")
    .select("must_change_password")
    .eq("id", ids.user)
    .single();
  if (afterChangeError) throw afterChangeError;
  if (afterChange.must_change_password) throw new Error("Password flag was not cleared.");

  const { data: logs, error: logsError } = await admin
    .from("audit_logs")
    .select("action")
    .eq("actor_user_id", ids.user);
  if (logsError) throw logsError;
  const actions = new Set(logs.map((entry) => entry.action));
  if (!actions.has("auth.login") || !actions.has("auth.initial_password_changed")) {
    throw new Error("Authentication audit entries are incomplete.");
  }

  await client.auth.signOut();
  const { error: newSignInError } = await client.auth.signInWithPassword({
    email,
    password: newPassword,
  });
  if (newSignInError) throw new Error("The changed password cannot authenticate.");

  console.log("Access security check passed.");
} finally {
  if (ids.business) await admin.from("audit_logs").delete().eq("business_id", ids.business);
  if (ids.user) {
    await admin.from("profiles").delete().eq("id", ids.user);
    await admin.auth.admin.deleteUser(ids.user);
  }
  if (ids.business) await admin.from("businesses").delete().eq("id", ids.business);
}
