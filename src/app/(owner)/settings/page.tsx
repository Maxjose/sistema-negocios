import { getBusinessAccent, getCategories, getPaymentMethods } from "@/features/catalog/data";
import { CategoryCreateForm, PaymentCreateForm } from "@/features/catalog/settings-forms";
import { SortableSettingsList } from "@/features/catalog/sortable-settings-list";
import { AccountPasswordForm } from "@/features/auth/account-password-form";
import { AccentThemePicker } from "@/features/catalog/accent-theme-picker";

export default async function SettingsPage() {
  const [categories, methods, accentTheme] = await Promise.all([getCategories(), getPaymentMethods(), getBusinessAccent()]);
  return <div className="min-w-0"><p className="text-sm text-muted">Opciones disponibles al gestionar productos y ventas</p><h2 className="mt-1 text-2xl font-bold">Configuración</h2>
    <div className="mt-7 grid gap-6 xl:grid-cols-2">
      <section className="min-w-0 overflow-hidden rounded-2xl border bg-surface p-4 sm:p-5"><h3 className="font-bold">Categorías</h3><p className="mb-5 mt-1 text-sm text-muted">Organiza el catálogo de productos.</p><CategoryCreateForm /><SortableSettingsList items={categories} kind="categories" /></section>
      <section className="min-w-0 overflow-hidden rounded-2xl border bg-surface p-4 sm:p-5"><h3 className="font-bold">Métodos de pago</h3><p className="mb-5 mt-1 text-sm text-muted">Define las opciones para registrar ventas.</p><PaymentCreateForm /><SortableSettingsList items={methods} kind="payment_methods" /></section>
    </div>
    <AccentThemePicker initialTheme={accentTheme} />
    <section className="mt-6 max-w-xl rounded-2xl border bg-surface p-5"><h3 className="font-bold">Seguridad de la cuenta</h3><p className="mb-5 mt-1 text-sm text-muted">Cambia la contraseña utilizada para ingresar al sistema.</p><AccountPasswordForm /></section>
  </div>;
}
