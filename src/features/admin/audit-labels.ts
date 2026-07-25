export const auditActionLabels: Record<string, string> = {
  "business.created": "Negocio creado",
  "business.updated": "Negocio actualizado",
  "business.logo_updated": "Logotipo actualizado",
  "business.features_updated": "Funciones del negocio actualizadas",
  "owner.created": "Propietario creado",
  "owner.updated": "Propietario actualizado",
  "owner.activated": "Propietario activado",
  "owner.deactivated": "Propietario desactivado",
  "auth.login": "Inicio de sesión",
  "auth.initial_password_changed": "Contraseña inicial cambiada",
  "auth.password_changed": "Contraseña cambiada",
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

export function getAuditActionLabel(action: string) {
  return auditActionLabels[action] ?? action;
}
