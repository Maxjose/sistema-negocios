import Link from "next/link";
import { Plus, UserRound } from "lucide-react";

import { setOwnerStatus } from "@/features/admin/actions";
import { getOwners } from "@/features/admin/data";

export default async function UsersPage() {
  const owners = await getOwners();

  return (
    <div>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm text-muted">Accesos asignados a negocios</p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight">Propietarios</h2>
        </div>
        <Link
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-brand px-4 text-sm font-semibold text-white"
          href="/admin/users/new"
        >
          <Plus className="size-4" /> Crear propietario
        </Link>
      </div>

      {owners.length === 0 ? (
        <section className="mt-7 rounded-2xl border border-dashed bg-surface p-12 text-center">
          <UserRound className="mx-auto size-8 text-muted" />
          <h3 className="mt-4 font-bold">Aún no hay propietarios</h3>
          <p className="mt-2 text-sm text-muted">Crea un negocio antes de asignar su primer acceso.</p>
        </section>
      ) : (
        <div className="mt-7 overflow-hidden rounded-2xl border bg-surface">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-background text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-5 py-3">Propietario</th>
                  <th className="px-5 py-3">Negocio</th>
                  <th className="px-5 py-3">Estado</th>
                  <th className="px-5 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {owners.map((owner) => {
                  const nextStatus = owner.status === "active" ? "inactive" : "active";
                  return (
                    <tr key={owner.id}>
                      <td className="px-5 py-4">
                        <p className="font-semibold">{owner.full_name}</p>
                        <p className="mt-0.5 text-xs text-muted">{owner.email}</p>
                      </td>
                      <td className="px-5 py-4">{owner.business_name}</td>
                      <td className="px-5 py-4">
                        <span className={owner.status === "active" ? "rounded-full bg-accent px-2.5 py-1 text-xs font-semibold text-brand-strong" : "rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600"}>
                          {owner.status === "active" ? "Activo" : "Inactivo"}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-4">
                          <Link className="text-sm font-semibold text-brand" href={`/admin/users/${owner.id}`}>
                            Gestionar
                          </Link>
                          <form action={setOwnerStatus.bind(null, owner.id, nextStatus)}>
                          <button className={owner.status === "active" ? "text-sm font-semibold text-red-700" : "text-sm font-semibold text-brand"} type="submit">
                            {owner.status === "active" ? "Desactivar" : "Activar"}
                          </button>
                          </form>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
