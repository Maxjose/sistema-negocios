export default function OwnerLoading() {
  return <div aria-label="Cargando sección" className="animate-pulse space-y-5"><div className="h-7 w-48 rounded-lg bg-accent" /><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }, (_, index) => <div className="h-32 rounded-2xl border bg-surface" key={index} />)}</div></div>;
}
