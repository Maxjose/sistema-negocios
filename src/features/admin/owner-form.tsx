"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import {
  createOwner,
  type AdminActionState,
} from "@/features/admin/actions";
import type { Business } from "@/features/admin/types";

const initialState: AdminActionState = {};

export function OwnerForm({ businesses }: { businesses: Business[] }) {
  const [state, formAction, pending] = useActionState(
    createOwner,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-5">
      <label className="block">
        <span className="text-sm font-semibold">Nombre completo</span>
        <input
          className="mt-2 h-11 w-full rounded-xl border bg-surface px-3 outline-none focus:border-brand focus:ring-3 focus:ring-accent"
          maxLength={120}
          name="full_name"
          required
        />
      </label>
      <label className="block">
        <span className="text-sm font-semibold">Correo electrónico</span>
        <input
          className="mt-2 h-11 w-full rounded-xl border bg-surface px-3 outline-none focus:border-brand focus:ring-3 focus:ring-accent"
          name="email"
          required
          type="email"
        />
      </label>
      <label className="block">
        <span className="text-sm font-semibold">Contraseña temporal</span>
        <input
          className="mt-2 h-11 w-full rounded-xl border bg-surface px-3 outline-none focus:border-brand focus:ring-3 focus:ring-accent"
          minLength={12}
          name="password"
          required
          type="password"
        />
        <span className="mt-1.5 block text-xs text-muted">
          Mínimo 12 caracteres. Entrégala al propietario por un canal seguro.
        </span>
      </label>
      <label className="block">
        <span className="text-sm font-semibold">Negocio asignado</span>
        <select
          className="mt-2 h-11 w-full rounded-xl border bg-surface px-3"
          name="business_id"
          required
        >
          <option value="">Selecciona un negocio</option>
          {businesses
            .filter((business) => business.status === "active")
            .map((business) => (
              <option key={business.id} value={business.id}>
                {business.name}
              </option>
            ))}
        </select>
      </label>

      {state.error && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </p>
      )}
      <Button className="w-full" disabled={pending} type="submit">
        {pending ? "Creando usuario..." : "Crear propietario"}
      </Button>
    </form>
  );
}
