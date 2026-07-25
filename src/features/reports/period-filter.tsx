export function PeriodFilter({ period, from, to }: { period: string; from: string; to: string }) {
  return <form className="grid gap-2 rounded-2xl border bg-surface p-3 sm:grid-cols-[auto_auto_auto_auto]">
    <select className="h-10 rounded-xl border px-3 text-sm" defaultValue={period} name="period"><option value="today">Hoy</option><option value="week">Últimos 7 días</option><option value="month">Este mes</option><option value="custom">Personalizado</option></select>
    <input className="h-10 rounded-xl border px-3 text-sm" defaultValue={from} name="from" type="date" />
    <input className="h-10 rounded-xl border px-3 text-sm" defaultValue={to} name="to" type="date" />
    <button className="rounded-xl bg-brand px-4 text-sm font-semibold text-white" type="submit">Aplicar</button>
  </form>;
}
