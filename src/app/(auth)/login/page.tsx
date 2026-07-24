import type { Metadata } from "next";
import { LockKeyhole, Mail, ShieldCheck, TrendingUp } from "lucide-react";

import { BrandMark } from "@/components/brand/brand-mark";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Iniciar sesión",
};

export default function LoginPage() {
  return (
    <main className="grid min-h-screen lg:grid-cols-[1.05fr_0.95fr]">
      <section className="relative hidden overflow-hidden bg-brand-strong p-12 text-white lg:flex lg:flex-col">
        <div className="absolute -right-24 -top-24 size-80 rounded-full bg-white/8" />
        <div className="absolute -bottom-32 left-16 size-96 rounded-full border border-white/10" />
        <BrandMark className="relative z-10 [&_span:first-child]:bg-white/15" />

        <div className="relative z-10 my-auto max-w-xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-sm">
            <TrendingUp aria-hidden="true" className="size-4" />
            Tu negocio, más claro
          </span>
          <h1 className="mt-6 text-5xl font-bold leading-[1.08] tracking-[-0.04em]">
            Ventas, inventario y ganancias en un solo lugar.
          </h1>
          <p className="mt-6 max-w-lg text-lg leading-8 text-emerald-50/75">
            Registra cada venta, conoce tus productos más rentables y toma
            decisiones con información confiable.
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-2 text-sm text-emerald-50/70">
          <ShieldCheck aria-hidden="true" className="size-4" />
          Acceso privado administrado de forma segura
        </div>
      </section>

      <section className="flex items-center justify-center bg-surface px-5 py-10 sm:px-10">
        <div className="w-full max-w-md">
          <BrandMark className="mb-12 lg:hidden" />
          <p className="text-sm font-semibold text-brand">Bienvenido</p>
          <h2 className="mt-2 text-3xl font-bold tracking-[-0.03em]">
            Inicia sesión
          </h2>
          <p className="mt-3 text-sm leading-6 text-muted">
            Usa las credenciales proporcionadas por el administrador.
          </p>

          <form className="mt-8 space-y-5">
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
                  name="password"
                  placeholder="Tu contraseña"
                  type="password"
                />
              </span>
            </label>

            <Button className="h-12 w-full" type="submit">
              Entrar al sistema
            </Button>
          </form>

          <p className="mt-7 text-center text-xs leading-5 text-muted">
            No existe registro público. Si necesitas acceso, contacta al
            administrador del sistema.
          </p>
        </div>
      </section>
    </main>
  );
}
