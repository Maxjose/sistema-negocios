import { ShieldCheck } from "lucide-react";

export default function AdminSettingsPage() {
  return (
    <div className="max-w-2xl">
      <p className="text-sm text-muted">Opciones de alcance global</p>
      <h2 className="mt-1 text-2xl font-bold tracking-tight">Configuración</h2>
      <section className="mt-7 rounded-2xl border bg-surface p-6">
        <div className="flex gap-4">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-accent text-brand">
            <ShieldCheck className="size-5" />
          </span>
          <div>
            <h3 className="font-bold">Administración protegida</h3>
            <p className="mt-2 text-sm leading-6 text-muted">
              Los datos de identidad, moneda, zona horaria y acceso se administran desde cada negocio. Solo el superadministrador puede modificar estas opciones.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
