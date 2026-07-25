"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import {
  updateOwner,
  type AdminActionState,
} from "@/features/admin/actions";
import type { Business, OwnerProfile } from "@/features/admin/types";

const initialState: AdminActionState = {};

export function OwnerEditForm({
  businesses,
  owner,
}: {
  businesses: Business[];
  owner: OwnerProfile;
}) {
  const [state, formAction, pending] = useActionState(
    updateOwner.bind(null, owner.id),
    initialState,
  );

  return (
    <form action={formAction} className="space-y-5">
      <label className="block">
        <span className="text-sm font-semibold">Nombre completo</span>
        <input
          className="mt-2 h-11 w-full rounded-xl border bg-surface px-3 outline-none focus:border-brand focus:ring-3 focus:ring-accent"
          defaultValue={owner.full_name}
          name="full_name"
          required
        />
      </label>
      <label className="block">
        <span className="text-sm font-semibold">Correo electrónico</span>
        <input
          className="mt-2 h-11 w-full rounded-xl border bg-surface px-3 outline-none focus:border-brand focus:ring-3 focus:ring-accent"
          defaultValue={owner.email}
          name="email"
          required
          type="email"
        />
      </label>
      <label className="block">
        <span className="text-sm font-semibold">Negocio</span>
        <select
          className="mt-2 h-11 w-full rounded-xl border bg-surface px-3"
          defaultValue={owner.business_id}
          name="business_id"
        >
          {businesses.map((business) => (
            <option key={business.id} value={business.id}>
              {business.name} {business.status === "inactive" ? "(inactivo)" : ""}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="text-sm font-semibold">Estado del acceso</span>
        <select
          className="mt-2 h-11 w-full rounded-xl border bg-surface px-3"
          defaultValue={owner.status}
          name="status"
        >
          <option value="active">Activo</option>
          <option value="inactive">Inactivo</option>
        </select>
      </label>
      <label className="block">
        <span className="text-sm font-semibold">Nueva contraseña</span>
        <input
          className="mt-2 h-11 w-full rounded-xl border bg-surface px-3 outline-none focus:border-brand focus:ring-3 focus:ring-accent"
          minLength={12}
          name="password"
          placeholder="Déjala vacía para conservar la actual"
          type="password"
        />
        <span className="mt-1.5 block text-xs text-muted">
          Al restablecerla se cerrarán sus sesiones y deberá cambiarla en el
          siguiente acceso.
        </span>
      </label>
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
      <Button className="w-full" disabled={pending} type="submit">
        {pending ? "Guardando..." : "Guardar cambios"}
      </Button>
    </form>
  );
}
