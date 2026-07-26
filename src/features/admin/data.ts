import "server-only";

import { requireRole } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import type {
  AuditLog,
  Business,
  OwnerProfile,
} from "@/features/admin/types";

export async function getBusinesses(): Promise<Business[]> {
  await requireRole("super_admin");
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("businesses")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Unable to load businesses: ${error.message}`);
  return data as Business[];
}

export async function getBusiness(id: string): Promise<Business | null> {
  await requireRole("super_admin");
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("businesses")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(`Unable to load business: ${error.message}`);
  return data as Business | null;
}

export async function getOwners(): Promise<OwnerProfile[]> {
  await requireRole("super_admin");
  const admin = createAdminClient();
  const [{ data: profiles, error }, { data: authData, error: authError }] =
    await Promise.all([
      admin
        .from("profiles")
        .select(
          "id, business_id, full_name, role, status, must_change_password, last_login_at, created_at, businesses(name)",
        )
        .eq("role", "owner")
        .order("created_at", { ascending: false }),
      admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    ]);

  if (error) throw new Error(`Unable to load owners: ${error.message}`);
  if (authError) throw new Error(`Unable to load Auth users: ${authError.message}`);

  const emails = new Map(
    authData.users.map((user) => [user.id, user.email ?? "Sin correo"]),
  );

  return (profiles ?? []).map((profile) => {
    const business = Array.isArray(profile.businesses)
      ? profile.businesses[0]
      : profile.businesses;

    return {
      ...profile,
      role: "owner",
      email: emails.get(profile.id) ?? "Sin correo",
      business_name: business?.name ?? "Sin negocio",
    } as OwnerProfile;
  });
}

export async function getOwner(id: string): Promise<OwnerProfile | null> {
  const owners = await getOwners();
  return owners.find((owner) => owner.id === id) ?? null;
}

export type AuditFilters = {
  businessId?: string;
  actorId?: string;
  action?: string;
  from?: string;
  to?: string;
};

export async function getAuditLogs(
  limit = 100,
  filters: AuditFilters = {},
): Promise<AuditLog[]> {
  await requireRole("super_admin");
  const admin = createAdminClient();
  let query = admin
    .from("audit_logs")
    .select(
      "id, action, entity_type, entity_id, created_at, business_id, actor_user_id, businesses(name), profiles(full_name)",
    )
    .order("created_at", { ascending: false })
    .limit(limit);
  if (filters.businessId) query = query.eq("business_id", filters.businessId);
  if (filters.actorId) query = query.eq("actor_user_id", filters.actorId);
  if (filters.action) query = query.eq("action", filters.action);
  if (filters.from) query = query.gte("created_at", `${filters.from}T00:00:00`);
  if (filters.to) {
    const until = new Date(`${filters.to}T00:00:00Z`);
    until.setUTCDate(until.getUTCDate() + 1);
    query = query.lt("created_at", until.toISOString());
  }
  const { data, error } = await query;

  if (error) throw new Error(`Unable to load audit logs: ${error.message}`);
  return data as unknown as AuditLog[];
}

export async function getAuditLogPage(
  page: number,
  pageSize: number,
  filters: AuditFilters = {},
): Promise<{ entries: AuditLog[]; total: number }> {
  await requireRole("super_admin");
  const admin = createAdminClient();
  const fromRow = (page - 1) * pageSize;
  let query = admin
    .from("audit_logs")
    .select(
      "id, action, entity_type, entity_id, created_at, business_id, actor_user_id, businesses(name), profiles(full_name)",
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range(fromRow, fromRow + pageSize - 1);
  if (filters.businessId) query = query.eq("business_id", filters.businessId);
  if (filters.actorId) query = query.eq("actor_user_id", filters.actorId);
  if (filters.action) query = query.eq("action", filters.action);
  if (filters.from) query = query.gte("created_at", `${filters.from}T00:00:00`);
  if (filters.to) {
    const until = new Date(`${filters.to}T00:00:00Z`);
    until.setUTCDate(until.getUTCDate() + 1);
    query = query.lt("created_at", until.toISOString());
  }
  const { data, count, error } = await query;
  if (error) throw new Error(`Unable to load audit log page: ${error.message}`);
  return { entries: data as unknown as AuditLog[], total: count ?? 0 };
}

export async function getAuditActors() {
  await requireRole("super_admin");
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .select("id, full_name")
    .order("full_name");
  if (error) throw new Error(`Unable to load audit actors: ${error.message}`);
  return data ?? [];
}

export async function getAdminStats() {
  await requireRole("super_admin");
  const admin = createAdminClient();
  const [
    { count: businessCount },
    { count: activeBusinessCount },
    { count: ownerCount },
    { count: activeOwnerCount },
  ] = await Promise.all([
    admin.from("businesses").select("*", { count: "exact", head: true }),
    admin
      .from("businesses")
      .select("*", { count: "exact", head: true })
      .eq("status", "active"),
    admin
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("role", "owner"),
    admin
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("role", "owner")
      .eq("status", "active"),
  ]);

  return {
    businessCount: businessCount ?? 0,
    activeBusinessCount: activeBusinessCount ?? 0,
    ownerCount: ownerCount ?? 0,
    activeOwnerCount: activeOwnerCount ?? 0,
  };
}

export async function getAdminAlerts() {
  await requireRole("super_admin");
  const admin = createAdminClient();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const [{ count: inactiveBusinesses }, { count: pendingPasswordChange }, { count: ownersWithoutRecentAccess }] = await Promise.all([
    admin.from("businesses").select("*", { count: "exact", head: true }).eq("status", "inactive"),
    admin.from("profiles").select("*", { count: "exact", head: true }).eq("role", "owner").eq("must_change_password", true),
    admin.from("profiles").select("*", { count: "exact", head: true }).eq("role", "owner").or(`last_login_at.is.null,last_login_at.lt.${thirtyDaysAgo.toISOString()}`),
  ]);
  return {
    inactiveBusinesses: inactiveBusinesses ?? 0,
    pendingPasswordChange: pendingPasswordChange ?? 0,
    ownersWithoutRecentAccess: ownersWithoutRecentAccess ?? 0,
  };
}

export async function getPlatformSettings() {
  await requireRole("super_admin");
  const admin = createAdminClient();
  const { data, error } = await admin.from("platform_settings").select("maintenance_mode, updated_at").eq("id", true).single();
  if (error) throw new Error(`Unable to load platform settings: ${error.message}`);
  return data;
}
