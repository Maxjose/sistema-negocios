import Link from "next/link";

import { getBusinessFeatures } from "@/features/catalog/data";
import { getBusinessReport } from "@/features/reports/data";
import { resolvePeriod } from "@/features/reports/period";
import { PeriodFilter } from "@/features/reports/period-filter";
import { ReportView } from "@/features/reports/report-view";

export default async function DashboardPage({
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
          <p className="text-sm text-muted">Estado actual del negocio</p>
          <h2 className="mt-1 text-2xl font-bold">Resumen</h2>
        </div>
        <PeriodFilter from={range.from} period={range.period} to={range.to} />
      </div>
      <div className="mt-7">
        <ReportView
          previous={previous}
          report={report}
          useStock={features.use_stock}
        />
      </div>
      <div className="mt-6 text-right">
        <Link
          className="text-sm font-semibold text-brand"
          href={`/reports?period=${range.period}&from=${range.from}&to=${range.to}`}
        >
          Ver reporte completo →
        </Link>
      </div>
    </div>
  );
}
