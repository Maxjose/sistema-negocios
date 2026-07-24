import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getCategories } from "@/features/catalog/data";
import { ProductForm } from "@/features/catalog/product-form";

export default async function NewProductPage() {
  const categories = await getCategories();
  return <div className="mx-auto max-w-3xl"><Link className="inline-flex items-center gap-2 text-sm font-semibold text-brand" href="/products"><ArrowLeft className="size-4" /> Volver a productos</Link><h2 className="mt-5 text-2xl font-bold">Crear producto</h2><section className="mt-7 rounded-2xl border bg-surface p-5 sm:p-7"><ProductForm categories={categories} /></section></div>;
}
