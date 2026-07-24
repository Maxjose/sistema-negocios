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
      "id, business_id, full_name, role, status, must_change_password",
    )
    .eq("id", userId)
    .single();

  if (error || !data || data.status !== "active") {
    return null;
  }

  return data as CurrentProfile;
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

  return profile;
}
