import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { BusinessForm } from "@/features/admin/business-form";

export default function NewBusinessPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <Link className="inline-flex items-center gap-2 text-sm font-semibold text-brand" href="/admin/businesses">
        <ArrowLeft className="size-4" /> Volver a negocios
      </Link>
      <h2 className="mt-5 text-2xl font-bold">Crear negocio</h2>
      <p className="mt-2 text-sm text-muted">
        Se crearán automáticamente la categoría General y los métodos Efectivo y Transferencia.
      </p>
      <section className="mt-7 rounded-2xl border bg-surface p-5 sm:p-7">
        <BusinessForm />
      </section>
    </div>
  );
}
