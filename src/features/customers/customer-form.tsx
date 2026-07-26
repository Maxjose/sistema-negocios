"use client";

import { useActionState } from "react";
import { createCustomer } from "./actions";
import { updateCustomer } from "./actions";
import type { Customer } from "./types";
import { phoneCountries, splitPhone } from "./phone";

const fieldClass = "min-h-11 w-full rounded-xl border bg-surface px-3 text-foreground outline-none transition placeholder:text-muted focus:border-brand focus:ring-2 focus:ring-brand/20";
const buttonClass = "min-h-11 rounded-xl bg-brand px-4 text-sm font-bold text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60";

export function CustomerForm({ onSuccess }: { onSuccess?: () => void }) {
  const [state, action, pending] = useActionState(async (previous: Awaited<ReturnType<typeof createCustomer>>, formData: FormData) => {
    const result = await createCustomer(previous, formData);
    if (result.success) onSuccess?.();
    return result;
  }, {});
  return <form action={action} className="grid gap-4 sm:grid-cols-2">
    <label className="grid gap-1.5 text-sm font-semibold sm:col-span-2">Nombre<input className={fieldClass} name="name" required /></label>
    <fieldset className="grid gap-1.5 sm:col-span-2"><legend className="text-sm font-semibold">Teléfono</legend><div className="grid grid-cols-[9.5rem_minmax(0,1fr)] gap-2"><select aria-label="Código de país" className={fieldClass} defaultValue="+58" name="phone_country_code">{phoneCountries.map((country) => <option key={`${country.name}-${country.code}`} value={country.code}>{country.flag} {country.code}</option>)}</select><input aria-label="Número de teléfono" className={fieldClass} inputMode="tel" name="phone_number" placeholder="4121234567" /></div></fieldset>
    <label className="grid gap-1.5 text-sm font-semibold">Correo<input className={fieldClass} name="email" type="email" /></label>
    <label className="grid gap-1.5 text-sm font-semibold sm:col-span-2">Notas<textarea className={`${fieldClass} min-h-24 resize-y py-3`} name="notes" /></label>
    {state.error && <p className="text-sm text-red-600 sm:col-span-2">{state.error}</p>}
    {state.success && <p className="text-sm text-emerald-700 sm:col-span-2">{state.success}</p>}
    <button className={`${buttonClass} sm:col-span-2`} disabled={pending} type="submit">{pending ? "Guardando…" : "Agregar cliente"}</button>
  </form>;
}

export function CustomerEditForm({ customer }: { customer: Customer }) {
  const phone = splitPhone(customer.phone);
  const [state, action, pending] = useActionState(updateCustomer.bind(null, customer.id), {});
  return <form action={action} className="mt-4 grid gap-3 rounded-xl bg-background p-4 sm:grid-cols-2">
    <label className="grid gap-1 text-xs font-semibold sm:col-span-2">Nombre<input className={fieldClass} defaultValue={customer.name} name="name" required /></label>
    <fieldset className="grid gap-1 sm:col-span-2"><legend className="text-xs font-semibold">Teléfono</legend><div className="grid grid-cols-[9.5rem_minmax(0,1fr)] gap-2"><select aria-label="Código de país" className={fieldClass} defaultValue={phone.countryCode} name="phone_country_code">{phoneCountries.map((country) => <option key={`${country.name}-${country.code}`} value={country.code}>{country.flag} {country.code}</option>)}</select><input aria-label="Número de teléfono" className={fieldClass} defaultValue={phone.number} inputMode="tel" name="phone_number" /></div></fieldset>
    <label className="grid gap-1 text-xs font-semibold">Correo<input className={fieldClass} defaultValue={customer.email ?? ""} name="email" type="email" /></label>
    <label className="grid gap-1 text-xs font-semibold sm:col-span-2">Notas<textarea className={`${fieldClass} min-h-20 py-3`} defaultValue={customer.notes ?? ""} name="notes" /></label>
    {state.error && <p className="text-sm text-red-600 sm:col-span-2">{state.error}</p>}{state.success && <p className="text-sm text-emerald-700 sm:col-span-2">{state.success}</p>}
    <button className={`${buttonClass} sm:col-span-2`} disabled={pending} type="submit">{pending ? "Guardando…" : "Guardar cambios"}</button>
  </form>;
}
