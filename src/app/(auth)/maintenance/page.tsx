import { Wrench } from "lucide-react";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { logout } from "@/features/auth/actions";
import { getCurrentProfile } from "@/lib/auth/session";

export default async function MaintenancePage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (profile.role === "super_admin") redirect("/admin");
  if (!profile.maintenance_mode) redirect("/dashboard");
  return <main className="grid min-h-screen place-items-center bg-background p-4 text-foreground"><section className="w-full max-w-md rounded-3xl border bg-surface p-7 text-center shadow-xl sm:p-9"><div className="mx-auto grid size-14 place-items-center rounded-2xl bg-accent text-brand"><Wrench className="size-7" /></div><p className="mt-6 text-sm font-semibold text-brand">Mantenimiento programado</p><h1 className="mt-2 text-2xl font-bold">Volveremos pronto</h1><p className="mt-3 text-sm leading-6 text-muted">Estamos realizando mejoras en el sistema. Intenta ingresar nuevamente más tarde.</p><form action={logout} className="mt-7"><Button className="w-full" type="submit">Volver al inicio de sesión</Button></form></section></main>;
}
