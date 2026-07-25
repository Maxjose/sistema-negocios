import { Boxes, CircleDollarSign, ReceiptText, ShoppingBasket, TrendingUp, Trophy, WalletCards } from "lucide-react";
import { formatMoney } from "@/lib/money";
import type { BusinessReport } from "@/features/reports/types";

function change(current: number, previous: number) {
  if (previous === 0) return current === 0 ? 0 : 100;
  return ((current - previous) / Math.abs(previous)) * 100;
}

export function ReportView({ report, previous, detailed = false, useStock = true }: { report: BusinessReport; previous: BusinessReport; detailed?: boolean; useStock?: boolean }) {
  const currency = report.currency;
  const margin = Number(report.summary.total_sales) > 0 ? Number(report.summary.gross_profit) / Number(report.summary.total_sales) * 100 : 0;
  const cards = [
    { label: "Total vendido", value: formatMoney(Number(report.summary.total_sales), currency), delta: change(Number(report.summary.total_sales), Number(previous.summary.total_sales)), icon: CircleDollarSign },
    { label: "Ganancia bruta", value: formatMoney(Number(report.summary.gross_profit), currency), delta: change(Number(report.summary.gross_profit), Number(previous.summary.gross_profit)), icon: TrendingUp },
    { label: "Ventas", value: String(report.summary.sale_count), delta: change(report.summary.sale_count, previous.summary.sale_count), icon: ReceiptText },
    { label: "Ticket promedio", value: formatMoney(Number(report.summary.average_ticket), currency), delta: change(Number(report.summary.average_ticket), Number(previous.summary.average_ticket)), icon: WalletCards },
    { label: "Unidades vendidas", value: String(report.summary.units_sold), delta: change(report.summary.units_sold, previous.summary.units_sold), icon: ShoppingBasket },
    { label: "Margen bruto", value: `${margin.toFixed(1)}%`, icon: TrendingUp },
    { label: "Producto más vendido", value: report.top_products[0]?.product_name ?? "Sin ventas", icon: Trophy },
    ...(useStock ? [{ label: "Stock bajo", value: String(report.inventory.low_stock), icon: Boxes }] : []),
  ];
  const maxDaily = Math.max(1, ...report.daily.map((item) => Number(item.sales)));
  const paymentTotal = Math.max(1, ...report.payment_methods.map((item) => Number(item.total)));
  return <div><section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{cards.map(({ label, value, delta, icon: Icon }) => <article className="rounded-2xl border bg-surface p-5" key={label}><Icon className="size-5 text-brand" /><p className="mt-4 text-sm text-muted">{label}</p><div className="mt-1 flex items-end justify-between gap-2"><p className="text-2xl font-bold">{value}</p>{delta !== undefined && <span className={delta >= 0 ? "text-xs font-semibold text-brand" : "text-xs font-semibold text-red-700"}>{delta >= 0 ? "+" : ""}{delta.toFixed(0)}%</span>}</div></article>)}</section>
    <div className="mt-6 grid gap-6 xl:grid-cols-[1.5fr_1fr]"><section className="rounded-2xl border bg-surface p-5"><h3 className="font-bold">Evolución de ventas</h3>{report.daily.length === 0 ? <p className="py-16 text-center text-sm text-muted">No hay ventas en el periodo.</p> : <div className="mt-6 flex h-48 items-end gap-2">{report.daily.map((item) => <div className="group flex min-w-0 flex-1 flex-col items-center gap-2" key={item.date}><span className="text-[0.65rem] font-semibold opacity-0 group-hover:opacity-100">{formatMoney(Number(item.sales), currency)}</span><div className="w-full rounded-t-md bg-brand" style={{ height: `${Math.max(4, Number(item.sales) / maxDaily * 150)}px` }} /><span className="text-[0.6rem] text-muted">{item.date.slice(5)}</span></div>)}</div>}</section>
      <section className="rounded-2xl border bg-surface p-5"><h3 className="font-bold">Métodos de pago</h3><div className="mt-5 space-y-4">{report.payment_methods.map((item) => <div key={item.name}><div className="flex justify-between text-sm"><span>{item.name}</span><strong>{formatMoney(Number(item.total), currency)}</strong></div><div className="mt-2 h-2 rounded-full bg-background"><div className="h-full rounded-full bg-brand" style={{ width: `${Number(item.total) / paymentTotal * 100}%` }} /></div></div>)}{report.payment_methods.length === 0 && <p className="py-12 text-center text-sm text-muted">Sin datos</p>}</div></section></div>
    {detailed && <div className={`mt-6 grid gap-6 ${useStock ? "xl:grid-cols-2" : ""}`}><section className="rounded-2xl border bg-surface p-5"><h3 className="font-bold">Productos con más ventas</h3><ol className="mt-4 divide-y">{report.top_products.map((item, index) => <li className="flex items-center justify-between py-3" key={item.product_name}><div className="flex items-center gap-3"><span className="grid size-7 place-items-center rounded-full bg-accent text-xs font-bold text-brand">{index + 1}</span><div><p className="text-sm font-semibold">{item.product_name}</p><p className="text-xs text-muted">{item.units} unidades</p></div></div><strong className="text-sm">{formatMoney(Number(item.revenue), currency)}</strong></li>)}</ol></section>{useStock && <section className="rounded-2xl border bg-surface p-5"><h3 className="font-bold">Inventario actual</h3><dl className="mt-5 grid grid-cols-2 gap-4"><div className="rounded-xl bg-background p-4"><dt className="text-xs text-muted">Productos</dt><dd className="mt-1 text-xl font-bold">{report.inventory.product_count}</dd></div><div className="rounded-xl bg-background p-4"><dt className="text-xs text-muted">Agotados</dt><dd className="mt-1 text-xl font-bold">{report.inventory.out_of_stock}</dd></div><div className="rounded-xl bg-background p-4"><dt className="text-xs text-muted">Costo vendido</dt><dd className="mt-1 text-lg font-bold">{formatMoney(Number(report.summary.total_cost), currency)}</dd></div><div className="rounded-xl bg-background p-4"><dt className="text-xs text-muted">Valor inventario</dt><dd className="mt-1 text-lg font-bold">{formatMoney(Number(report.inventory.cost_value), currency)}</dd></div></dl></section>}</div>}
  </div>;
}
