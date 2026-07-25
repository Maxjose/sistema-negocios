import Link from "next/link";
import { Plus } from "lucide-react";
import { CsvDownloadButton } from "@/components/ui/csv-download-button";
import { getSales } from "@/features/sales/data";
import { formatMoney } from "@/lib/money";

export default async function SalesPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const filters = await searchParams;
  const allSales = await getSales();
  const sales = filters.status ? allSales.filter((sale) => sale.status === filters.status) : allSales;
  return (
    <div>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div><p className="text-sm text-muted">Operaciones registradas</p><h2 className="mt-1 text-2xl font-bold">Ventas</h2></div>
        <div className="flex flex-wrap gap-2">
          <CsvDownloadButton filename="ventas.csv" headers={["venta", "fecha", "metodo_pago", "total", "costo", "ganancia", "estado"]} rows={sales.map((sale) => [sale.sale_number, sale.sold_at, sale.payment_method_name, Number(sale.total), Number(sale.total_cost), Number(sale.gross_profit), sale.status])} />
          <Link className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-brand px-4 text-sm font-semibold text-white" href="/sales/new"><Plus className="size-4" /> Registrar venta</Link>
        </div>
      </div>
      <form className="mt-6"><select className="h-11 rounded-xl border bg-surface px-3" defaultValue={filters.status ?? ""} name="status"><option value="">Todas</option><option value="completed">Completadas</option><option value="voided">Anuladas</option></select><button className="ml-2 h-11 rounded-xl border bg-surface px-4 text-sm font-semibold" type="submit">Filtrar</button></form>
      <div className="mt-5 overflow-hidden rounded-2xl border bg-surface"><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-background text-xs uppercase text-muted"><tr><th className="px-5 py-3">Venta</th><th className="px-5 py-3">Fecha</th><th className="px-5 py-3">Pago</th><th className="px-5 py-3">Total</th><th className="px-5 py-3">Estado</th><th className="px-5 py-3 text-right">Acción</th></tr></thead><tbody className="divide-y">{sales.map((sale) => <tr key={sale.id}><td className="px-5 py-4 font-semibold">V-{String(sale.sale_number).padStart(6, "0")}</td><td className="px-5 py-4 text-muted">{new Intl.DateTimeFormat("es-VE", { dateStyle: "short", timeStyle: "short" }).format(new Date(sale.sold_at))}</td><td className="px-5 py-4">{sale.payment_method_name}</td><td className="px-5 py-4 font-semibold">{formatMoney(Number(sale.total))}</td><td className="px-5 py-4"><span className={sale.status === "completed" ? "rounded-full bg-accent px-2.5 py-1 text-xs font-semibold text-brand" : "rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700"}>{sale.status === "completed" ? "Completada" : "Anulada"}</span></td><td className="px-5 py-4 text-right"><Link className="font-semibold text-brand" href={`/sales/${sale.id}`}>Ver detalle</Link></td></tr>)}</tbody></table></div>{sales.length === 0 && <p className="p-10 text-center text-sm text-muted">No hay ventas para mostrar.</p>}</div>
    </div>
  );
}
