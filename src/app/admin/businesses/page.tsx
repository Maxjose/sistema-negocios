import Link from "next/link";
import { Building2, Plus } from "lucide-react";

import { getBusinesses } from "@/features/admin/data";

export default async function BusinessesPage() {
  const businesses = await getBusinesses();

  return (
    <div>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm text-muted">Identidad y acceso por empresa</p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight">Negocios</h2>
        </div>
        <Link
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-brand px-4 text-sm font-semibold text-white"
          href="/admin/businesses/new"
        >
          <Plus className="size-4" /> Crear negocio
        </Link>
      </div>

      {businesses.length === 0 ? (
        <section className="mt-7 rounded-2xl border border-dashed bg-surface p-12 text-center">
          <Building2 className="mx-auto size-8 text-muted" />
          <h3 className="mt-4 font-bold">Aún no hay negocios</h3>
          <p className="mt-2 text-sm text-muted">Crea el primero para asignarle propietarios.</p>
        </section>
      ) : (
        <div className="mt-7 overflow-hidden rounded-2xl border bg-surface">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-background text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-5 py-3">Negocio</th>
                  <th className="px-5 py-3">Moneda</th>
                  <th className="px-5 py-3">Zona horaria</th>
                  <th className="px-5 py-3">Estado</th>
                  <th className="px-5 py-3 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {businesses.map((business) => (
                  <tr key={business.id}>
                    <td className="px-5 py-4 font-semibold">{business.name}</td>
                    <td className="px-5 py-4">{business.currency_code}</td>
                    <td className="px-5 py-4 text-muted">{business.timezone}</td>
                    <td className="px-5 py-4">
                      <span className={business.status === "active" ? "rounded-full bg-accent px-2.5 py-1 text-xs font-semibold text-brand-strong" : "rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600"}>
                        {business.status === "active" ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Link className="font-semibold text-brand" href={`/admin/businesses/${business.id}`}>
                        Gestionar
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
