import { AppShell } from "@/components/layout/app-shell";
import { requireRole } from "@/lib/auth/session";

export default async function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const profile = await requireRole("owner");

  return (
    <AppShell
      role="owner"
      title="Resumen del negocio"
      userName={profile.full_name}
    >
      {children}
    </AppShell>
  );
}
