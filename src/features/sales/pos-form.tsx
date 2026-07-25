"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { Minus, Plus, ShoppingCart, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import type {
  BusinessFeatures,
  PaymentMethod,
  Product,
} from "@/features/catalog/types";
import { confirmSale, type SaleState } from "@/features/sales/actions";
import { formatMoney } from "@/lib/money";

type CartItem = { product: Product; quantity: number };
type Payment = { payment_method_id: string; amount: number };
const initialState: SaleState = {};

export function PosForm({
  products,
  methods,
  features,
}: {
  products: Product[];
  methods: PaymentMethod[];
  features: BusinessFeatures;
}) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const [discount, setDiscount] = useState(0);
  const [payments, setPayments] = useState<Payment[]>([
    { payment_method_id: "", amount: 0 },
  ]);
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

  return (
    <form action={action} className="grid gap-6 xl:grid-cols-[1fr_24rem]">
      <section>
        <input
          className="h-12 w-full rounded-xl border bg-surface px-4"
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar producto por nombre o SKU"
          ref={searchRef}
          value={query}
        />
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          <button className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${!category ? "bg-brand text-white" : "border bg-surface"}`} onClick={() => setCategory("")} type="button">Todos</button>
          {categories.map((name) => <button className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${category === name ? "bg-brand text-white" : "border bg-surface"}`} key={name} onClick={() => setCategory(name)} type="button">{name}</button>)}
          <span className="ml-auto hidden shrink-0 self-center text-xs text-muted sm:block">Presiona / para buscar</span>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((product) => {
            const item = cart.find((entry) => entry.product.id === product.id);
            return (
              <button
                className="rounded-2xl border bg-surface p-4 text-left transition hover:border-brand"
                key={product.id}
                onClick={() => setQuantity(product, (item?.quantity ?? 0) + 1)}
                type="button"
              >
                <p className="font-semibold">{product.name}</p>
                {features.use_stock && (
                  <p className="mt-1 text-xs text-muted">
                    {product.stock_quantity} disponibles
                  </p>
                )}
                <p className="mt-4 text-lg font-bold text-brand">
                  {formatMoney(Number(product.sale_price))}
                </p>
              </button>
            );
          })}
        </div>
      </section>

      <aside className="h-fit rounded-2xl border bg-surface p-5 xl:sticky xl:top-20">
        <div className="flex items-center gap-2">
          <ShoppingCart className="size-5 text-brand" />
          <h2 className="font-bold">Venta actual</h2>
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
                  <span className="text-sm font-semibold">
                    {formatMoney(Number(product.sale_price) * quantity)}
                  </span>
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
        <label className="mt-5 block text-sm font-semibold">
          Método de pago
          <select
            className="mt-2 h-11 w-full rounded-xl border px-3"
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
                className="h-11 rounded-xl border px-3"
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
            <span>{formatMoney(subtotal)}</span>
          </div>
          <div className="flex justify-between text-lg font-bold">
            <span>Total</span>
            <span>{formatMoney(total)}</span>
          </div>
          {payments.length > 1 && (
            <div className="flex justify-between text-xs">
              <span>Por asignar</span>
              <span className={Math.abs(total - paymentTotal) < 0.005 ? "text-brand" : "text-red-600"}>
                {formatMoney(total - paymentTotal)}
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
            !payments[0]?.payment_method_id ||
            payments.some((payment) => !payment.payment_method_id) ||
            (payments.length > 1 &&
              Math.abs(total - paymentTotal) >= 0.005)
          }
          type="submit"
        >
          {pending ? "Confirmando..." : "Confirmar venta"}
        </Button>
      </aside>
    </form>
  );
}
