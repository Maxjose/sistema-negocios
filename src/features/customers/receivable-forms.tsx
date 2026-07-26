"use client";

import { useActionState } from "react";
import type { PaymentMethod } from "@/features/catalog/types";
import type { Customer } from "./types";
import { createReceivable, recordReceivablePayment } from "./actions";

const fieldClass = "min-h-11 w-full rounded-xl border bg-surface px-3 text-foreground outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20";
const buttonClass = "min-h-11 rounded-xl bg-brand px-4 text-sm font-bold text-white transition hover:brightness-95 disabled:opacity-60";

export function ReceivableForm({ customers }: { customers: Customer[] }) {
  const [state, action, pending] = useActionState(createReceivable, {});
  return <form action={action} className="grid gap-4">
    <label className="grid gap-1.5 text-sm font-semibold">Cliente<select className={fieldClass} name="customer_id" required><option value="">Seleccionar</option>{customers.filter((customer) => customer.is_active).map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}</select></label>
    <label className="grid gap-1.5 text-sm font-semibold">Concepto<input className={fieldClass} name="description" required /></label>
    <div className="grid gap-4 sm:grid-cols-2"><label className="grid gap-1.5 text-sm font-semibold">Monto<input className={fieldClass} min="0.01" name="amount" required step="0.01" type="number" /></label><label className="grid gap-1.5 text-sm font-semibold">Vencimiento<input className={fieldClass} name="due_date" required type="date" /></label></div>
    {state.error && <p className="text-sm text-red-600">{state.error}</p>}
    <button className={buttonClass} disabled={pending} type="submit">{pending ? "Creando…" : "Crear cuenta por cobrar"}</button>
  </form>;
}

export function PaymentForm({ id, methods, balance }: { id: string; methods: PaymentMethod[]; balance: number }) {
  const bound = recordReceivablePayment.bind(null, id);
  const [state, action, pending] = useActionState(bound, {});
  return <form action={action} className="grid gap-4">
    <label className="grid gap-1.5 text-sm font-semibold">Monto del abono<input className={fieldClass} max={balance} min="0.01" name="amount" required step="0.01" type="number" /></label>
    <label className="grid gap-1.5 text-sm font-semibold">Método<select className={fieldClass} name="payment_method_id" required><option value="">Seleccionar</option>{methods.filter((method) => method.is_active).map((method) => <option key={method.id} value={method.id}>{method.name}</option>)}</select></label>
    <label className="grid gap-1.5 text-sm font-semibold">Nota<input className={fieldClass} name="note" /></label>
    {state.error && <p className="text-sm text-red-600">{state.error}</p>}{state.success && <p className="text-sm text-emerald-700">{state.success}</p>}
    <button className={buttonClass} disabled={pending} type="submit">{pending ? "Registrando…" : "Registrar abono"}</button>
  </form>;
}
