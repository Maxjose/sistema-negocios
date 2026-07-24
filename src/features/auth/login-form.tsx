"use client";

import { useActionState } from "react";
import { LockKeyhole, Mail } from "lucide-react";

import { Button } from "@/components/ui/button";
import { login, type LoginState } from "@/features/auth/actions";

const initialState: LoginState = {};

export function LoginForm() {
  const [state, formAction, isPending] = useActionState(login, initialState);

  return (
    <form action={formAction} className="mt-8 space-y-5">
      <label className="block">
        <span className="text-sm font-semibold">Correo electrónico</span>
        <span className="relative mt-2 block">
          <Mail
            aria-hidden="true"
            className="absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-muted"
          />
          <input
            autoComplete="email"
            className="h-12 w-full rounded-xl border bg-surface pl-11 pr-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-brand focus:ring-3 focus:ring-accent"
            name="email"
            placeholder="nombre@negocio.com"
            required
            type="email"
          />
        </span>
      </label>

      <label className="block">
        <span className="text-sm font-semibold">Contraseña</span>
        <span className="relative mt-2 block">
          <LockKeyhole
            aria-hidden="true"
            className="absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-muted"
          />
          <input
            autoComplete="current-password"
            className="h-12 w-full rounded-xl border bg-surface pl-11 pr-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-brand focus:ring-3 focus:ring-accent"
            minLength={8}
            name="password"
            placeholder="Tu contraseña"
            required
            type="password"
          />
        </span>
      </label>

      {state.error && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <Button className="h-12 w-full" disabled={isPending} type="submit">
        {isPending ? "Verificando..." : "Entrar al sistema"}
      </Button>
    </form>
  );
}
