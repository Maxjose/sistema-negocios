import Link from "next/link";
import { Plus, ReceiptText, ShoppingBag, WalletCards } from "lucide-react";
import { CsvDownloadButton } from "@/components/ui/csv-download-button";
import { resolveSalesPeriod } from "@/features/reports/period";
import { getSales, getSalesBusinessContext } from "@/features/sales/data";
import { SalesFilter } from "@/features/sales/sales-filter";
import { formatMoney } from "@/lib/money";

type SearchParams = {
  period?: string;
  from?: string;
  to?: string;
  status?: string;
};

export default async function SalesPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const filters = await searchParams;
  const business = await getSalesBusinessContext();
  const range = resolveSalesPeriod(filters, business.timezone);
  const allPeriodSales = await getSales(range.from, range.to, business.timezone);
  const status = ["completed", "voided"].includes(filters.status ?? "") ? filters.status : undefined;
  const sales = status ? allPeriodSales.filter((sale) => sale.status === status) : allPeriodSales;
  const completedSales = allPeriodSales.filter((sale) => sale.status === "completed");
  const totalSold = completedSales.reduce((total, sale) => total + Number(sale.total), 0);
  const averageTicket = completedSales.length ? totalSold / completedSales.length : 0;
  const money = (amount: number) => formatMoney(amount, business.currency_code);
  const dateFormatter = new Intl.DateTimeFormat("es-VE", {
    dateStyle: "short", timeStyle: "short", timeZone: business.timezone,
  });

  return (
    <div>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm text-muted">Consulta y filtra las operaciones registradas</p>
          <h2 className="mt-1 text-2xl font-bold">Ventas</h2>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          <CsvDownloadButton
            filename={`ventas-${range.from}-${range.to}.csv`}
            headers={["venta", "fecha", "metodo_pago", "total", "costo", "ganancia", "estado"]}
            label="Exportar"
            rows={sales.map((sale) => [sale.sale_number, sale.sold_at, sale.payment_method_name, Number(sale.total), Number(sale.total_cost), Number(sale.gross_profit), sale.status])}
          />
          <Link className="inline-flex min-h-10 w-full items-center justify-center gap-1.5 rounded-xl bg-brand px-2 text-xs font-semibold text-white sm:min-h-11 sm:w-auto sm:gap-2 sm:px-4 sm:text-sm" href="/sales/new">
            <Plus className="size-4" /><span className="sm:hidden">Registrar</span><span className="hidden sm:inline">Registrar venta</span>
          </Link>
        </div>
      </div>

      <SalesFilter from={range.from} period={range.period} status={status} to={range.to} />

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <article className="rounded-2xl border bg-surface p-4">
          <div className="flex items-center gap-2 text-sm text-muted"><WalletCards className="size-4 text-brand" /> Total vendido</div>
          <p className="mt-2 text-2xl font-bold">{money(totalSold)}</p>
        </article>
        <article className="rounded-2xl border bg-surface p-4">
          <div className="flex items-center gap-2 text-sm text-muted"><ShoppingBag className="size-4 text-brand" /> Ventas</div>
          <p className="mt-2 text-2xl font-bold">{completedSales.length}</p>
        </article>
        <article className="rounded-2xl border bg-surface p-4">
          <div className="flex items-center gap-2 text-sm text-muted"><ReceiptText className="size-4 text-brand" /> Ticket promedio</div>
          <p className="mt-2 text-2xl font-bold">{money(averageTicket)}</p>
        </article>
      </div>

      <div className="mt-5 overflow-hidden rounded-2xl border bg-surface">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-background text-xs uppercase text-muted"><tr><th className="px-5 py-3">Venta</th><th className="px-5 py-3">Fecha</th><th className="px-5 py-3">Pago</th><th className="px-5 py-3">Total</th><th className="px-5 py-3">Estado</th><th className="px-5 py-3 text-right">Acción</th></tr></thead>
            <tbody className="divide-y">
              {sales.map((sale) => (
                <tr key={sale.id}>
                  <td className="px-5 py-4 font-semibold">V-{String(sale.sale_number).padStart(6, "0")}</td>
                  <td className="px-5 py-4 text-muted">{dateFormatter.format(new Date(sale.sold_at))}</td>
                  <td className="px-5 py-4">{sale.payment_method_name}</td>
                  <td className="px-5 py-4 font-semibold">{money(Number(sale.total))}</td>
                  <td className="px-5 py-4"><span className={sale.status === "completed" ? "rounded-full bg-accent px-2.5 py-1 text-xs font-semibold text-brand" : "rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 dark:bg-red-950/40 dark:text-red-300"}>{sale.status === "completed" ? "Completada" : "Anulada"}</span></td>
                  <td className="px-5 py-4 text-right"><Link className="font-semibold text-brand" href={`/sales/${sale.id}`}>Ver detalle</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {sales.length === 0 && <p className="p-10 text-center text-sm text-muted">No hay ventas para mostrar en este período.</p>}
      </div>
    </div>
  );
}
