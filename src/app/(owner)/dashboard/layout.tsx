import { AppShell } from "@/components/layout/app-shell";

export default function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <AppShell role="owner" title="Resumen del negocio">
      {children}
    </AppShell>
  );
}
