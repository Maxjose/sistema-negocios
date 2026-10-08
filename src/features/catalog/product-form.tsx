"use client";

import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  createProduct,
  updateProduct,
  type CatalogState,
} from "@/features/catalog/actions";
import type { Category, Product } from "@/features/catalog/types";
import { displayQuantity, type SaleUnit } from "@/features/catalog/measurement";
import { BarcodeScanner } from "@/features/sales/barcode-scanner";

const initialState: CatalogState = {};

export function ProductForm({ categories, enableBarcodeScanner = false, onSuccess, product, stayOnList = false, useStock, useStockAdjustments = false }: { categories: Category[]; enableBarcodeScanner?: boolean; onSuccess?: () => void; product?: Product; stayOnList?: boolean; useStock: boolean; useStockAdjustments?: boolean }) {
  const [saleUnit, setSaleUnit] = useState<SaleUnit>(product?.sale_unit ?? "unit");
  const [sku, setSku] = useState(product?.sku ?? "");
  const formAction = product ? updateProduct.bind(null, product.id) : createProduct;
  const [state, action, pending] = useActionState(async (previous: CatalogState, formData: FormData) => {
    const result = await formAction(previous, formData);
    if (result.success) onSuccess?.();
    return result;
  }, initialState);
  return (
    <form action={action} className="space-y-6">
      {stayOnList && <input name="stay_on_list" type="hidden" value="true" />}
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="sm:col-span-2"><span className="text-sm font-semibold">Nombre</span><input className="mt-2 h-11 w-full rounded-xl border bg-surface px-3" defaultValue={product?.name} name="name" required /></label>
        <div className="min-w-0">
          <label className="text-sm font-semibold" htmlFor="product-sku">{enableBarcodeScanner ? "Código de barras / SKU" : "SKU opcional"}</label>
          <div className="mt-2 grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
            <input autoComplete="off" className="h-11 min-w-0 w-full rounded-xl border bg-surface px-3" id="product-sku" inputMode="text" maxLength={80} name="sku" onChange={(event) => setSku(event.target.value)} placeholder={enableBarcodeScanner ? "Escanea o escribe el código" : undefined} value={sku} />
            {enableBarcodeScanner && (
              <BarcodeScanner
                buttonLabel="Escanear"
                closeAfterScan
                dialogDescription="El código reconocido se colocará automáticamente en el campo del producto."
                dialogTitle="Escanea el código del producto"
                onScan={setSku}
                showButtonLabel
              />
            )}
          </div>
        </div>
        <label><span className="text-sm font-semibold">Categoría</span><select className="mt-2 h-11 w-full rounded-xl border bg-surface px-3" defaultValue={product?.category_id ?? ""} name="category_id"><option value="">Sin categoría</option>{categories.filter((item) => item.is_active || item.id === product?.category_id).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label className="sm:col-span-2"><span className="text-sm font-semibold">Tipo de venta</span><select className="mt-2 h-11 w-full rounded-xl border bg-surface px-3" disabled={Boolean(product)} onChange={(event) => setSaleUnit(event.target.value as SaleUnit)} value={saleUnit}><option value="unit">Por unidad</option><option value="weight">Por peso (precio por kilo)</option></select><input name="sale_unit" type="hidden" value={saleUnit} /><p className="mt-2 text-xs text-muted">{product ? "El tipo de venta se conserva para proteger las existencias y ventas anteriores." : saleUnit === "weight" ? "Introduce precios y existencias por kilogramo. Al vender puedes indicar gramos o kilos." : "Cada cantidad representa una unidad del producto."}</p></label>
        <label><span className="text-sm font-semibold">Precio de costo{saleUnit === "weight" ? " por kilo" : ""}</span><input className="mt-2 h-11 w-full rounded-xl border bg-surface px-3" defaultValue={product?.cost_price ?? 0} min="0" name="cost_price" step="0.01" type="number" required /></label>
        <label><span className="text-sm font-semibold">Precio de venta{saleUnit === "weight" ? " por kilo" : ""}</span><input className="mt-2 h-11 w-full rounded-xl border bg-surface px-3" defaultValue={product?.sale_price ?? 0} min="0" name="sale_price" step="0.01" type="number" required /></label>
        {useStock ? <>{product && useStockAdjustments ? <input name="stock_quantity" type="hidden" value={displayQuantity(product.stock_quantity, saleUnit)} /> : <label><span className="text-sm font-semibold">Existencia actual{saleUnit === "weight" ? " (kg)" : ""}</span><input className="mt-2 h-11 w-full rounded-xl border bg-surface px-3" defaultValue={displayQuantity(product?.stock_quantity ?? 0, saleUnit)} key={saleUnit} min="0" name="stock_quantity" step={saleUnit === "weight" ? "0.001" : "1"} type="number" required /></label>}
        <label><span className="text-sm font-semibold">Alerta de existencia baja{saleUnit === "weight" ? " (kg)" : ""}</span><input className="mt-2 h-11 w-full rounded-xl border bg-surface px-3" defaultValue={displayQuantity(product?.low_stock_threshold ?? 0, saleUnit)} key={saleUnit} min="0" name="low_stock_threshold" step={saleUnit === "weight" ? "0.001" : "1"} type="number" required /></label></> : <><input name="stock_quantity" type="hidden" value={displayQuantity(product?.stock_quantity ?? 0, saleUnit)} /><input name="low_stock_threshold" type="hidden" value={displayQuantity(product?.low_stock_threshold ?? 0, saleUnit)} /></>}
        <label><span className="text-sm font-semibold">Estado</span><select className="mt-2 h-11 w-full rounded-xl border bg-surface px-3" defaultValue={String(product?.is_active ?? true)} name="is_active"><option value="true">Activo</option><option value="false">Inactivo</option></select></label>
        <label className="sm:col-span-2"><span className="text-sm font-semibold">Descripción</span><textarea className="mt-2 min-h-24 w-full rounded-xl border bg-surface p-3" defaultValue={product?.description ?? ""} name="description" /></label>
      </div>
      {state.error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{state.error}</p>}
      {state.success && <p className="rounded-xl bg-accent px-4 py-3 text-sm text-brand-strong">{state.success}</p>}
      <div className="flex justify-end"><Button disabled={pending} type="submit">{pending ? "Guardando..." : product ? "Guardar cambios" : "Crear producto"}</Button></div>
    </form>
  );
}
