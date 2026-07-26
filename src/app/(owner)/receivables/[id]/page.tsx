import Link from "next/link";
import { ArrowLeft, MessageCircle } from "lucide-react";
import { notFound } from "next/navigation";
import { getBusinessCurrency, getPaymentMethods } from "@/features/catalog/data";
import { getReceivable } from "@/features/customers/data";
import { PaymentForm } from "@/features/customers/receivable-forms";
import { debtWhatsappUrl } from "@/features/customers/whatsapp";

const money = new Intl.NumberFormat("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default async function ReceivableDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [detail, methods, currency] = await Promise.all([getReceivable(id), getPaymentMethods(), getBusinessCurrency()]);
  if (!detail) notFound();
  const { receivable, payments } = detail;
  const paid = Number(receivable.original_amount) - Number(receivable.balance);
  const whatsappUrl = receivable.status === "open" && receivable.customers?.phone ? debtWhatsappUrl({ balance: Number(receivable.balance), currency, customerName: receivable.customers.name, description: receivable.description, dueDate: receivable.due_date, phone: receivable.customers.phone }) : null;
  return <div className="mx-auto max-w-5xl"><Link className="inline-flex items-center gap-2 text-sm font-semibold text-brand" href="/receivables"><ArrowLeft className="size-4" /> Volver</Link>
    <div className="mt-5 flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-semibold text-brand">{receivable.customers?.name}</p><h2 className="text-2xl font-bold">{receivable.description}</h2></div>{whatsappUrl && <a className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#25D366]/15 px-4 text-sm font-semibold text-[#128C4A] transition hover:bg-[#25D366]/25 dark:text-[#5ee58d]" href={whatsappUrl} rel="noreferrer" target="_blank"><MessageCircle className="size-5" /> Enviar recordatorio</a>}</div>
    <div className="mt-6 grid gap-4 sm:grid-cols-3"><div className="rounded-2xl border bg-surface p-5"><p className="text-sm text-muted">Monto original</p><p className="mt-2 text-xl font-bold">{money.format(Number(receivable.original_amount))}</p></div><div className="rounded-2xl border bg-surface p-5"><p className="text-sm text-muted">Abonado</p><p className="mt-2 text-xl font-bold text-emerald-600">{money.format(paid)}</p></div><div className="rounded-2xl border bg-surface p-5"><p className="text-sm text-muted">Saldo</p><p className="mt-2 text-xl font-bold">{money.format(Number(receivable.balance))}</p></div></div>
    <div className="mt-6 grid items-start gap-6 lg:grid-cols-[1fr_20rem]"><section className="overflow-hidden rounded-2xl border bg-surface"><div className="border-b px-5 py-4"><h3 className="font-bold">Historial de abonos</h3></div>{payments.length === 0 ? <p className="p-5 text-sm text-muted">Aún no se han registrado abonos.</p> : <div className="divide-y">{payments.map((payment) => <div className="flex justify-between gap-4 p-5" key={payment.id}><div><p className="font-semibold">{payment.payment_method_name}</p><p className="text-xs text-muted">{new Intl.DateTimeFormat("es-VE", { dateStyle: "medium", timeStyle: "short" }).format(new Date(payment.paid_at))}{payment.note ? ` · ${payment.note}` : ""}</p></div><p className="font-bold text-emerald-600">+{money.format(Number(payment.amount))}</p></div>)}</div>}</section>{receivable.status === "open" && <aside className="rounded-2xl border bg-surface p-5"><h3 className="mb-4 font-bold">Registrar abono</h3><PaymentForm balance={Number(receivable.balance)} id={id} methods={methods} /></aside>}</div>
  </div>;
}
