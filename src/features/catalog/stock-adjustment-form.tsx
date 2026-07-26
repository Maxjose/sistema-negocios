"use client";

import { useActionState } from "react";
import { adjustProductStock } from "./actions";

export function StockAdjustmentForm({ productId, current }: { productId: string; current: number }) {
  const [state, action, pending] = useActionState(adjustProductStock.bind(null, productId), {});
  return <form action={action} className="grid gap-4">
    <div className="rounded-xl bg-background p-3 text-sm"><span className="text-muted">Existencia actual</span><strong className="float-right">{current}</strong></div>
    <label className="grid gap-1.5 text-sm font-semibold">Nueva cantidad<input className="input" defaultValue={current} min="0" name="new_quantity" required type="number" /></label>
    <label className="grid gap-1.5 text-sm font-semibold">Motivo<textarea className="input min-h-20 resize-y" maxLength={250} name="reason" placeholder="Reposición, corrección, pérdida…" required /></label>
    {state.error && <p className="text-sm text-red-600">{state.error}</p>}
    {state.success && <p className="text-sm text-emerald-700">{state.success}</p>}
    <button className="button-primary" disabled={pending} type="submit">{pending ? "Ajustando…" : "Guardar ajuste"}</button>
  </form>;
}
