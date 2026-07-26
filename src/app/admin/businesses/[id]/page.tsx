import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Building2 } from "lucide-react";
import { notFound } from "next/navigation";

import { BusinessForm } from "@/features/admin/business-form";
import { BusinessFeaturesForm } from "@/features/admin/business-features-form";
import { BusinessPlanForm } from "@/features/admin/business-plan-form";
import { getBusiness } from "@/features/admin/data";
import { LogoForm } from "@/features/admin/logo-form";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function BusinessDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab } = await searchParams;
  const activeTab = tab === "features" || tab === "plan" ? tab : "information";
  const business = await getBusiness(id);
  if (!business) notFound();

  let logoUrl: string | null = null;
  if (business.logo_path) {
    const admin = createAdminClient();
    const { data } = await admin.storage
      .from("business-assets")
      .createSignedUrl(business.logo_path, 3600);
    logoUrl = data?.signedUrl ?? null;
  }

  return (
    <div className="mx-auto max-w-4xl">
      <Link className="inline-flex items-center gap-2 text-sm font-semibold text-brand" href="/admin/businesses">
        <ArrowLeft className="size-4" /> Volver a negocios
      </Link>
      <div className="mt-5 flex items-center gap-4">
        <div className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-2xl bg-accent text-brand">
          {logoUrl ? (
            <Image alt={`Logo de ${business.name}`} className="size-full object-cover" height={64} src={logoUrl} unoptimized width={64} />
          ) : (
            <Building2 className="size-7" />
          )}
        </div>
        <div>
          <h2 className="text-2xl font-bold">{business.name}</h2>
          <p className="mt-1 text-sm text-muted">Configuración administrativa</p>
        </div>
      </div>

      <nav aria-label="Secciones del negocio" className="mt-7 flex gap-2 border-b">
        <Link
          className={`border-b-2 px-4 py-3 text-sm font-semibold ${
            activeTab === "information"
              ? "border-brand text-brand"
              : "border-transparent text-muted"
          }`}
          href={`/admin/businesses/${id}?tab=information`}
        >
          Información del negocio
        </Link>
        <Link
          className={`border-b-2 px-4 py-3 text-sm font-semibold ${
            activeTab === "features"
              ? "border-brand text-brand"
              : "border-transparent text-muted"
          }`}
          href={`/admin/businesses/${id}?tab=features`}
        >
          Funciones
        </Link>
        <Link className={`border-b-2 px-4 py-3 text-sm font-semibold ${activeTab === "plan" ? "border-brand text-brand" : "border-transparent text-muted"}`} href={`/admin/businesses/${id}?tab=plan`}>
          Plan
        </Link>
      </nav>

      {activeTab === "information" ? (
        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_17rem]">
          <section className="rounded-2xl border bg-surface p-5 sm:p-7">
            <h3 className="mb-6 font-bold">Información del negocio</h3>
            <BusinessForm business={business} />
          </section>
          <aside className="h-fit rounded-2xl border bg-surface p-5">
            <h3 className="font-bold">Logotipo</h3>
            <p className="mb-4 mt-2 text-xs leading-5 text-muted">
              Visible para los propietarios dentro de su espacio.
            </p>
            <LogoForm businessId={business.id} />
          </aside>
        </div>
      ) : activeTab === "features" ? (
        <section className="mt-6 rounded-2xl border bg-surface p-5 sm:p-7">
          <h3 className="font-bold">Funciones disponibles</h3>
          <p className="mb-6 mt-2 text-sm leading-6 text-muted">
            Estos controles modifican las herramientas y validaciones del
            propietario.
          </p>
          <BusinessFeaturesForm business={business} />
        </section>
      ) : (
        <section className="mt-6 rounded-2xl border bg-surface p-5 sm:p-7">
          <h3 className="font-bold">Plan del negocio</h3>
          <p className="mb-6 mt-2 text-sm leading-6 text-muted">Cambiar un plan inicia un nuevo periodo. Free, Basic y Premium duran 30 días; Unlimited no vence.</p>
          <BusinessPlanForm business={business} />
        </section>
      )}
    </div>
  );
}
