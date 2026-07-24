import { Boxes, CircleDollarSign, ReceiptText, TrendingUp } from "lucide-react";

import { formatMoney } from "@/lib/money";

const metrics = [
  {
    label: "Ventas de hoy",
    value: formatMoney(0),
    icon: CircleDollarSign,
  },
  { label: "Ganancia bruta", value: formatMoney(0), icon: TrendingUp },
  { label: "Ventas registradas", value: "0", icon: ReceiptText },
  { label: "Productos con stock bajo", value: "0", icon: Boxes },
];

export default function DashboardPage() {
  return (
    <div>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm text-muted">Resumen del periodo actual</p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight">
            Buenos días
          </h2>
        </div>
        <span className="w-fit rounded-xl border bg-surface px-3 py-2 text-sm font-medium">
          Hoy
        </span>
      </div>

      <section
        aria-label="Indicadores principales"
        className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        {metrics.map(({ label, value, icon: Icon }) => (
          <article className="rounded-2xl border bg-surface p-5" key={label}>
            <span className="grid size-10 place-items-center rounded-xl bg-accent text-brand">
              <Icon aria-hidden="true" className="size-5" />
            </span>
            <p className="mt-5 text-sm text-muted">{label}</p>
            <p className="mt-1 text-2xl font-bold tracking-tight">{value}</p>
          </article>
        ))}
      </section>

      <section className="mt-6 rounded-2xl border border-dashed bg-surface p-8 text-center sm:p-12">
        <h3 className="text-lg font-bold">Tu resumen aparecerá aquí</h3>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">
          Cuando registres productos y ventas verás la evolución del negocio,
          tus ganancias y los productos con mejor desempeño.
        </p>
      </section>
    </div>
  );
}
