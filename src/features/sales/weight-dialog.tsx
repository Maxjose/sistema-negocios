"use client";

import { useEffect, useRef, useState } from "react";
import type { Product } from "@/features/catalog/types";
import { formatQuantity, lineAmount, quantityFromInput } from "@/features/catalog/measurement";
import { formatMoney } from "@/lib/money";
import { CurrencyEquivalents } from "@/features/currency/currency-equivalents";
import type { CurrencyDisplayConfig } from "@/features/currency/types";

export function WeightDialog({ product, current, useStock, config, onClose, onConfirm }: {
  product: Product; current: number; useStock: boolean; config: CurrencyDisplayConfig;
  onClose: () => void; onConfirm: (grams: number) => void;
}) {
  const [value, setValue] = useState(current ? String(current) : "");
  const [unit, setUnit] = useState<"g" | "kg">("g");
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => { dialogRef.current?.showModal(); }, []);
  let grams = 0;
  let error = "";
  try {
    grams = quantityFromInput(Number(value), "weight", unit);
    if (grams <= 0) error = "Introduce un peso mayor que cero.";
    else if (useStock && grams > product.stock_quantity) error = "El peso supera la existencia disponible.";
  } catch (caught) { error = caught instanceof Error ? caught.message : "Peso inválido."; }
  const amount = lineAmount(Number(product.sale_price), grams, "weight");
  const confirm = () => { if (!error) onConfirm(grams); };
  return <dialog aria-labelledby="weight-title" className="m-auto w-[calc(100%_-_2rem)] max-w-sm rounded-3xl border bg-surface p-6 text-foreground shadow-2xl backdrop:bg-black/55" onCancel={onClose} ref={dialogRef}>
    <h3 className="text-lg font-bold" id="weight-title">{product.name}</h3>
    <p className="mt-2 text-sm text-muted">{formatMoney(Number(product.sale_price), config.baseCurrency)} / kg{useStock ? ` · ${formatQuantity(product.stock_quantity, "weight")} disponibles` : ""}</p>
    <div className="mt-5 grid grid-cols-[1fr_5rem] gap-2">
      <label className="grid gap-2 text-sm font-semibold">Peso<input autoFocus className="h-12 min-w-0 rounded-xl border bg-surface px-3" inputMode="decimal" min={unit === "g" ? 1 : 0.001} onChange={(event) => setValue(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); confirm(); } }} step={unit === "g" ? "1" : "0.001"} type="number" value={value} /></label>
      <label className="grid gap-2 text-sm font-semibold">Medida<select className="h-12 rounded-xl border bg-surface px-2" onChange={(event) => { const next = event.target.value as "g" | "kg"; if (!error && value) setValue(String(next === "g" ? grams : grams / 1000)); setUnit(next); }} value={unit}><option value="g">g</option><option value="kg">kg</option></select></label>
    </div>
    {value && error && <p className="mt-3 text-sm text-red-600" role="alert">{error}</p>}
    <div aria-live="polite" className="mt-5 rounded-xl bg-background p-4"><p className="text-xs text-muted">Total de esta porción</p><p className="mt-1 text-xl font-bold">{formatMoney(amount, config.baseCurrency)}</p><CurrencyEquivalents amount={amount} config={config} /></div>
    <div className="mt-6 grid grid-cols-2 gap-3"><button className="min-h-11 rounded-xl border text-sm font-semibold" onClick={onClose} type="button">Cancelar</button><button className="min-h-11 rounded-xl bg-brand text-sm font-semibold text-white disabled:opacity-50" disabled={Boolean(error)} onClick={confirm} type="button">{current ? "Guardar peso" : "Agregar"}</button></div>
  </dialog>;
}
