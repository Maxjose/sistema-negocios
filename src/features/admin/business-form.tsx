"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import {
  createBusiness,
  updateBusiness,
  type AdminActionState,
} from "@/features/admin/actions";
import type { Business } from "@/features/admin/types";

const initialState: AdminActionState = {};

export function BusinessForm({ business }: { business?: Business }) {
  const action = business
    ? updateBusiness.bind(null, business.id)
    : createBusiness;
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-6">
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="sm:col-span-2">
          <span className="text-sm font-semibold">Nombre del negocio</span>
          <input
            className="mt-2 h-11 w-full rounded-xl border bg-surface px-3 outline-none focus:border-brand focus:ring-3 focus:ring-accent"
            defaultValue={business?.name}
            maxLength={120}
            name="name"
            required
          />
        </label>
        <label>
          <span className="text-sm font-semibold">Moneda</span>
          <select
            className="mt-2 h-11 w-full rounded-xl border bg-surface px-3"
            defaultValue={business?.currency_code ?? "USD"}
            name="currency_code"
          >
            <option value="USD">USD — Dólar</option>
            <option value="VES">VES — Bolívar</option>
            <option value="EUR">EUR — Euro</option>
          </select>
        </label>
        <label>
          <span className="text-sm font-semibold">Zona horaria</span>
          <select
            className="mt-2 h-11 w-full rounded-xl border bg-surface px-3"
            defaultValue={business?.timezone ?? "America/Caracas"}
            name="timezone"
          >
            <option value="America/Caracas">America/Caracas</option>
            <option value="America/Bogota">America/Bogota</option>
            <option value="America/Panama">America/Panama</option>
            <option value="America/New_York">America/New_York</option>
          </select>
        </label>
        <label>
          <span className="text-sm font-semibold">Correo de contacto</span>
          <input
            className="mt-2 h-11 w-full rounded-xl border bg-surface px-3 outline-none focus:border-brand focus:ring-3 focus:ring-accent"
            defaultValue={business?.contact_email ?? ""}
            name="contact_email"
            type="email"
          />
        </label>
        <label>
          <span className="text-sm font-semibold">Teléfono</span>
          <input
            className="mt-2 h-11 w-full rounded-xl border bg-surface px-3 outline-none focus:border-brand focus:ring-3 focus:ring-accent"
            defaultValue={business?.contact_phone ?? ""}
            name="contact_phone"
          />
        </label>
        <label className="sm:col-span-2">
          <span className="text-sm font-semibold">Dirección</span>
          <textarea
            className="mt-2 min-h-24 w-full rounded-xl border bg-surface p-3 outline-none focus:border-brand focus:ring-3 focus:ring-accent"
            defaultValue={business?.address ?? ""}
            name="address"
          />
        </label>
        <label>
          <span className="text-sm font-semibold">Estado</span>
          <select
            className="mt-2 h-11 w-full rounded-xl border bg-surface px-3"
            defaultValue={business?.status ?? "active"}
            name="status"
          >
            <option value="active">Activo</option>
            <option value="inactive">Inactivo</option>
          </select>
        </label>
      </div>

      {state.error && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </p>
      )}
      <div className="flex justify-end">
        <Button disabled={pending} type="submit">
          {pending
            ? "Guardando..."
            : business
              ? "Guardar cambios"
              : "Crear negocio"}
        </Button>
      </div>
    </form>
  );
}
