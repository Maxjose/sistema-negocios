"use client";

import { useActionState } from "react";
import { adjustProductStock } from "./actions";

export function StockAdjustmentForm({ productId, current }: { productId: string; current: number }) {
  const [state, action, pending] = useActionState(adjustProductStock.bind(null, productId), {});
  return <form action={action} className="grid gap-4">
    <div className="rounded-xl bg-background p-3 text-sm"><span className="text-muted">Existencia actual</span><strong className="float-right">{current}</strong></div>
    <label className="grid gap-1.5 text-sm font-semibold">Nueva cantidad<input className="min-h-11 w-full rounded-xl border bg-surface px-3 text-foreground outline-none focus:border-brand focus:ring-2 focus:ring-brand/20" defaultValue={current} min="0" name="new_quantity" required type="number" /></label>
    <label className="grid gap-1.5 text-sm font-semibold">Motivo<textarea className="min-h-20 w-full resize-y rounded-xl border bg-surface p-3 text-foreground outline-none placeholder:text-muted focus:border-brand focus:ring-2 focus:ring-brand/20" maxLength={250} name="reason" placeholder="Reposición, corrección, pérdida…" required /></label>
    {state.error && <p className="text-sm text-red-600">{state.error}</p>}
    {state.success && <p className="text-sm text-emerald-700">{state.success}</p>}
    <button className="min-h-11 rounded-xl bg-brand px-4 text-sm font-bold text-white transition hover:brightness-95 disabled:opacity-60" disabled={pending} type="submit">{pending ? "Ajustando…" : "Guardar ajuste"}</button>
  </form>;
}
