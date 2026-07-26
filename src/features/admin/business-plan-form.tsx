"use client";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { updateBusinessPlan, type AdminActionState } from "@/features/admin/actions";
import type { Business, PlanTier } from "@/features/admin/types";

const plans: Array<{ id: PlanTier; name: string; description: string }> = [
  { id: "free", name: "Free", description: "Acceso por 30 días." },
  { id: "basic", name: "Basic", description: "Acceso por 30 días." },
  { id: "premium", name: "Premium", description: "Acceso por 30 días." },
  { id: "unlimited", name: "Unlimited", description: "Sin límite de tiempo." },
];

export function BusinessPlanForm({ business }: { business: Business }) {
  const [state, action, pending] = useActionState<AdminActionState, FormData>(updateBusinessPlan.bind(null, business.id), {});
  const expired = business.plan_expires_at ? new Date(business.plan_expires_at) <= new Date() : false;
  return <form action={action}>
    <div className="grid gap-3 sm:grid-cols-2">{plans.map((plan) => <label className="cursor-pointer rounded-2xl border bg-background p-4 has-checked:border-brand has-checked:ring-2 has-checked:ring-accent" key={plan.id}><input className="mr-2 accent-[var(--brand)]" defaultChecked={business.plan_tier === plan.id} name="plan_tier" type="radio" value={plan.id} /><span className="font-bold">{plan.name}</span><p className="mt-2 text-sm text-muted">{plan.description}</p></label>)}</div>
    <div className="mt-5 rounded-xl bg-background p-4 text-sm"><p><span className="text-muted">Estado:</span> <strong className={expired ? "text-red-700" : "text-brand"}>{expired ? "Vencido" : "Vigente"}</strong></p><p className="mt-1"><span className="text-muted">Vencimiento:</span> <strong>{business.plan_expires_at ? new Intl.DateTimeFormat("es-VE", { dateStyle: "long" }).format(new Date(business.plan_expires_at)) : "Sin vencimiento"}</strong></p></div>
    {state.error && <p className="mt-4 text-sm text-red-700">{state.error}</p>}{state.success && <p className="mt-4 text-sm text-brand">{state.success}</p>}
    <div className="mt-5 flex justify-end"><Button disabled={pending} type="submit">{pending ? "Actualizando..." : "Cambiar o renovar plan"}</Button></div>
  </form>;
}
