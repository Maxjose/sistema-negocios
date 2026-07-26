import { AppShell } from "@/components/layout/app-shell";
import { requireRole } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { getBusinessAccent } from "@/features/catalog/data";

export default async function OwnerLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const profile = await requireRole("owner");
  if (profile.must_change_password) redirect("/change-password");
  const accentTheme = await getBusinessAccent();

  return (
    <AppShell accentTheme={accentTheme} role="owner" title="Mi negocio" userName={profile.full_name}>
      {children}
    </AppShell>
  );
}
