"use client";
import { Printer } from "lucide-react";

export function PrintReceiptButton() {
  return (
    <button className="inline-flex h-10 items-center gap-2 rounded-xl border bg-surface px-4 text-sm font-semibold print:hidden" onClick={() => window.print()} type="button">
      <Printer className="size-4" /> Imprimir
    </button>
  );
}
