"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import {
  updateBusinessFeatures,
  type AdminActionState,
} from "@/features/admin/actions";
import type { Business } from "@/features/admin/types";

const initialState: AdminActionState = {};

const options = [
  {
    name: "use_stock",
    title: "Controlar existencias",
    description:
      "Exige cantidades disponibles, descuenta unidades al vender y las restaura al anular.",
  },
  {
    name: "allow_discounts",
    title: "Permitir descuentos",
    description: "Muestra y habilita descuentos al registrar una venta.",
  },
  {
    name: "allow_sale_notes",
    title: "Permitir notas en ventas",
    description: "Permite agregar observaciones opcionales a cada venta.",
  },
] as const;

export function BusinessFeaturesForm({ business }: { business: Business }) {
  const [state, action, pending] = useActionState(
    updateBusinessFeatures.bind(null, business.id),
    initialState,
  );

  return (
    <form action={action} className="space-y-5">
      {options.map((option) => (
        <label
          className="flex cursor-pointer items-start justify-between gap-5 rounded-2xl border p-5"
          key={option.name}
        >
          <span>
            <span className="block font-semibold">{option.title}</span>
            <span className="mt-1 block text-sm leading-6 text-muted">
              {option.description}
            </span>
          </span>
          <span className="relative mt-1 inline-flex shrink-0">
            <input
              className="peer sr-only"
              defaultChecked={business[option.name]}
              name={option.name}
              role="switch"
              type="checkbox"
            />
            <span
              aria-hidden="true"
              className="h-7 w-12 rounded-full bg-slate-300 transition-colors peer-checked:bg-brand peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand"
            />
            <span
              aria-hidden="true"
              className="pointer-events-none absolute left-1 top-1 size-5 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-5"
            />
          </span>
        </label>
      ))}
      {state.error && (
        <p aria-live="polite" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </p>
      )}
      {state.success && (
        <p aria-live="polite" className="rounded-xl bg-accent px-4 py-3 text-sm text-brand-strong">
          {state.success}
        </p>
      )}
      <div className="flex justify-end">
        <Button disabled={pending} type="submit">
          {pending ? "Guardando..." : "Guardar funciones"}
        </Button>
      </div>
    </form>
  );
}
