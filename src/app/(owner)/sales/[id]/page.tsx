import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, MessageCircle } from "lucide-react";
import { notFound } from "next/navigation";

import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { invoiceWhatsappUrl } from "@/features/customers/whatsapp";
import { voidSale } from "@/features/sales/actions";
import { getReceiptBusiness, getSale } from "@/features/sales/data";
import { PrintReceiptButton } from "@/features/sales/print-receipt-button";
import { formatMoney } from "@/lib/money";

export default async function SaleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [sale, business] = await Promise.all([getSale(id), getReceiptBusiness()]);
  if (!sale) notFound();

  const saleNumber = `V-${String(sale.sale_number).padStart(6, "0")}`;
  const soldAt = new Intl.DateTimeFormat("es-VE", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: business.timezone,
  }).format(new Date(sale.sold_at));
  const money = (amount: number) => formatMoney(amount, business.currency_code);
  const whatsappUrl = sale.customer_name && sale.customers?.phone
    ? invoiceWhatsappUrl({
        businessName: business.name,
        currency: business.currency_code,
        customerName: sale.customer_name,
        date: soldAt,
        items: (sale.sale_items ?? []).map((item) => ({
          name: item.product_name,
          quantity: item.quantity,
          subtotal: Number(item.subtotal),
        })),
        paymentMethod: sale.payment_method_name,
        phone: sale.customers.phone,
        saleNumber: sale.sale_number,
        total: Number(sale.total),
      })
    : null;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="print:hidden">
        <Link className="inline-flex items-center gap-2 text-sm font-semibold text-brand" href="/sales">
          <ArrowLeft className="size-4" /> Volver a ventas
        </Link>
        <div className="mt-5 flex flex-wrap items-start justify-between gap-4">
          <div><p className="text-sm text-muted">Detalle de venta</p><h2 className="text-2xl font-bold">{saleNumber}</h2></div>
          <div className="flex flex-wrap items-center gap-2">
            {whatsappUrl && (
              <a className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#25D366]/15 px-4 text-sm font-semibold text-[#128C4A] transition hover:bg-[#25D366]/25 dark:text-[#5ee58d]" href={whatsappUrl} rel="noreferrer" target="_blank">
                <MessageCircle className="size-4" /> Enviar por WhatsApp
              </a>
            )}
            <PrintReceiptButton />
            <span className={sale.status === "completed" ? "rounded-full bg-accent px-3 py-1 text-sm font-semibold text-brand" : "rounded-full bg-red-50 px-3 py-1 text-sm font-semibold text-red-700"}>
              {sale.status === "completed" ? "Completada" : "Anulada"}
            </span>
          </div>
        </div>
      </div>

      <article className="receipt mt-7 overflow-hidden rounded-2xl border bg-surface">
        <header className="receipt-header flex flex-col gap-5 border-b p-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            {business.logo_url ? (
              <Image alt={`Logo de ${business.name}`} className="size-16 shrink-0 rounded-2xl object-contain" height={64} src={business.logo_url} unoptimized width={64} />
            ) : (
              <div className="grid size-16 shrink-0 place-items-center rounded-2xl bg-accent text-2xl font-bold text-brand">{business.name.charAt(0).toUpperCase()}</div>
            )}
            <div className="min-w-0">
              <h1 className="truncate text-xl font-bold">{business.name}</h1>
              {business.address && <p className="mt-1 text-sm text-muted">{business.address}</p>}
              {(business.contact_phone || business.contact_email) && <p className="text-sm text-muted">{[business.contact_phone, business.contact_email].filter(Boolean).join(" · ")}</p>}
            </div>
          </div>
          <div className="sm:text-right">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">Comprobante de venta</p>
            <p className="mt-1 text-xl font-bold">{saleNumber}</p>
            <p className="mt-1 text-sm text-muted">{soldAt}</p>
          </div>
        </header>

        <div className="grid gap-4 border-b p-6 sm:grid-cols-2">
          <div><p className="text-xs font-semibold uppercase text-muted">Cliente</p><p className="mt-1 font-semibold">{sale.customer_name ?? "Cliente general"}</p></div>
          <div className="sm:text-right"><p className="text-xs font-semibold uppercase text-muted">Estado</p><p className="mt-1 font-semibold">{sale.status === "completed" ? "Pagada" : "Anulada"}</p></div>
        </div>

        <div className="p-6">
          <table className="w-full text-left text-sm">
            <thead className="border-b text-xs uppercase text-muted">
              <tr><th className="pb-3">Producto</th><th className="pb-3 text-center">Cant.</th><th className="pb-3 text-right">Precio</th><th className="pb-3 text-right">Subtotal</th></tr>
            </thead>
            <tbody className="divide-y">
              {sale.sale_items?.map((item) => (
                <tr key={item.id}>
                  <td className="py-3 pr-2 font-semibold">{item.product_name}{item.product_sku && <span className="block text-xs font-normal text-muted">SKU: {item.product_sku}</span>}</td>
                  <td className="py-3 text-center">{item.quantity}</td>
                  <td className="py-3 text-right">{money(Number(item.unit_price))}</td>
                  <td className="py-3 text-right font-semibold">{money(Number(item.subtotal))}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="ml-auto mt-6 max-w-xs space-y-2 text-sm">
            <div className="flex justify-between gap-6"><span className="text-muted">Subtotal</span><span>{money(Number(sale.subtotal))}</span></div>
            {Number(sale.discount) > 0 && <div className="flex justify-between gap-6"><span className="text-muted">Descuento</span><span>-{money(Number(sale.discount))}</span></div>}
            <div className="flex justify-between gap-6 border-t pt-3 text-lg font-bold"><span>Total</span><span>{money(Number(sale.total))}</span></div>
          </div>

          <div className="mt-7 grid gap-4 rounded-xl bg-background p-4 sm:grid-cols-2">
            <div><p className="text-xs font-semibold uppercase text-muted">Método de pago</p><p className="mt-1 font-semibold">{sale.payment_method_name}</p></div>
            {sale.sale_payments && sale.sale_payments.length > 1 && <div>{sale.sale_payments.map((payment) => <div className="flex justify-between gap-3 text-sm" key={payment.id}><span>{payment.payment_method_name}</span><strong>{money(Number(payment.amount))}</strong></div>)}</div>}
          </div>
          {sale.note && <div className="mt-5"><p className="text-xs font-semibold uppercase text-muted">Nota</p><p className="mt-1 text-sm">{sale.note}</p></div>}
          <p className="mt-8 text-center text-sm text-muted">Gracias por su compra.</p>
        </div>
      </article>

      <section className="mt-5 grid gap-3 rounded-2xl border bg-surface p-5 print:hidden sm:grid-cols-2">
        <div><p className="text-xs text-muted">Costo total</p><p className="font-semibold">{money(Number(sale.total_cost))}</p></div>
        <div><p className="text-xs text-muted">Ganancia bruta</p><p className="font-semibold">{money(Number(sale.gross_profit))}</p></div>
      </section>

      {sale.status === "completed" ? (
        <section className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-5 print:hidden">
          <h3 className="font-bold text-red-800">Anular venta</h3>
          <p className="mt-1 text-sm text-red-700">La operación quedará registrada y, cuando corresponda, restaurará existencias.</p>
          <form action={voidSale.bind(null, sale.id)} className="mt-4 flex flex-col gap-3 sm:flex-row">
            <input className="h-11 flex-1 rounded-xl border border-red-200 bg-white px-3 text-slate-900" minLength={3} name="reason" placeholder="Motivo de anulación" required />
            <ConfirmSubmitButton className="bg-red-700 text-white" confirmMessage="¿Anular esta venta? Esta acción quedará registrada." pendingLabel="Anulando...">Anular venta</ConfirmSubmitButton>
          </form>
        </section>
      ) : (
        <section className="mt-6 rounded-2xl bg-red-50 p-5 text-sm text-red-800 print:hidden"><strong>Motivo:</strong> {sale.void_reason}</section>
      )}
    </div>
  );
}
