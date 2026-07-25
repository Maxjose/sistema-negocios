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

export async function getAuditLogs(limit = 100): Promise<AuditLog[]> {
  await requireRole("super_admin");
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("audit_logs")
    .select(
      "id, action, entity_type, entity_id, created_at, business_id, actor_user_id, businesses(name), profiles(full_name)",
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(`Unable to load audit logs: ${error.message}`);
  return data as unknown as AuditLog[];
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
