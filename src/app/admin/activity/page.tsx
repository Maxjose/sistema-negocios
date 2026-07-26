import { z } from "zod";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import {
  auditActionLabels,
  getAuditActionLabel,
} from "@/features/admin/audit-labels";
import {
  getAuditActors,
  getAuditLogPage,
  getBusinesses,
} from "@/features/admin/data";

const filtersSchema = z.object({
  business: z.union([z.literal(""), z.uuid()]).optional(),
  actor: z.union([z.literal(""), z.uuid()]).optional(),
  action: z.string().trim().max(100).optional(),
  from: z.union([z.literal(""), z.iso.date()]).optional(),
  to: z.union([z.literal(""), z.iso.date()]).optional(),
  page: z.coerce.number().int().min(1).max(10000).default(1),
});

export default async function ActivityPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const parsed = filtersSchema.safeParse(await searchParams);
  const filters: z.infer<typeof filtersSchema> = parsed.success ? parsed.data : { page: 1 };
  const page = filters.page ?? 1;
  const pageSize = 25;
  const [activity, businesses, actors] = await Promise.all([
    getAuditLogPage(page, pageSize, {
      businessId: filters.business || undefined,
      actorId: filters.actor || undefined,
      action: filters.action || undefined,
      from: filters.from || undefined,
      to: filters.to || undefined,
    }),
    getBusinesses(),
    getAuditActors(),
  ]);
  const entries = activity.entries;
  const totalPages = Math.max(1, Math.ceil(activity.total / pageSize));
  const pageHref = (targetPage: number) => {
    const params = new URLSearchParams();
    if (filters.business) params.set("business", filters.business);
    if (filters.actor) params.set("actor", filters.actor);
    if (filters.action) params.set("action", filters.action);
    if (filters.from) params.set("from", filters.from);
    if (filters.to) params.set("to", filters.to);
    params.set("page", String(targetPage));
    return `/admin/activity?${params.toString()}`;
  };

  return (
    <div>
      <p className="text-sm text-muted">Acciones sensibles de la plataforma</p>
      <h2 className="mt-1 text-2xl font-bold tracking-tight">Actividad</h2>
      <form className="mt-6 grid gap-3 rounded-2xl border bg-surface p-4 md:grid-cols-2 xl:grid-cols-6">
        <select className="h-11 rounded-xl border px-3 text-sm" defaultValue={filters.business} name="business">
          <option value="">Todos los negocios</option>
          {businesses.map((business) => <option key={business.id} value={business.id}>{business.name}</option>)}
        </select>
        <select className="h-11 rounded-xl border px-3 text-sm" defaultValue={filters.actor} name="actor">
          <option value="">Todos los usuarios</option>
          {actors.map((actor) => <option key={actor.id} value={actor.id}>{actor.full_name}</option>)}
        </select>
        <select className="h-11 rounded-xl border px-3 text-sm" defaultValue={filters.action} name="action">
          <option value="">Todas las acciones</option>
          {Object.entries(auditActionLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <input aria-label="Desde" className="h-11 rounded-xl border px-3 text-sm" defaultValue={filters.from} name="from" type="date" />
        <input aria-label="Hasta" className="h-11 rounded-xl border px-3 text-sm" defaultValue={filters.to} name="to" type="date" />
        <button className="h-11 rounded-xl bg-brand px-4 text-sm font-semibold text-white" type="submit">Filtrar</button>
      </form>
      <div className="mt-6 overflow-hidden rounded-2xl border bg-surface">
        {entries.length === 0 ? (
          <p className="p-12 text-center text-sm text-muted">No hay actividad para estos filtros.</p>
        ) : (
          <ul className="divide-y">
            {entries.map((entry) => (
              <li className="grid gap-2 px-5 py-4 sm:grid-cols-[1fr_auto] sm:items-center" key={entry.id}>
                <div>
                  <p className="text-sm font-semibold">{getAuditActionLabel(entry.action)}</p>
                  <p className="mt-1 text-xs text-muted">
                    {entry.profiles?.full_name ?? "Sistema"} · {entry.businesses?.name ?? "Plataforma"}
                  </p>
                </div>
                <time className="text-xs text-muted">
                  {new Intl.DateTimeFormat("es-VE", { dateStyle: "medium", timeStyle: "short" }).format(new Date(entry.created_at))}
                </time>
              </li>
            ))}
          </ul>
        )}
      </div>
      {activity.total > 0 && <nav aria-label="Paginación de actividad" className="mt-4 flex flex-col items-center justify-between gap-3 rounded-2xl border bg-surface px-4 py-3 sm:flex-row">
        <p className="text-xs text-muted">Página <strong className="text-foreground">{Math.min(page, totalPages)}</strong> de <strong className="text-foreground">{totalPages}</strong> · {activity.total} registros</p>
        <div className="grid grid-cols-2 gap-2">
          {page > 1 ? <Link className="inline-flex min-h-10 items-center justify-center gap-1 rounded-xl border px-3 text-sm font-semibold hover:bg-accent" href={pageHref(page - 1)}><ChevronLeft className="size-4" /> Anterior</Link> : <span className="inline-flex min-h-10 items-center justify-center gap-1 rounded-xl border px-3 text-sm font-semibold text-muted opacity-50"><ChevronLeft className="size-4" /> Anterior</span>}
          {page < totalPages ? <Link className="inline-flex min-h-10 items-center justify-center gap-1 rounded-xl border px-3 text-sm font-semibold hover:bg-accent" href={pageHref(page + 1)}>Siguiente <ChevronRight className="size-4" /></Link> : <span className="inline-flex min-h-10 items-center justify-center gap-1 rounded-xl border px-3 text-sm font-semibold text-muted opacity-50">Siguiente <ChevronRight className="size-4" /></span>}
        </div>
      </nav>}
    </div>
  );
}
