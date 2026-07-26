import { ShieldCheck, Wrench } from "lucide-react";
import { getPlatformSettings } from "@/features/admin/data";
import { MaintenanceForm } from "@/features/admin/maintenance-form";

export default async function AdminSettingsPage() {
  const settings = await getPlatformSettings();
  return <div className="max-w-2xl"><p className="text-sm text-muted">Opciones de alcance global</p><h2 className="mt-1 text-2xl font-bold tracking-tight">Configuración</h2>
    <section className="mt-7 rounded-2xl border bg-surface p-6"><div className="flex gap-4"><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-accent text-brand"><Wrench className="size-5" /></span><div><h3 className="font-bold">Mantenimiento</h3><p className="mt-2 text-sm leading-6 text-muted">Controla temporalmente el acceso general a la plataforma.</p></div></div><MaintenanceForm enabled={settings.maintenance_mode} /></section>
    <section className="mt-6 rounded-2xl border bg-surface p-6"><div className="flex gap-4"><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-accent text-brand"><ShieldCheck className="size-5" /></span><div><h3 className="font-bold">Administración protegida</h3><p className="mt-2 text-sm leading-6 text-muted">Solo el superadministrador puede modificar estas opciones globales.</p></div></div></section>
  </div>;
}
