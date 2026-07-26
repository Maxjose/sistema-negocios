import { AppShell } from "@/components/layout/app-shell";
import { requireRole } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { getBusinessAccent, getBusinessFeatures } from "@/features/catalog/data";

export default async function OwnerLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const profile = await requireRole("owner");
  if (profile.must_change_password) redirect("/change-password");
  if (profile.plan_expires_at && new Date(profile.plan_expires_at) <= new Date()) redirect("/plan-expired");
  const [accentTheme, features] = await Promise.all([getBusinessAccent(), getBusinessFeatures()]);

  return (
    <AppShell accentTheme={accentTheme} enableCredits={features.enable_credits} enableCustomers={features.enable_customers} planExpiresAt={profile.plan_expires_at} planTier={profile.plan_tier ?? "free"} role="owner" title={profile.business_name ?? "Mi negocio"} userName={profile.full_name}>
      {children}
    </AppShell>
  );
}
