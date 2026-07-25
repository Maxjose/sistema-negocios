"use client";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { createCategory, createPaymentMethod, type CatalogState } from "@/features/catalog/actions";

const initialState: CatalogState = {};

export function CategoryCreateForm() {
  const [state, action, pending] = useActionState(createCategory, initialState);
  return <form action={action} className="grid gap-3 sm:grid-cols-[1fr_auto]"><input className="h-11 rounded-xl border bg-surface px-3" name="name" placeholder="Nueva categoría" required /><input name="display_order" type="hidden" value="999" /><Button disabled={pending} type="submit">{pending ? "Creando..." : "Agregar"}</Button>{state.error && <p className="text-sm text-red-700 sm:col-span-2">{state.error}</p>}</form>;
}

export function PaymentCreateForm() {
  const [state, action, pending] = useActionState(createPaymentMethod, initialState);
  return <form action={action} className="grid gap-3 sm:grid-cols-[1fr_auto]"><input className="h-11 rounded-xl border bg-surface px-3" name="name" placeholder="Nuevo método" required /><input name="display_order" type="hidden" value="999" /><Button disabled={pending} type="submit">{pending ? "Creando..." : "Agregar"}</Button>{state.error && <p className="text-sm text-red-700 sm:col-span-2">{state.error}</p>}</form>;
}
