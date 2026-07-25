import { getAuditLogs } from "@/features/admin/data";

const actionLabels: Record<string, string> = {
  "business.created": "Negocio creado",
  "business.updated": "Negocio actualizado",
  "business.logo_updated": "Logotipo actualizado",
  "owner.created": "Propietario creado",
  "owner.updated": "Propietario actualizado",
  "owner.activated": "Propietario activado",
  "owner.deactivated": "Propietario desactivado",
  "auth.login": "Inicio de sesión",
  "auth.initial_password_changed": "Contraseña inicial cambiada",
  "product.created": "Producto creado",
  "product.updated": "Producto actualizado",
  "product.stock_updated": "Existencia actualizada",
  "product.image_updated": "Imagen de producto actualizada",
  "category.created": "Categoría creada",
  "category.updated": "Categoría actualizada",
  "category.status_changed": "Estado de categoría actualizado",
  "payment_method.created": "Método de pago creado",
  "payment_method.updated": "Método de pago actualizado",
  "payment_method.status_changed": "Estado de método de pago actualizado",
  "sale.created": "Venta registrada",
  "sale.voided": "Venta anulada",
};

export default async function ActivityPage() {
  const entries = await getAuditLogs();

  return (
    <div>
      <p className="text-sm text-muted">Acciones sensibles de la plataforma</p>
      <h2 className="mt-1 text-2xl font-bold tracking-tight">Actividad</h2>
      <div className="mt-7 overflow-hidden rounded-2xl border bg-surface">
        {entries.length === 0 ? (
          <p className="p-12 text-center text-sm text-muted">Todavía no hay actividad registrada.</p>
        ) : (
          <ul className="divide-y">
            {entries.map((entry) => (
              <li className="grid gap-2 px-5 py-4 sm:grid-cols-[1fr_auto] sm:items-center" key={entry.id}>
                <div>
                  <p className="text-sm font-semibold">{actionLabels[entry.action] ?? entry.action}</p>
                  <p className="mt-1 text-xs text-muted">
                    {entry.profiles?.full_name ?? "Sistema"} · {entry.businesses?.name ?? "Plataforma"}
                  </p>
                </div>
                <time className="text-xs text-muted">
                  {new Intl.DateTimeFormat("es-VE", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  }).format(new Date(entry.created_at))}
                </time>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
