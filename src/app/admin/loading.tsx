export default function AdminLoading() {
  return <div aria-label="Cargando sección" className="animate-pulse space-y-5"><div className="h-7 w-56 rounded-lg bg-accent" /><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <div className="h-28 rounded-2xl border bg-surface" key={index} />)}</div></div>;
}
