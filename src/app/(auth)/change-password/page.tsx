import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";

import { BrandMark } from "@/components/brand/brand-mark";
import { PasswordChangeForm } from "@/features/auth/password-change-form";
import { requireProfile } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Cambiar contraseña" };

export default async function ChangePasswordPage() {
  const profile = await requireProfile();
  if (!profile.must_change_password) {
    redirect(profile.role === "super_admin" ? "/admin" : "/dashboard");
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-10">
      <section className="w-full max-w-md rounded-3xl border bg-surface p-7 shadow-sm sm:p-9">
        <BrandMark />
        <div className="mt-10 flex size-12 items-center justify-center rounded-2xl bg-accent text-brand">
          <ShieldCheck aria-hidden="true" className="size-6" />
        </div>
        <p className="mt-6 text-sm font-semibold text-brand">Primer acceso</p>
        <h1 className="mt-2 text-3xl font-bold tracking-[-0.03em]">
          Protege tu cuenta
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted">
          Cambia la contraseña temporal antes de continuar. Debe tener al menos
          12 caracteres.
        </p>
        <PasswordChangeForm />
      </section>
    </main>
  );
}
