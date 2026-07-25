import { AppShell } from "@/components/layout/app-shell";
import { requireRole } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const profile = await requireRole("super_admin");
  if (profile.must_change_password) redirect("/change-password");

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
