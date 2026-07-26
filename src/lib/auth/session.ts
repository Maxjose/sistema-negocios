import { cache } from "react";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export type UserRole = "super_admin" | "owner";

export type CurrentProfile = {
  id: string;
  business_id: string | null;
  full_name: string;
  role: UserRole;
  status: "active" | "inactive";
  must_change_password: boolean;
  plan_tier: "free" | "basic" | "premium" | "unlimited" | null;
  plan_expires_at: string | null;
  business_name: string | null;
  maintenance_mode: boolean;
};

export const getCurrentProfile = cache(async (): Promise<CurrentProfile | null> => {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;

  if (!userId) {
    return null;
  }

  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id, business_id, full_name, role, status, must_change_password, businesses(name, status, plan_tier, plan_expires_at)",
    )
    .eq("id", userId)
    .single();

  const business = Array.isArray(data?.businesses)
    ? data.businesses[0]
    : data?.businesses;
  const businessIsAllowed =
    data?.role === "super_admin" || business?.status === "active";

  if (error || !data || data.status !== "active" || !businessIsAllowed) {
    return null;
  }
  const { data: maintenanceMode, error: maintenanceError } = await supabase.rpc("is_maintenance_mode");
  if (maintenanceError) return null;

  return {
    ...data,
    plan_tier: data.role === "owner" ? business?.plan_tier ?? "free" : null,
    plan_expires_at: data.role === "owner" ? business?.plan_expires_at ?? null : null,
    business_name: data.role === "owner" ? business?.name ?? "Mi negocio" : null,
    maintenance_mode: Boolean(maintenanceMode),
  } as unknown as CurrentProfile;
});

export async function requireProfile() {
  const profile = await getCurrentProfile();

  if (!profile) {
    redirect("/login");
  }

  return profile;
}

export async function requireRole(role: UserRole) {
  const profile = await requireProfile();

  if (profile.role !== role) {
    redirect(profile.role === "super_admin" ? "/admin" : "/dashboard");
  }
  if (role === "owner" && profile.plan_expires_at && new Date(profile.plan_expires_at) <= new Date()) {
    redirect("/plan-expired");
  }
  if (role === "owner" && profile.maintenance_mode) redirect("/maintenance");

  return profile;
}
