import Link from "next/link";
import { CircleDollarSign, UserRound } from "lucide-react";
import { CustomerEditForm, CustomerForm } from "@/features/customers/customer-form";
import { getCustomers } from "@/features/customers/data";
import { toggleCustomer } from "@/features/customers/actions";
import { getBusinessFeatures } from "@/features/catalog/data";

export default async function CustomersPage() {
  const [customers, features] = await Promise.all([getCustomers(), getBusinessFeatures()]);
  return <div className="mx-auto max-w-6xl">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-semibold text-brand">Relaciones comerciales</p><h2 className="text-2xl font-bold">Clientes</h2><p className="mt-1 text-sm text-muted">Datos de contacto y estado de cada cliente.</p></div>{features.enable_credits && <Link className="inline-flex min-h-11 items-center gap-2 rounded-xl border bg-surface px-4 text-sm font-semibold text-foreground transition hover:bg-accent" href="/receivables"><CircleDollarSign className="size-4" /> Cuentas por cobrar</Link>}</div>
    <div className="mt-6 grid items-start gap-6 lg:grid-cols-[22rem_1fr]">
      <section className="rounded-2xl border bg-surface p-5"><h3 className="mb-4 font-bold">Nuevo cliente</h3><CustomerForm /></section>
      <section className="overflow-hidden rounded-2xl border bg-surface">
        <div className="border-b px-5 py-4"><h3 className="font-bold">{customers.length} clientes</h3></div>
        {customers.length === 0 ? <div className="grid place-items-center gap-2 px-5 py-14 text-center"><UserRound className="size-9 text-muted" /><p className="font-semibold">Todavía no hay clientes</p></div> :
          <div className="divide-y">{customers.map((customer) => <article className="px-5 py-4" key={customer.id}><div className="flex flex-wrap items-center justify-between gap-4"><div><p className="font-semibold">{customer.name}</p><p className="text-sm text-muted">{[customer.phone, customer.email].filter(Boolean).join(" · ") || "Sin datos de contacto"}</p></div><form action={toggleCustomer.bind(null, customer.id, !customer.is_active)}><button className={customer.is_active ? "min-h-10 rounded-xl border bg-surface px-3 text-sm font-semibold text-foreground hover:bg-accent" : "min-h-10 rounded-xl bg-brand px-3 text-sm font-semibold text-white"} type="submit">{customer.is_active ? "Desactivar" : "Activar"}</button></form></div><details className="mt-3"><summary className="cursor-pointer text-sm font-semibold text-brand">Editar datos del cliente</summary><CustomerEditForm customer={customer} /></details></article>)}</div>}
      </section>
    </div>
  </div>;
}
