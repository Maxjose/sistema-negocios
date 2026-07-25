import { getBusinessFeatures } from "@/features/catalog/data";
import { getBusinessReport } from "@/features/reports/data";
import { resolvePeriod } from "@/features/reports/period";
import { PeriodFilter } from "@/features/reports/period-filter";
import { ReportView } from "@/features/reports/report-view";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; from?: string; to?: string }>;
}) {
  const range = resolvePeriod(await searchParams);
  const [report, previous, features] = await Promise.all([
    getBusinessReport(range.from, range.to),
    getBusinessReport(range.previousFrom, range.previousTo),
    getBusinessFeatures(),
  ]);

  return (
    <div>
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="text-sm text-muted">
            {features.use_stock
              ? "Análisis de ventas, productos e inventario"
              : "Análisis de ventas y productos"}
          </p>
          <h2 className="mt-1 text-2xl font-bold">Reportes</h2>
        </div>
        <PeriodFilter from={range.from} period={range.period} to={range.to} />
      </div>
      <div className="mt-7">
        <ReportView
          detailed
          previous={previous}
          report={report}
          useStock={features.use_stock}
        />
      </div>
    </div>
  );
}
