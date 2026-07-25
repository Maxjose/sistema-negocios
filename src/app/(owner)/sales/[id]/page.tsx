import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";

import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { voidSale } from "@/features/sales/actions";
import { getSale } from "@/features/sales/data";
import { formatMoney } from "@/lib/money";

export default async function SaleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const sale = await getSale(id);
  if (!sale) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <Link className="inline-flex items-center gap-2 text-sm font-semibold text-brand" href="/sales">
        <ArrowLeft className="size-4" /> Volver a ventas
      </Link>
      <div className="mt-5 flex items-start justify-between">
        <div>
          <p className="text-sm text-muted">Detalle de venta</p>
          <h2 className="text-2xl font-bold">
            V-{String(sale.sale_number).padStart(6, "0")}
          </h2>
        </div>
        <span className={sale.status === "completed" ? "rounded-full bg-accent px-3 py-1 text-sm font-semibold text-brand" : "rounded-full bg-red-50 px-3 py-1 text-sm font-semibold text-red-700"}>
          {sale.status === "completed" ? "Completada" : "Anulada"}
        </span>
      </div>

      <section className="mt-7 rounded-2xl border bg-surface p-5">
        <div className="grid gap-3 sm:grid-cols-3">
          <div><p className="text-xs text-muted">Método</p><p className="font-semibold">{sale.payment_method_name}</p></div>
          <div><p className="text-xs text-muted">Total</p><p className="font-semibold">{formatMoney(Number(sale.total))}</p></div>
          <div><p className="text-xs text-muted">Ganancia bruta</p><p className="font-semibold">{formatMoney(Number(sale.gross_profit))}</p></div>
        </div>
        <div className="mt-6 space-y-3 sm:hidden">
          {sale.sale_items?.map((item) => (
            <article className="rounded-xl bg-background p-4" key={item.id}>
              <p className="font-semibold">{item.product_name}</p>
              <div className="mt-2 flex justify-between text-sm text-muted">
                <span>{item.quantity} × {formatMoney(Number(item.unit_price))}</span>
                <strong className="text-foreground">{formatMoney(Number(item.subtotal))}</strong>
              </div>
            </article>
          ))}
        </div>
        <div className="mt-6 hidden overflow-x-auto sm:block">
          <table className="w-full text-left text-sm">
            <thead className="border-b text-xs uppercase text-muted"><tr><th className="py-3">Producto</th><th>Cantidad</th><th>Precio</th><th className="text-right">Subtotal</th></tr></thead>
            <tbody className="divide-y">
              {sale.sale_items?.map((item) => (
                <tr key={item.id}><td className="py-3 font-semibold">{item.product_name}</td><td>{item.quantity}</td><td>{formatMoney(Number(item.unit_price))}</td><td className="text-right">{formatMoney(Number(item.subtotal))}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {sale.status === "completed" ? (
        <section className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-5">
          <h3 className="font-bold text-red-800">Anular venta</h3>
          <p className="mt-1 text-sm text-red-700">La operación quedará registrada y, cuando corresponda, restaurará existencias.</p>
          <form action={voidSale.bind(null, sale.id)} className="mt-4 flex flex-col gap-3 sm:flex-row">
            <input className="h-11 flex-1 rounded-xl border border-red-200 px-3" minLength={3} name="reason" placeholder="Motivo de anulación" required />
            <ConfirmSubmitButton className="bg-red-700 text-white" confirmMessage="¿Anular esta venta? Esta acción quedará registrada." pendingLabel="Anulando...">
              Anular venta
            </ConfirmSubmitButton>
          </form>
        </section>
      ) : (
        <section className="mt-6 rounded-2xl bg-red-50 p-5 text-sm text-red-800">
          <strong>Motivo:</strong> {sale.void_reason}
        </section>
      )}
    </div>
  );
}
