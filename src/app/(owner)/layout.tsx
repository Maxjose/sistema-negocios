import { AppShell } from "@/components/layout/app-shell";
import { requireRole } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export default async function OwnerLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const profile = await requireRole("owner");
  if (profile.must_change_password) redirect("/change-password");

  return (
    <AppShell role="owner" title="Mi negocio" userName={profile.full_name}>
      {children}
    </AppShell>
  );
}
