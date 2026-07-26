import { Clock3 } from "lucide-react";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { logout } from "@/features/auth/actions";
import { getCurrentProfile } from "@/lib/auth/session";

export default async function PlanExpiredPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (profile.role === "super_admin") redirect("/admin");
  if (!profile.plan_expires_at || new Date(profile.plan_expires_at) > new Date()) redirect("/dashboard");
  return <main className="grid min-h-screen place-items-center bg-background p-4 text-foreground"><section className="w-full max-w-md rounded-3xl border bg-surface p-7 text-center shadow-xl sm:p-9"><div className="mx-auto grid size-14 place-items-center rounded-2xl bg-accent text-brand"><Clock3 className="size-7" /></div><p className="mt-6 text-sm font-semibold text-brand">Suscripción vencida</p><h1 className="mt-2 text-2xl font-bold">El plan del negocio ha finalizado</h1><p className="mt-3 text-sm leading-6 text-muted">Contacta al administrador para renovar o cambiar el plan. Tus datos permanecen guardados.</p><form action={logout} className="mt-7"><Button className="w-full" type="submit">Cerrar sesión</Button></form></section></main>;
}
