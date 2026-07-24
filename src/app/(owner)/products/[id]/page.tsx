import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Package } from "lucide-react";
import { notFound } from "next/navigation";
import { getCategories, getProduct } from "@/features/catalog/data";
import { ProductForm } from "@/features/catalog/product-form";
import { ProductImageForm } from "@/features/catalog/product-image-form";
import { createClient } from "@/lib/supabase/server";

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [product, categories] = await Promise.all([getProduct(id), getCategories()]);
  if (!product) notFound();
  let imageUrl: string | null = null;
  if (product.image_path) { const supabase = await createClient(); const { data } = await supabase.storage.from("business-assets").createSignedUrl(product.image_path, 3600); imageUrl = data?.signedUrl ?? null; }
  return <div className="mx-auto max-w-4xl"><Link className="inline-flex items-center gap-2 text-sm font-semibold text-brand" href="/products"><ArrowLeft className="size-4" /> Volver a productos</Link><div className="mt-5 flex items-center gap-4"><div className="grid size-16 place-items-center overflow-hidden rounded-2xl bg-accent text-brand">{imageUrl ? <Image alt={product.name} className="size-full object-cover" height={64} src={imageUrl} unoptimized width={64} /> : <Package className="size-7" />}</div><div><h2 className="text-2xl font-bold">{product.name}</h2><p className="text-sm text-muted">{product.stock_quantity} unidades disponibles</p></div></div><div className="mt-7 grid gap-6 lg:grid-cols-[1fr_17rem]"><section className="rounded-2xl border bg-surface p-5 sm:p-7"><ProductForm categories={categories} product={product} /></section><aside className="h-fit rounded-2xl border bg-surface p-5"><h3 className="font-bold">Fotografía</h3><p className="mb-4 mt-2 text-xs text-muted">Imagen visible en el catálogo de venta.</p><ProductImageForm productId={product.id} /></aside></div></div>;
}
