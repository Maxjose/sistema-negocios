"use client";

import { useActionState, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, ChevronDown, ChevronUp, Grid2X2, List, Minus, Plus, ShoppingCart, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import type {
  BusinessFeatures,
  PaymentMethod,
  Product,
} from "@/features/catalog/types";
import { confirmSale, type SaleState } from "@/features/sales/actions";
import { formatMoney } from "@/lib/money";
import type { SaleCustomer } from "@/features/customers/types";
import type { CurrencyDisplayConfig } from "@/features/currency/types";
import { CurrencyEquivalents } from "@/features/currency/currency-equivalents";
import { cn } from "@/lib/utils";
import { BarcodeScanner, type BarcodeFeedback } from "@/features/sales/barcode-scanner";
import { findProductByBarcode } from "@/features/sales/barcode";
import { playBarcodeSuccessSound, prepareBarcodeSuccessSound } from "@/features/sales/barcode-sound";

type CartItem = { product: Product; quantity: number };
type Payment = { payment_method_id: string; amount: number };
const initialState: SaleState = {};

export function PosForm({
  products,
  methods,
  features,
  customers,
  currencyConfig,
}: {
  products: Product[];
  methods: PaymentMethod[];
  features: BusinessFeatures;
  customers: SaleCustomer[];
  currencyConfig: CurrencyDisplayConfig;
}) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const cartRef = useRef<CartItem[]>([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const [discount, setDiscount] = useState(0);
  const [payments, setPayments] = useState<Payment[]>([
    { payment_method_id: "", amount: 0 },
  ]);
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [mobileCartOpen, setMobileCartOpen] = useState(false);
  const [catalogView, setCatalogView] = useState<"grid" | "list">("grid");
  const [saleType, setSaleType] = useState<"cash" | "credit">("cash");
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [barcodeFeedback, setBarcodeFeedback] = useState<BarcodeFeedback | null>(null);
  const [state, action, pending] = useActionState(confirmSale, initialState);
  const visible = products.filter(
    (product) =>
      product.is_active &&
      (!features.use_stock || product.stock_quantity > 0) &&
      (!category || product.categories?.name === category) &&
      (!query ||
        product.name.toLowerCase().includes(query.toLowerCase()) ||
        product.sku?.toLowerCase().includes(query.toLowerCase())),
  );
  const subtotal = useMemo(
    () =>
      cart.reduce(
        (sum, item) =>
          sum + Number(item.product.sale_price) * item.quantity,
        0,
      ),
    [cart],
  );
  const total = Math.max(0, subtotal - discount);
  const paymentTotal = payments.reduce(
    (sum, payment) => sum + payment.amount,
    0,
  );
  const categories = [...new Set(products.map((product) => product.categories?.name).filter(Boolean))] as string[];
  const selectedCustomer = customers.find((customer) => customer.id === selectedCustomerId);
  useEffect(() => {
    cartRef.current = cart;
  }, [cart]);
  useEffect(() => {
    const focusSearch = (event: KeyboardEvent) => {
      if (event.key === "/" && document.activeElement?.tagName !== "INPUT") {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", focusSearch);
    return () => window.removeEventListener("keydown", focusSearch);
  }, []);
  const setQuantity = (product: Product, quantity: number) => {
    if (quantity <= 0) {
      setCart((items) => items.filter((item) => item.product.id !== product.id));
      return;
    }
    if (features.use_stock && quantity > product.stock_quantity) return;
    setCart((items) =>
      items.some((item) => item.product.id === product.id)
        ? items.map((item) =>
            item.product.id === product.id ? { ...item, quantity } : item,
          )
        : [...items, { product, quantity }],
    );
  };
  const addProductByBarcode = useCallback((code: string) => {
    const product = findProductByBarcode(products, code);
    if (!product || !product.is_active) {
      setBarcodeFeedback({ kind: "error", message: `No hay un producto activo con el código ${code.trim()}.` });
      return false;
    }

    const items = cartRef.current;
    const current = items.find((item) => item.product.id === product.id)?.quantity ?? 0;
    if (features.use_stock && current >= product.stock_quantity) {
      setBarcodeFeedback({ kind: "error", message: `${product.name} no tiene más unidades disponibles.` });
      return false;
    }

    const nextItems = items.some((item) => item.product.id === product.id)
      ? items.map((item) => item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item)
      : [...items, { product, quantity: 1 }];
    cartRef.current = nextItems;
    setCart(nextItems);
    setBarcodeFeedback({ kind: "success", message: `${product.name} agregado al carrito.` });
    void playBarcodeSuccessSound();
    return true;
  }, [features.use_stock, products]);

  return (
    <form action={action} className="grid gap-6 xl:grid-cols-[1fr_24rem]">
      <section className="pb-20 xl:pb-0">
        <div className="flex items-center gap-2">
          <input
            className="h-12 min-w-0 flex-1 rounded-xl border bg-surface px-4"
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && features.enable_barcode_scanner && findProductByBarcode(products, query)) {
                event.preventDefault();
                addProductByBarcode(query);
                setQuery("");
              }
            }}
            placeholder="Buscar producto por nombre, SKU o código"
            ref={searchRef}
            value={query}
          />
          {features.enable_barcode_scanner && (
            <BarcodeScanner
              buttonClassName="border-brand bg-brand text-white hover:bg-brand-strong hover:text-white"
              buttonLabel="Escanear código de producto"
              feedback={barcodeFeedback}
              onOpen={prepareBarcodeSuccessSound}
              onScan={addProductByBarcode}
            />
          )}
        </div>
        <div className="mt-3 flex items-center gap-2">
          <div className="flex min-w-0 flex-1 gap-2 overflow-x-auto pb-1">
            <button className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${!category ? "bg-brand text-white" : "border bg-surface"}`} onClick={() => setCategory("")} type="button">Todos</button>
            {categories.map((name) => <button className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${category === name ? "bg-brand text-white" : "border bg-surface"}`} key={name} onClick={() => setCategory(name)} type="button">{name}</button>)}
          </div>
          <div aria-label="Vista del catálogo" className="flex shrink-0 rounded-xl border bg-surface p-1" role="group">
            <button aria-label="Ver productos en cuadrícula" aria-pressed={catalogView === "grid"} className={cn("grid size-8 place-items-center rounded-lg text-muted transition", catalogView === "grid" && "bg-accent text-brand-strong")} onClick={() => setCatalogView("grid")} type="button"><Grid2X2 className="size-4" /></button>
            <button aria-label="Ver productos como lista" aria-pressed={catalogView === "list"} className={cn("grid size-8 place-items-center rounded-lg text-muted transition", catalogView === "list" && "bg-accent text-brand-strong")} onClick={() => setCatalogView("list")} type="button"><List className="size-4" /></button>
          </div>
        </div>
        <div className={cn("mt-4 grid gap-3", catalogView === "grid" ? "grid-cols-2 sm:grid-cols-2 lg:grid-cols-3" : "grid-cols-1")}>
          {visible.map((product) => {
            const item = cart.find((entry) => entry.product.id === product.id);
            return (
              <button
                className={cn("min-w-0 rounded-2xl border bg-surface text-left transition hover:border-brand", catalogView === "grid" ? "p-3 sm:p-4" : "flex items-center justify-between gap-4 p-4")}
                key={product.id}
                onClick={() => setQuantity(product, (item?.quantity ?? 0) + 1)}
                type="button"
              >
                <span className="min-w-0">
                  <span className="block truncate font-semibold">{product.name}</span>
                  {features.use_stock && <span className="mt-1 block text-xs text-muted">{product.stock_quantity} disponibles</span>}
                </span>
                <span className={cn("block", catalogView === "grid" ? "mt-4" : "shrink-0 text-right")}>
                  <span className="block text-lg font-bold text-brand">{formatMoney(Number(product.sale_price), currencyConfig.baseCurrency)}</span>
                  <CurrencyEquivalents amount={Number(product.sale_price)} className={cn("mt-1", catalogView === "list" && "justify-end")} config={currencyConfig} />
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {mobileCartOpen && <button aria-label="Minimizar carrito" className="fixed inset-0 z-20 bg-black/35 backdrop-blur-[1px] xl:hidden" onClick={() => setMobileCartOpen(false)} type="button" />}
      <aside className={cn("fixed inset-x-3 bottom-[calc(4.5rem_+_env(safe-area-inset-bottom))] z-40 rounded-2xl border bg-surface shadow-2xl transition-[max-height] xl:sticky xl:inset-x-auto xl:bottom-auto xl:top-20 xl:z-auto xl:h-fit xl:max-h-none xl:overflow-visible xl:p-5 xl:shadow-none", mobileCartOpen ? "max-h-[calc(100dvh_-_11rem_-_env(safe-area-inset-bottom))] overflow-y-auto overscroll-contain p-5" : "max-h-16 overflow-hidden p-0")}>
        <button aria-expanded={mobileCartOpen} className="flex h-16 w-full items-center gap-3 px-4 text-left xl:hidden" onClick={() => setMobileCartOpen((open) => !open)} type="button">
          <span className="relative grid size-10 shrink-0 place-items-center rounded-xl bg-accent text-brand-strong"><ShoppingCart className="size-5" />{cart.length > 0 && <span className="absolute -right-1.5 -top-1.5 grid min-w-5 place-items-center rounded-full bg-brand px-1 text-[0.65rem] font-bold leading-5 text-white">{cart.reduce((sum, item) => sum + item.quantity, 0)}</span>}</span>
          <span className="min-w-0 flex-1"><span className="block text-sm font-bold">{cart.length === 0 ? "Carrito vacío" : "Venta actual"}</span><span className="block truncate text-xs text-muted">{cart.length === 0 ? "Toca para ver el carrito" : `${formatMoney(total, currencyConfig.baseCurrency)} · ${cart.length} ${cart.length === 1 ? "producto" : "productos"}`}</span></span>
          <span className="flex items-center gap-1 text-xs font-semibold text-brand">{mobileCartOpen ? <><span>Cerrar</span><ChevronDown className="size-4" /></> : <><span>Ver</span><ChevronUp className="size-4" /></>}</span>
        </button>
        <div className={cn(!mobileCartOpen && "hidden xl:block")}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ShoppingCart className="size-5 text-brand" />
            <h2 className="font-bold">Venta actual</h2>
          </div>
          <div className="flex items-center gap-1">{cart.length > 0 && (
            <button
              className="min-h-9 rounded-lg px-2 text-xs font-semibold text-red-700 transition hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
              onClick={() => setShowClearDialog(true)}
              type="button"
            >
              Limpiar
            </button>
          )}</div>
        </div>
        <div className="mt-4 space-y-3">
          {cart.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted">
              Selecciona productos para comenzar.
            </p>
          ) : (
            cart.map(({ product, quantity }) => (
              <div className="rounded-xl bg-background p-3" key={product.id}>
                <div className="flex justify-between gap-2">
                  <p className="text-sm font-semibold">{product.name}</p>
                  <button
                    aria-label={`Quitar ${product.name}`}
                    onClick={() => setQuantity(product, 0)}
                    type="button"
                  >
                    <Trash2 className="size-4 text-red-600" />
                  </button>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      className="grid size-8 place-items-center rounded-lg border"
                      onClick={() => setQuantity(product, quantity - 1)}
                      type="button"
                    >
                      <Minus className="size-3" />
                    </button>
                    <span className="w-6 text-center text-sm font-bold">
                      {quantity}
                    </span>
                    <button
                      className="grid size-8 place-items-center rounded-lg border"
                      onClick={() => setQuantity(product, quantity + 1)}
                      type="button"
                    >
                      <Plus className="size-3" />
                    </button>
                  </div>
                  <span className="text-right"><span className="block text-sm font-semibold">{formatMoney(Number(product.sale_price) * quantity, currencyConfig.baseCurrency)}</span><CurrencyEquivalents amount={Number(product.sale_price) * quantity} className="justify-end" config={currencyConfig} /></span>
                </div>
              </div>
            ))
          )}
        </div>
        <input
          name="items"
          type="hidden"
          value={JSON.stringify(
            cart.map((item) => ({
              product_id: item.product.id,
              quantity: item.quantity,
            })),
          )}
        />
        {features.enable_credits && (
          <div className="mt-5 grid grid-cols-2 rounded-xl bg-background p-1">
            <button className={`min-h-10 rounded-lg text-sm font-semibold ${saleType === "cash" ? "bg-surface shadow-sm" : "text-muted"}`} onClick={() => setSaleType("cash")} type="button">Contado</button>
            <button className={`min-h-10 rounded-lg text-sm font-semibold ${saleType === "credit" ? "bg-surface shadow-sm" : "text-muted"}`} onClick={() => setSaleType("credit")} type="button">Crédito</button>
          </div>
        )}
        <input name="sale_type" type="hidden" value={saleType} />
        {saleType === "credit" && <div className="mt-4 grid gap-3"><label className="grid gap-1.5 text-sm font-semibold">Cliente<select className="h-11 rounded-xl border bg-surface px-3 text-foreground" name="customer_id" onChange={(event) => setSelectedCustomerId(event.target.value)} required value={selectedCustomerId}><option value="">Selecciona</option>{customers.filter((customer) => customer.is_active).map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}</select></label><label className="grid gap-1.5 text-sm font-semibold">Fecha de vencimiento<input className="h-11 rounded-xl border px-3" min={new Date().toISOString().slice(0, 10)} name="due_date" required type="date" /></label></div>}
        {saleType === "cash" && <>{features.enable_customers ? <label className="mt-4 grid gap-1.5 text-sm font-semibold">Cliente <span className="font-normal text-muted">(opcional)</span><select className="h-11 rounded-xl border bg-surface px-3 text-foreground" name="customer_id" onChange={(event) => setSelectedCustomerId(event.target.value)} value={selectedCustomerId}><option value="">Venta sin cliente</option>{customers.filter((customer) => customer.is_active).map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}</select></label> : <input name="customer_id" type="hidden" value="" />}<input name="due_date" type="hidden" value="" /></>}
        {selectedCustomer && selectedCustomer.overdue_count > 0 && <div aria-live="polite" className="mt-4 flex gap-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-amber-950 dark:border-amber-700/70 dark:bg-amber-950/40 dark:text-amber-100" role="alert"><AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-600 dark:text-amber-400" /><div><p className="text-sm font-bold">Cliente con cuenta vencida</p><p className="mt-1 text-xs leading-5">{selectedCustomer.name} tiene {selectedCustomer.overdue_count} {selectedCustomer.overdue_count === 1 ? "cuenta vencida" : "cuentas vencidas"} por {formatMoney(selectedCustomer.overdue_balance, currencyConfig.baseCurrency)}. Tenlo presente antes de confirmar la venta.</p></div></div>}
        {saleType === "cash" && <>
        <label className="mt-5 block text-sm font-semibold">
          Método de pago
          <select
            className="mt-2 h-11 w-full rounded-xl border bg-surface px-3 text-foreground"
            onChange={(event) =>
              setPayments((current) => [
                { ...current[0], payment_method_id: event.target.value },
                ...current.slice(1),
              ])
            }
            required
          >
            <option value="">Selecciona</option>
            {methods
              .filter((method) => method.is_active)
              .map((method) => (
                <option key={method.id} value={method.id}>
                  {method.name}
                </option>
              ))}
          </select>
        </label>
        {payments.length > 1 && (
          <input
            className="mt-2 h-11 w-full rounded-xl border px-3"
            min="0.01"
            onChange={(event) =>
              setPayments((current) =>
                current.map((payment, index) =>
                  index === 0
                    ? { ...payment, amount: Number(event.target.value) }
                    : payment,
                ),
              )
            }
            placeholder="Monto del primer método"
            step="0.01"
            type="number"
            value={payments[0].amount || ""}
          />
        )}
        {payments.slice(1).map((payment, offset) => {
          const index = offset + 1;
          return (
            <div className="mt-2 grid grid-cols-[1fr_7rem_auto] gap-2" key={index}>
              <select
                className="h-11 rounded-xl border bg-surface px-3 text-foreground"
                onChange={(event) =>
                  setPayments((current) =>
                    current.map((entry, position) =>
                      position === index
                        ? { ...entry, payment_method_id: event.target.value }
                        : entry,
                    ),
                  )
                }
                required
                value={payment.payment_method_id}
              >
                <option value="">Selecciona</option>
                {methods.filter((method) => method.is_active && !payments.some((entry, position) => position !== index && entry.payment_method_id === method.id)).map((method) => <option key={method.id} value={method.id}>{method.name}</option>)}
              </select>
              <input className="h-11 rounded-xl border px-3" min="0.01" onChange={(event) => setPayments((current) => current.map((entry, position) => position === index ? { ...entry, amount: Number(event.target.value) } : entry))} placeholder="Monto" required step="0.01" type="number" value={payment.amount || ""} />
              <button aria-label="Quitar pago" className="px-2 text-red-600" onClick={() => setPayments((current) => current.filter((_, position) => position !== index))} type="button"><Trash2 className="size-4" /></button>
            </div>
          );
        })}
        {payments.length < Math.min(5, methods.filter((method) => method.is_active).length) && (
          <button className="mt-2 text-sm font-semibold text-brand" onClick={() => setPayments((current) => [...current.map((payment, index) => index === 0 && current.length === 1 ? { ...payment, amount: total } : payment), { payment_method_id: "", amount: 0 }])} type="button">
            + Combinar otro método
          </button>
        )}
        <input
          name="payments"
          type="hidden"
          value={JSON.stringify(
            payments.map((payment) => ({
              ...payment,
              amount: payments.length === 1 ? total : payment.amount,
            })),
          )}
        />
        </>}
        {features.allow_discounts ? (
          <label className="mt-4 block text-sm font-semibold">
            Descuento
            <input
              className="mt-2 h-11 w-full rounded-xl border px-3"
              max={subtotal}
              min="0"
              name="discount"
              onChange={(event) => setDiscount(Number(event.target.value))}
              step="0.01"
              type="number"
              value={discount}
            />
          </label>
        ) : (
          <input name="discount" type="hidden" value="0" />
        )}
        {features.allow_sale_notes ? (
          <label className="mt-4 block text-sm font-semibold">
            Nota
            <textarea
              className="mt-2 min-h-20 w-full rounded-xl border p-3"
              maxLength={500}
              name="note"
            />
          </label>
        ) : (
          <input name="note" type="hidden" value="" />
        )}
        <div className="mt-5 space-y-2 border-t pt-4 text-sm">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>{formatMoney(subtotal, currencyConfig.baseCurrency)}</span>
          </div>
          <div className="flex justify-between text-lg font-bold">
            <span>Total</span>
            <span>{formatMoney(total, currencyConfig.baseCurrency)}</span>
          </div>
          <CurrencyEquivalents amount={total} className="justify-end text-right" config={currencyConfig} />
          {payments.length > 1 && (
            <div className="flex justify-between text-xs">
              <span>Por asignar</span>
              <span className={Math.abs(total - paymentTotal) < 0.005 ? "text-brand" : "text-red-600"}>
                {formatMoney(total - paymentTotal, currencyConfig.baseCurrency)}
              </span>
            </div>
          )}
        </div>
        {state.error && (
          <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">
            {state.error}
          </p>
        )}
        <Button
          className="mt-5 h-12 w-full"
          disabled={
            pending ||
            cart.length === 0 ||
            discount > subtotal ||
            (saleType === "cash" && !payments[0]?.payment_method_id) ||
            (saleType === "cash" && payments.some((payment) => !payment.payment_method_id)) ||
            (saleType === "cash" && payments.length > 1 &&
              Math.abs(total - paymentTotal) >= 0.005)
          }
          type="submit"
        >
          {pending ? "Confirmando..." : "Confirmar venta"}
        </Button>
        </div>
      </aside>
      {showClearDialog && (
        <div aria-labelledby="clear-cart-title" aria-modal="true" className="fixed inset-0 z-50 grid place-items-center bg-black/55 p-4 backdrop-blur-sm" role="dialog">
          <div className="w-full max-w-sm rounded-3xl border bg-surface p-6 shadow-2xl">
            <h3 className="text-lg font-bold" id="clear-cart-title">¿Limpiar el carrito?</h3>
            <p className="mt-2 text-sm leading-6 text-muted">Se eliminarán todos los productos, el descuento y los métodos de pago de esta venta.</p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <button className="min-h-11 rounded-xl border bg-surface text-sm font-semibold" onClick={() => setShowClearDialog(false)} type="button">Cancelar</button>
              <button className="min-h-11 rounded-xl bg-red-700 text-sm font-semibold text-white hover:bg-red-800" onClick={() => {
                setCart([]);
                setDiscount(0);
                setPayments([{ payment_method_id: "", amount: 0 }]);
                setShowClearDialog(false);
              }} type="button">Limpiar carrito</button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
