"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import {
  createCategory,
  createPaymentMethod,
  type CatalogState,
} from "@/features/catalog/actions";

const initialState: CatalogState = {};

export function CategoryCreateForm() {
  const [state, action, pending] = useActionState(createCategory, initialState);
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-[1fr_6rem_auto]">
      <input className="h-11 rounded-xl border bg-surface px-3" name="name" placeholder="Nueva categoría" required />
      <input className="h-11 rounded-xl border bg-surface px-3" min="0" name="display_order" placeholder="Orden" type="number" />
      <Button disabled={pending} type="submit">{pending ? "Creando..." : "Agregar"}</Button>
      {state.error && <p className="text-sm text-red-700 sm:col-span-3">{state.error}</p>}
    </form>
  );
}

export function PaymentCreateForm() {
  const [state, action, pending] = useActionState(createPaymentMethod, initialState);
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-[1fr_6rem_auto]">
      <input className="h-11 rounded-xl border bg-surface px-3" name="name" placeholder="Nuevo método" required />
      <input className="h-11 rounded-xl border bg-surface px-3" min="0" name="display_order" placeholder="Orden" type="number" />
      <Button disabled={pending} type="submit">{pending ? "Creando..." : "Agregar"}</Button>
      {state.error && <p className="text-sm text-red-700 sm:col-span-3">{state.error}</p>}
    </form>
  );
}
