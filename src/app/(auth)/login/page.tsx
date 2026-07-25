import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ShieldCheck, TrendingUp } from "lucide-react";

import { BrandMark } from "@/components/brand/brand-mark";
import { LoginForm } from "@/features/auth/login-form";
import { getCurrentProfile } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Iniciar sesión",
};

export default async function LoginPage() {
  const profile = await getCurrentProfile();

  if (profile) {
    redirect(
      profile.must_change_password
        ? "/change-password"
        : profile.role === "super_admin"
          ? "/admin"
          : "/dashboard",
    );
  }

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

          <LoginForm />

          <p className="mt-7 text-center text-xs leading-5 text-muted">
            No existe registro público. Si necesitas acceso, contacta al
            administrador del sistema.
          </p>
        </div>
      </section>
    </main>
  );
}
