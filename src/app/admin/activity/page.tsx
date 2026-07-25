import { getAuditLogs } from "@/features/admin/data";
import { getAuditActionLabel } from "@/features/admin/audit-labels";

export default async function ActivityPage() {
  const entries = await getAuditLogs();

  return (
    <div>
      <p className="text-sm text-muted">Acciones sensibles de la plataforma</p>
      <h2 className="mt-1 text-2xl font-bold tracking-tight">Actividad</h2>
      <div className="mt-7 overflow-hidden rounded-2xl border bg-surface">
        {entries.length === 0 ? (
          <p className="p-12 text-center text-sm text-muted">Todavía no hay actividad registrada.</p>
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
                  {new Intl.DateTimeFormat("es-VE", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  }).format(new Date(entry.created_at))}
                </time>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
