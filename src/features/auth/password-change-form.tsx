"use client";

import { useActionState } from "react";
import { LockKeyhole } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  changeInitialPassword,
  type PasswordChangeState,
} from "@/features/auth/actions";

const initialState: PasswordChangeState = {};

export function PasswordChangeForm() {
  const [state, formAction, isPending] = useActionState(
    changeInitialPassword,
    initialState,
  );

  return (
    <form action={formAction} className="mt-8 space-y-5">
      {["password", "confirmation"].map((name, index) => (
        <label className="block" key={name}>
          <span className="text-sm font-semibold">
            {index === 0 ? "Nueva contraseña" : "Confirmar contraseña"}
          </span>
          <span className="relative mt-2 block">
            <LockKeyhole
              aria-hidden="true"
              className="absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-muted"
            />
            <input
              autoComplete="new-password"
              className="h-12 w-full rounded-xl border bg-surface pl-11 pr-4 text-sm outline-none transition focus:border-brand focus:ring-3 focus:ring-accent"
              minLength={12}
              name={name}
              required
              type="password"
            />
          </span>
        </label>
      ))}

      {state.error && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <Button className="h-12 w-full" disabled={isPending} type="submit">
        {isPending ? "Actualizando..." : "Guardar y continuar"}
      </Button>
    </form>
  );
}
