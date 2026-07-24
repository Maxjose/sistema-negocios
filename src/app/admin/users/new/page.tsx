import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { getBusinesses } from "@/features/admin/data";
import { OwnerForm } from "@/features/admin/owner-form";

export default async function NewOwnerPage() {
  const businesses = await getBusinesses();
  const hasActiveBusiness = businesses.some((item) => item.status === "active");

  return (
    <div className="mx-auto max-w-xl">
      <Link className="inline-flex items-center gap-2 text-sm font-semibold text-brand" href="/admin/users">
        <ArrowLeft className="size-4" /> Volver a propietarios
      </Link>
      <h2 className="mt-5 text-2xl font-bold">Crear propietario</h2>
      <p className="mt-2 text-sm leading-6 text-muted">
        El usuario recibirá acceso únicamente a la información del negocio seleccionado.
      </p>
      <section className="mt-7 rounded-2xl border bg-surface p-5 sm:p-7">
        {hasActiveBusiness ? (
          <OwnerForm businesses={businesses} />
        ) : (
          <div className="text-center">
            <p className="text-sm text-muted">Primero debes crear o activar un negocio.</p>
            <Link className="mt-4 inline-block font-semibold text-brand" href="/admin/businesses/new">
              Crear negocio
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
