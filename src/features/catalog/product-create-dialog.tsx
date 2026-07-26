"use client";

import { Plus, X } from "lucide-react";
import { useState } from "react";
import { ProductForm } from "./product-form";
import type { Category } from "./types";

export function ProductCreateDialog({ categories, useStock }: { categories: Category[]; useStock: boolean }) {
  const [open, setOpen] = useState(false);
  return <>
    <button className="col-span-3 inline-flex min-h-10 w-full items-center justify-center gap-1.5 rounded-xl bg-brand px-3 text-xs font-semibold text-white sm:col-span-1 sm:min-h-11 sm:w-auto sm:gap-2 sm:px-4 sm:text-sm" onClick={() => setOpen(true)} type="button"><Plus className="size-4" /> Crear producto</button>
    {open && <div aria-labelledby="create-product-title" aria-modal="true" className="fixed inset-0 z-50 grid place-items-center bg-black/55 p-4 backdrop-blur-sm" role="dialog">
      <button aria-label="Cerrar ventana" className="absolute inset-0 cursor-default" onClick={() => setOpen(false)} type="button" />
      <section className="relative z-10 max-h-[calc(100dvh-2rem)] w-full max-w-3xl overflow-y-auto overscroll-contain rounded-3xl border bg-surface p-5 shadow-2xl sm:p-7">
        <div className="mb-6 flex items-start justify-between gap-4"><div><p className="text-sm font-semibold text-brand">Catálogo</p><h2 className="text-xl font-bold" id="create-product-title">Crear producto</h2></div><button aria-label="Cerrar" className="grid size-10 place-items-center rounded-xl text-muted transition hover:bg-accent" onClick={() => setOpen(false)} type="button"><X className="size-5" /></button></div>
        <ProductForm categories={categories} onSuccess={() => setOpen(false)} stayOnList useStock={useStock} />
      </section>
    </div>}
  </>;
}
