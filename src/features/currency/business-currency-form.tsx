"use client";

import { useActionState, useState } from "react";
import { updateBusinessCurrency, type CurrencyActionState } from "@/features/currency/actions";
import { formatCurrencyAmount } from "@/features/currency/conversion";
import type { BusinessCurrency } from "@/features/currency/types";

const initialState: CurrencyActionState = {};

export function BusinessCurrencyForm({ currency }: { currency: BusinessCurrency }) {
  const [state, action, pending] = useActionState(updateBusinessCurrency, initialState);
  const [mode, setMode] = useState(currency.rate_mode);
  return <form action={action} className="rounded-2xl border bg-background p-4">
    <input name="currency_code" type="hidden" value={currency.currency_code} />
    <div className="flex items-start justify-between gap-4"><div><h4 className="font-bold">{currency.currency_code === "VES" ? "Bolívares" : "Pesos colombianos"}</h4><p className="mt-1 text-xs text-muted">{currency.automatic_rate ? `Automática: 1 USD = ${formatCurrencyAmount(currency.automatic_rate, currency.currency_code)}` : "Tasa automática aún no disponible"}</p></div><label className="relative inline-flex cursor-pointer items-center"><input className="peer sr-only" defaultChecked={currency.is_enabled} name="is_enabled" type="checkbox" /><span className="h-6 w-11 rounded-full bg-border transition peer-checked:bg-brand after:absolute after:left-1 after:top-1 after:size-4 after:rounded-full after:bg-white after:transition peer-checked:after:translate-x-5" /></label></div>
    <div className="mt-4 grid gap-3 sm:grid-cols-3">
      <label className="grid gap-1 text-xs font-semibold">Actualización<select className="h-10 rounded-xl border px-3" name="rate_mode" onChange={(event) => setMode(event.target.value as "automatic" | "manual")} value={mode}><option value="automatic">Automática</option><option value="manual">Manual</option></select></label>
      <label className="grid gap-1 text-xs font-semibold">Tasa manual<input className="h-10 rounded-xl border px-3 disabled:opacity-50" defaultValue={currency.manual_rate ?? ""} disabled={mode !== "manual"} min="0.00000001" name="manual_rate" step="0.00000001" type="number" /></label>
      <label className="grid gap-1 text-xs font-semibold">Ajuste automático (%)<input className="h-10 rounded-xl border px-3 disabled:opacity-50" defaultValue={currency.adjustment_percent} disabled={mode !== "automatic"} max="100" min="-50" name="adjustment_percent" step="0.01" type="number" /></label>
      <label className="grid gap-1 text-xs font-semibold">Redondear a<select className="h-10 rounded-xl border px-3" defaultValue={currency.rounding_increment} name="rounding_increment"><option value="0.01">0,01</option><option value="1">1</option><option value="10">10</option><option value="100">100</option><option value="1000">1.000</option></select></label>
    </div>
    {currency.effective_rate && <p className="mt-3 rounded-xl bg-accent p-3 text-sm font-semibold text-brand">Tasa efectiva: 1 USD = {formatCurrencyAmount(currency.effective_rate, currency.currency_code)}</p>}
    {state.error && <p className="mt-3 text-sm text-red-600">{state.error}</p>}{state.success && <p className="mt-3 text-sm text-brand">{state.success}</p>}
    <button className="mt-4 min-h-10 rounded-xl bg-brand px-4 text-sm font-semibold text-white disabled:opacity-60" disabled={pending} type="submit">{pending ? "Guardando..." : "Guardar moneda"}</button>
  </form>;
}
