import { Building2, UserRoundCheck, UsersRound } from "lucide-react";

const metrics = [
  { label: "Negocios", value: "0", icon: Building2 },
  { label: "Negocios activos", value: "0", icon: UserRoundCheck },
  { label: "Usuarios", value: "0", icon: UsersRound },
];

export default function AdminPage() {
  return (
    <div>
      <p className="text-sm text-muted">Vista global de la plataforma</p>
      <h2 className="mt-1 text-2xl font-bold tracking-tight">
        Resumen administrativo
      </h2>
      <section className="mt-7 grid gap-4 md:grid-cols-3">
        {metrics.map(({ label, value, icon: Icon }) => (
          <article className="rounded-2xl border bg-surface p-5" key={label}>
            <Icon aria-hidden="true" className="size-5 text-brand" />
            <p className="mt-5 text-sm text-muted">{label}</p>
            <p className="mt-1 text-3xl font-bold">{value}</p>
          </article>
        ))}
      </section>
      <section className="mt-6 rounded-2xl border bg-surface p-6">
        <h3 className="font-bold">Actividad reciente</h3>
        <p className="mt-8 text-center text-sm text-muted">
          La actividad administrativa aparecerá aquí.
        </p>
      </section>
    </div>
  );
}
