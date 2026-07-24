"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { uploadProductImage, type CatalogState } from "@/features/catalog/actions";

const initialState: CatalogState = {};

export function ProductImageForm({ productId }: { productId: string }) {
  const [state, action, pending] = useActionState(uploadProductImage.bind(null, productId), initialState);
  return <form action={action} className="space-y-3"><input accept="image/jpeg,image/png,image/webp" className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-accent file:px-3 file:py-2 file:font-semibold file:text-brand-strong" name="image" required type="file" /><p className="text-xs text-muted">JPG, PNG o WebP. Máximo 5 MB.</p>{state.error && <p className="text-sm text-red-700">{state.error}</p>}{state.success && <p className="text-sm text-brand">{state.success}</p>}<Button disabled={pending} type="submit" variant="secondary">{pending ? "Subiendo..." : "Actualizar imagen"}</Button></form>;
}
