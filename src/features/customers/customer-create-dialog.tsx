"use client";

import { Plus, X } from "lucide-react";
import { useState } from "react";
import { CustomerForm } from "./customer-form";

export function CustomerCreateDialog() {
  const [open, setOpen] = useState(false);
  return <>
    <button className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-brand px-4 text-sm font-bold text-white transition hover:brightness-95" onClick={() => setOpen(true)} type="button"><Plus className="size-4" /> Agregar cliente</button>
    {open && <div aria-labelledby="new-customer-title" aria-modal="true" className="fixed inset-0 z-50 grid place-items-center bg-black/55 p-4 backdrop-blur-sm" role="dialog">
      <button aria-label="Cerrar ventana" className="absolute inset-0 cursor-default" onClick={() => setOpen(false)} type="button" />
      <section className="relative z-10 max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-y-auto rounded-3xl border bg-surface p-5 shadow-2xl sm:p-6">
        <div className="mb-5 flex items-start justify-between gap-4"><div><p className="text-sm font-semibold text-brand">Nuevo registro</p><h2 className="text-xl font-bold" id="new-customer-title">Agregar cliente</h2></div><button aria-label="Cerrar" className="grid size-10 place-items-center rounded-xl text-muted transition hover:bg-accent" onClick={() => setOpen(false)} type="button"><X className="size-5" /></button></div>
        <CustomerForm onSuccess={() => setOpen(false)} />
      </section>
    </div>}
  </>;
}
