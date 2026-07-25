"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import {
  changeAccountPassword,
  type PasswordChangeState,
} from "@/features/auth/actions";

const initialState: PasswordChangeState = {};

export function AccountPasswordForm() {
  const [state, action, pending] = useActionState(
    changeAccountPassword,
    initialState,
  );

  return (
    <form action={action} className="space-y-4">
      <label className="block">
        <span className="text-sm font-semibold">Contraseña actual</span>
        <input
          autoComplete="current-password"
          className="mt-2 h-11 w-full rounded-xl border px-3"
          name="current_password"
          required
          type="password"
        />
      </label>
      <label className="block">
        <span className="text-sm font-semibold">Nueva contraseña</span>
        <input
          autoComplete="new-password"
          className="mt-2 h-11 w-full rounded-xl border px-3"
          minLength={12}
          name="password"
          required
          type="password"
        />
      </label>
      <label className="block">
        <span className="text-sm font-semibold">Confirmar nueva contraseña</span>
        <input
          autoComplete="new-password"
          className="mt-2 h-11 w-full rounded-xl border px-3"
          minLength={12}
          name="confirmation"
          required
          type="password"
        />
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
      <Button disabled={pending} type="submit">
        {pending ? "Actualizando..." : "Cambiar contraseña"}
      </Button>
    </form>
  );
}
