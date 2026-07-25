import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publicKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !publicKey || !serviceKey) throw new Error("Supabase variables required.");

const service = createClient(url, serviceKey, { auth: { persistSession: false } });
const suffix = randomUUID();
const ownerEmail = `session-owner-${suffix}@example.invalid`;
const adminEmail = `session-admin-${suffix}@example.invalid`;
const password = `Sessions!${randomUUID()}Aa1`;
const ids = {};

const authClient = () =>
  createClient(url, publicKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

try {
  const { data: business, error: businessError } = await service
    .from("businesses")
    .insert({ name: `Session QA ${suffix}` })
    .select("id")
    .single();
  if (businessError) throw businessError;
  ids.business = business.id;

  const { data: ownerAuth, error: ownerAuthError } = await service.auth.admin.createUser({
    email: ownerEmail,
    password,
    email_confirm: true,
  });
  if (ownerAuthError) throw ownerAuthError;
  ids.owner = ownerAuth.user.id;

  const { error: ownerProfileError } = await service.from("profiles").insert({
    id: ids.owner,
    business_id: ids.business,
    full_name: "Session QA Owner",
    role: "owner",
    status: "active",
    must_change_password: false,
  });
  if (ownerProfileError) throw ownerProfileError;

  const { data: adminAuth, error: adminAuthError } = await service.auth.admin.createUser({
    email: adminEmail,
    password,
    email_confirm: true,
  });
  if (adminAuthError) throw adminAuthError;
  ids.admin = adminAuth.user.id;

  const { error: adminProfileError } = await service.from("profiles").insert({
    id: ids.admin,
    business_id: null,
    full_name: "Session QA Admin",
    role: "super_admin",
    status: "active",
    must_change_password: false,
  });
  if (adminProfileError) throw adminProfileError;

  const owner = authClient();
  const { data: ownerSignIn, error: ownerSignInError } = await owner.auth.signInWithPassword({
    email: ownerEmail,
    password,
  });
  if (ownerSignInError) throw ownerSignInError;
  if (!ownerSignIn.session?.refresh_token) throw new Error("Owner session has no refresh token.");

  const unauthorizedOwner = authClient();
  const { error: secondOwnerSignInError } = await unauthorizedOwner.auth.signInWithPassword({
    email: ownerEmail,
    password,
  });
  if (secondOwnerSignInError) throw secondOwnerSignInError;
  const { error: unauthorizedError } = await unauthorizedOwner.rpc("revoke_owner_sessions", {
    p_user_id: ids.owner,
  });
  if (!unauthorizedError?.message.includes("UNAUTHORIZED")) {
    throw new Error("An owner was able to revoke sessions.");
  }

  const superAdmin = authClient();
  const { error: adminSignInError } = await superAdmin.auth.signInWithPassword({
    email: adminEmail,
    password,
  });
  if (adminSignInError) throw adminSignInError;

  const { error: revokeError } = await superAdmin.rpc("revoke_owner_sessions", {
    p_user_id: ids.owner,
  });
  if (revokeError) throw revokeError;

  const { data: refreshData, error: refreshError } = await owner.auth.refreshSession();
  if (!refreshError && refreshData.session) {
    throw new Error("The revoked owner session could still be refreshed.");
  }

  const { count: auditCount, error: auditError } = await service
    .from("audit_logs")
    .select("*", { count: "exact", head: true })
    .eq("actor_user_id", ids.admin)
    .eq("entity_id", ids.owner)
    .eq("action", "owner.sessions_revoked");
  if (auditError) throw auditError;
  if (auditCount !== 1) throw new Error("Session revocation was not audited exactly once.");

  console.log("Session revocation check passed.");
} finally {
  if (ids.business) await service.from("audit_logs").delete().eq("business_id", ids.business);
  if (ids.owner || ids.admin) {
    const userIds = [ids.owner, ids.admin].filter(Boolean);
    await service.from("profiles").delete().in("id", userIds);
  }
  if (ids.owner) await service.auth.admin.deleteUser(ids.owner);
  if (ids.admin) await service.auth.admin.deleteUser(ids.admin);
  if (ids.business) await service.from("businesses").delete().eq("id", ids.business);
}
