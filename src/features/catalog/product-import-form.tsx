"use client";

import { Upload, X } from "lucide-react";
import { useActionState, useState } from "react";
import { importProducts, type CatalogState } from "@/features/catalog/actions";
import { Button } from "@/components/ui/button";

export function ProductImportForm() {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<CatalogState, FormData>(async (previous, formData) => {
    const result = await importProducts(previous, formData);
    if (result.success) setOpen(false);
    return result;
  }, {});
  return <>
    <button className="inline-flex min-h-10 w-full items-center justify-center gap-1.5 rounded-xl border bg-surface px-2 text-xs font-semibold transition hover:bg-accent sm:min-h-11 sm:w-auto sm:gap-2 sm:px-4 sm:text-sm" onClick={() => setOpen(true)} type="button"><Upload className="size-4" /> Importar</button>
    {open && <div aria-labelledby="import-products-title" aria-modal="true" className="fixed inset-0 z-50 grid place-items-center bg-black/55 p-4 backdrop-blur-sm" role="dialog">
      <button aria-label="Cerrar ventana" className="absolute inset-0 cursor-default" onClick={() => setOpen(false)} type="button" />
      <section className="relative z-10 w-full max-w-lg rounded-3xl border bg-surface p-5 shadow-2xl sm:p-6">
        <div className="flex items-start justify-between gap-4"><div><p className="text-sm font-semibold text-brand">Carga masiva</p><h2 className="text-xl font-bold" id="import-products-title">Importar productos desde CSV</h2></div><button aria-label="Cerrar" className="grid size-10 place-items-center rounded-xl text-muted hover:bg-accent" onClick={() => setOpen(false)} type="button"><X className="size-5" /></button></div>
        <form action={action} className="mt-6 grid gap-4">
          <label className="text-sm font-semibold">Archivo CSV<input accept=".csv,text/csv" className="mt-2 block w-full rounded-xl border bg-surface p-3 text-sm" name="file" required type="file" /></label>
          <p className="text-xs leading-5 text-muted">Usa la opción “Plantilla” para descargar un archivo con las columnas y el formato esperados.</p>
          <Button disabled={pending} type="submit">{pending ? "Importando..." : "Importar productos"}</Button>
          {state.error && <p aria-live="polite" className="text-sm text-red-700 dark:text-red-400">{state.error}</p>}
        </form>
      </section>
    </div>}
  </>;
}
