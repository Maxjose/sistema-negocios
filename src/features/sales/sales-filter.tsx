import Link from "next/link";
import { CalendarDays, X } from "lucide-react";
import type { SalesPeriodKey } from "@/features/reports/period";

type Props = {
  period: SalesPeriodKey;
  from: string;
  to: string;
  status?: string;
};

const periods: { key: Exclude<SalesPeriodKey, "custom">; label: string }[] = [
  { key: "today", label: "Hoy" },
  { key: "yesterday", label: "Ayer" },
  { key: "week", label: "Esta semana" },
  { key: "month", label: "Este mes" },
];

function periodHref(period: string, status?: string) {
  const params = new URLSearchParams({ period });
  if (status) params.set("status", status);
  return `/sales?${params.toString()}`;
}

export function SalesFilter({ period, from, to, status }: Props) {
  const customFields = (
    <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
      <label className="grid gap-1 text-xs font-semibold text-muted">
        Desde
        <input className="h-10 rounded-xl border bg-surface px-3 text-sm text-foreground" defaultValue={from} name="from" type="date" />
      </label>
      <label className="grid gap-1 text-xs font-semibold text-muted">
        Hasta
        <input className="h-10 rounded-xl border bg-surface px-3 text-sm text-foreground" defaultValue={to} name="to" type="date" />
      </label>
      <button className="mt-auto h-10 rounded-xl bg-brand px-4 text-sm font-semibold text-white" type="submit">Aplicar</button>
    </div>
  );

  return (
    <section className="mt-6 rounded-2xl border bg-surface p-3 sm:p-4">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {periods.map((item) => (
          <Link
            className={`shrink-0 rounded-xl border px-3 py-2 text-sm font-semibold transition ${period === item.key ? "border-brand bg-accent text-brand-strong" : "bg-surface hover:border-brand hover:text-brand"}`}
            href={periodHref(item.key, status)}
            key={item.key}
          >
            {item.label}
          </Link>
        ))}
        <Link
          className={`hidden shrink-0 rounded-xl border px-3 py-2 text-sm font-semibold transition sm:inline-flex ${period === "custom" ? "border-brand bg-accent text-brand-strong" : "bg-surface hover:border-brand hover:text-brand"}`}
          href={periodHref("custom", status)}
        >
          Personalizado
        </Link>
      </div>

      <form className="mt-3 grid gap-3" method="get">
        <input name="period" type="hidden" value="custom" />
        {status && <input name="status" type="hidden" value={status} />}
        <details open={period === "custom"}>
          <summary className="flex min-h-10 cursor-pointer list-none items-center justify-center gap-2 rounded-xl border text-sm font-semibold sm:hidden">
            <CalendarDays className="size-4" /> Seleccionar fechas
          </summary>
          <div className="mt-3 sm:mt-0">{customFields}</div>
        </details>
      </form>

      <form className="mt-3 flex flex-wrap items-end gap-2 border-t pt-3" method="get">
        <input name="period" type="hidden" value={period} />
        {period === "custom" && <><input name="from" type="hidden" value={from} /><input name="to" type="hidden" value={to} /></>}
        <label className="grid flex-1 gap-1 text-xs font-semibold text-muted sm:max-w-52">
          Estado
          <select className="h-10 rounded-xl border bg-surface px-3 text-sm text-foreground" defaultValue={status ?? ""} name="status">
            <option value="">Todas</option>
            <option value="completed">Completadas</option>
            <option value="voided">Anuladas</option>
          </select>
        </label>
        <button className="h-10 rounded-xl border bg-surface px-4 text-sm font-semibold" type="submit">Filtrar</button>
        <Link className="inline-flex h-10 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold text-muted hover:bg-background hover:text-foreground" href="/sales">
          <X className="size-4" /> Limpiar
        </Link>
      </form>
    </section>
  );
}
