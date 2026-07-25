"use client";
import { useActionState } from "react";
import { importProducts, type CatalogState } from "@/features/catalog/actions";
import { Button } from "@/components/ui/button";

export function ProductImportForm() {
  const [state, action, pending] = useActionState<CatalogState, FormData>(importProducts, {});
  return (
    <form action={action} className="mt-4 flex flex-col gap-3 rounded-2xl border bg-surface p-4 sm:flex-row sm:items-end">
      <label className="flex-1 text-sm font-semibold">Importar productos desde CSV
        <input accept=".csv,text/csv" className="mt-2 block w-full rounded-xl border p-2" name="file" required type="file" />
      </label>
      <Button disabled={pending} type="submit">{pending ? "Importando..." : "Importar"}</Button>
      {state.error && <p aria-live="polite" className="text-sm text-red-700">{state.error}</p>}
      {state.success && <p aria-live="polite" className="text-sm text-brand">{state.success}</p>}
    </form>
  );
}
