import { AppShell } from "@/components/layout/app-shell";
import { requireRole } from "@/lib/auth/session";

export default async function OwnerLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const profile = await requireRole("owner");

  return (
    <AppShell role="owner" title="Mi negocio" userName={profile.full_name}>
      {children}
    </AppShell>
  );
}
