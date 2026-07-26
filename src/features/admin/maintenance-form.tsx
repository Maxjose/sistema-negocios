"use client";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { updateMaintenanceMode, type AdminActionState } from "@/features/admin/actions";

export function MaintenanceForm({ enabled }: { enabled: boolean }) {
  const [state, action, pending] = useActionState<AdminActionState, FormData>(updateMaintenanceMode, {});
  return <form action={action} className="mt-5">
    <label className="flex cursor-pointer items-start justify-between gap-5 rounded-2xl border bg-background p-5">
      <span><span className="block font-semibold">Sitio en mantenimiento</span><span className="mt-1 block text-sm leading-6 text-muted">Impide el acceso de propietarios. El superadministrador podrá seguir entrando y usando el panel.</span></span>
      <span className="relative mt-1 inline-flex shrink-0"><input className="peer sr-only" defaultChecked={enabled} name="maintenance_mode" role="switch" type="checkbox" /><span className="h-7 w-12 rounded-full bg-slate-300 transition-colors peer-checked:bg-brand" /><span className="pointer-events-none absolute left-1 top-1 size-5 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-5" /></span>
    </label>
    {state.error && <p className="mt-4 text-sm text-red-700">{state.error}</p>}{state.success && <p className="mt-4 text-sm text-brand">{state.success}</p>}
    <div className="mt-5 flex justify-end"><Button disabled={pending} type="submit">{pending ? "Guardando..." : "Guardar estado"}</Button></div>
  </form>;
}
