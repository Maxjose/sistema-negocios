import Link from "next/link";
import { CircleDollarSign } from "lucide-react";
import { getCustomers, getReceivables } from "@/features/customers/data";
import { ReceivableForm } from "@/features/customers/receivable-forms";

const money = new Intl.NumberFormat("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default async function ReceivablesPage() {
  const [customers, receivables] = await Promise.all([getCustomers(), getReceivables()]);
  const open = receivables.filter((item) => item.status === "open");
  const today = new Date().toISOString().slice(0, 10);
  const balance = open.reduce((sum, item) => sum + Number(item.balance), 0);
  const overdue = open.filter((item) => item.due_date < today);
  return <div className="mx-auto max-w-6xl">
    <div><p className="text-sm font-semibold text-brand">Créditos y cobros</p><h2 className="text-2xl font-bold">Cuentas por cobrar</h2><p className="mt-1 text-sm text-muted">Control de deudas, vencimientos y abonos.</p></div>
    <div className="mt-6 grid gap-4 sm:grid-cols-3"><div className="rounded-2xl border bg-surface p-5"><p className="text-sm text-muted">Saldo pendiente</p><p className="mt-2 text-2xl font-bold">{money.format(balance)}</p></div><div className="rounded-2xl border bg-surface p-5"><p className="text-sm text-muted">Cuentas abiertas</p><p className="mt-2 text-2xl font-bold">{open.length}</p></div><div className="rounded-2xl border bg-surface p-5"><p className="text-sm text-muted">Vencidas</p><p className="mt-2 text-2xl font-bold text-red-600">{overdue.length}</p></div></div>
    <div className="mt-6 grid items-start gap-6 lg:grid-cols-[22rem_1fr]">
      <section className="rounded-2xl border bg-surface p-5"><h3 className="mb-4 font-bold">Registrar deuda</h3>{customers.some((item) => item.is_active) ? <ReceivableForm customers={customers} /> : <p className="text-sm text-muted">Primero agrega un cliente activo.</p>}</section>
      <section className="overflow-hidden rounded-2xl border bg-surface">
        {receivables.length === 0 ? <div className="grid place-items-center gap-2 px-5 py-14 text-center"><CircleDollarSign className="size-9 text-muted" /><p className="font-semibold">No hay cuentas registradas</p></div> :
          <div className="divide-y">{receivables.map((item) => { const isOverdue = item.status === "open" && item.due_date < today; return <Link className="flex flex-wrap items-center justify-between gap-4 px-5 py-4 transition hover:bg-accent/50" href={`/receivables/${item.id}`} key={item.id}><div><p className="font-semibold">{item.customers?.name}</p><p className="text-sm text-muted">{item.description} · vence {new Intl.DateTimeFormat("es-VE").format(new Date(`${item.due_date}T12:00:00`))}</p></div><div className="text-right"><p className="font-bold">{money.format(Number(item.balance))}</p><span className={`text-xs font-semibold ${isOverdue ? "text-red-600" : item.status === "paid" ? "text-emerald-600" : "text-amber-600"}`}>{isOverdue ? "Vencida" : item.status === "paid" ? "Pagada" : "Pendiente"}</span></div></Link>; })}</div>}
      </section>
    </div>
  </div>;
}
