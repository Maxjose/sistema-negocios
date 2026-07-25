import Link from "next/link";
import {
  Building2,
  CircleCheckBig,
  UserRoundCheck,
  UsersRound,
} from "lucide-react";

import {
  getAdminStats,
  getAuditLogs,
} from "@/features/admin/data";
import { getAuditActionLabel } from "@/features/admin/audit-labels";

export default async function AdminPage() {
  const [stats, activity] = await Promise.all([
    getAdminStats(),
    getAuditLogs(5),
  ]);
  const metrics = [
    { label: "Negocios", value: stats.businessCount, icon: Building2 },
    {
      label: "Negocios activos",
      value: stats.activeBusinessCount,
      icon: CircleCheckBig,
    },
    { label: "Propietarios", value: stats.ownerCount, icon: UsersRound },
    {
      label: "Accesos activos",
      value: stats.activeOwnerCount,
      icon: UserRoundCheck,
    },
  ];

  return (
    <div>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm text-muted">Vista global de la plataforma</p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight">
            Resumen administrativo
          </h2>
        </div>
        <Link
          className="inline-flex min-h-11 items-center justify-center rounded-xl bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-strong"
          href="/admin/businesses/new"
        >
          Crear negocio
        </Link>
      </div>
      <section className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(({ label, value, icon: Icon }) => (
          <article className="rounded-2xl border bg-surface p-5" key={label}>
            <Icon aria-hidden="true" className="size-5 text-brand" />
            <p className="mt-5 text-sm text-muted">{label}</p>
            <p className="mt-1 text-3xl font-bold">{value}</p>
          </article>
        ))}
      </section>
      <section className="mt-6 rounded-2xl border bg-surface p-6">
        <div className="flex items-center justify-between">
          <h3 className="font-bold">Actividad reciente</h3>
          <Link className="text-sm font-semibold text-brand" href="/admin/activity">
            Ver todo
          </Link>
        </div>
        {activity.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted">
            La actividad administrativa aparecerá aquí.
          </p>
        ) : (
          <ul className="mt-4 divide-y">
            {activity.map((entry) => (
              <li className="flex items-center justify-between gap-4 py-3" key={entry.id}>
                <div>
                  <p className="text-sm font-semibold">
                    {getAuditActionLabel(entry.action)}
                  </p>
                  <p className="text-xs text-muted">
                    {entry.businesses?.name ?? "Plataforma"}
                  </p>
                </div>
                <time className="text-xs text-muted">
                  {new Intl.DateTimeFormat("es-VE", {
                    dateStyle: "short",
                    timeStyle: "short",
                  }).format(new Date(entry.created_at))}
                </time>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
