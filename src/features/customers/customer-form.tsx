"use client";

import { useActionState } from "react";
import { createCustomer } from "./actions";
import { updateCustomer } from "./actions";
import type { Customer } from "./types";

export function CustomerForm() {
  const [state, action, pending] = useActionState(createCustomer, {});
  return <form action={action} className="grid gap-4 sm:grid-cols-2">
    <label className="grid gap-1.5 text-sm font-semibold sm:col-span-2">Nombre<input className="input" name="name" required /></label>
    <label className="grid gap-1.5 text-sm font-semibold">Teléfono<input className="input" name="phone" /></label>
    <label className="grid gap-1.5 text-sm font-semibold">Correo<input className="input" name="email" type="email" /></label>
    <label className="grid gap-1.5 text-sm font-semibold sm:col-span-2">Notas<textarea className="input min-h-24 resize-y" name="notes" /></label>
    {state.error && <p className="text-sm text-red-600 sm:col-span-2">{state.error}</p>}
    {state.success && <p className="text-sm text-emerald-700 sm:col-span-2">{state.success}</p>}
    <button className="button-primary sm:col-span-2" disabled={pending} type="submit">{pending ? "Guardando…" : "Agregar cliente"}</button>
  </form>;
}

export function CustomerEditForm({ customer }: { customer: Customer }) {
  const [state, action, pending] = useActionState(updateCustomer.bind(null, customer.id), {});
  return <form action={action} className="mt-4 grid gap-3 rounded-xl bg-background p-4 sm:grid-cols-2">
    <label className="grid gap-1 text-xs font-semibold sm:col-span-2">Nombre<input className="input" defaultValue={customer.name} name="name" required /></label>
    <label className="grid gap-1 text-xs font-semibold">Teléfono<input className="input" defaultValue={customer.phone ?? ""} name="phone" /></label>
    <label className="grid gap-1 text-xs font-semibold">Correo<input className="input" defaultValue={customer.email ?? ""} name="email" type="email" /></label>
    <label className="grid gap-1 text-xs font-semibold sm:col-span-2">Notas<textarea className="input min-h-20" defaultValue={customer.notes ?? ""} name="notes" /></label>
    {state.error && <p className="text-sm text-red-600 sm:col-span-2">{state.error}</p>}{state.success && <p className="text-sm text-emerald-700 sm:col-span-2">{state.success}</p>}
    <button className="button-primary sm:col-span-2" disabled={pending} type="submit">{pending ? "Guardando…" : "Guardar cambios"}</button>
  </form>;
}
