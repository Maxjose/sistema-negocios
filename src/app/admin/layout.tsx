import { AppShell } from "@/components/layout/app-shell";
import { requireRole } from "@/lib/auth/session";

export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const profile = await requireRole("super_admin");

  return (
    <AppShell
      role="admin"
      title="Administración"
      userName={profile.full_name}
    >
      {children}
    </AppShell>
  );
}
