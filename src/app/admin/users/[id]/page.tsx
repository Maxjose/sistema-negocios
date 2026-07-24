import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";

import { getBusinesses, getOwner } from "@/features/admin/data";
import { OwnerEditForm } from "@/features/admin/owner-edit-form";

export default async function OwnerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [owner, businesses] = await Promise.all([
    getOwner(id),
    getBusinesses(),
  ]);
  if (!owner) notFound();

  return (
    <div className="mx-auto max-w-xl">
      <Link className="inline-flex items-center gap-2 text-sm font-semibold text-brand" href="/admin/users">
        <ArrowLeft className="size-4" /> Volver a propietarios
      </Link>
      <h2 className="mt-5 text-2xl font-bold">{owner.full_name}</h2>
      <p className="mt-2 text-sm text-muted">Acceso y asignación del propietario</p>
      <section className="mt-7 rounded-2xl border bg-surface p-5 sm:p-7">
        <OwnerEditForm businesses={businesses} owner={owner} />
      </section>
    </div>
  );
}
