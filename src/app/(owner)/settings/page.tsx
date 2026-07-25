import {
  toggleCategory,
  togglePaymentMethod,
  updateCategory,
  updatePaymentMethod,
} from "@/features/catalog/actions";
import {
  getCategories,
  getPaymentMethods,
} from "@/features/catalog/data";
import {
  CategoryCreateForm,
  PaymentCreateForm,
} from "@/features/catalog/settings-forms";
import { AccountPasswordForm } from "@/features/auth/account-password-form";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";

export default async function SettingsPage() {
  const [categories, methods] = await Promise.all([
    getCategories(),
    getPaymentMethods(),
  ]);

  return (
    <div>
      <p className="text-sm text-muted">
        Opciones disponibles al gestionar productos y ventas
      </p>
      <h2 className="mt-1 text-2xl font-bold">Configuración</h2>
      <div className="mt-7 grid gap-6 xl:grid-cols-2">
        <section className="rounded-2xl border bg-surface p-5">
          <h3 className="font-bold">Categorías</h3>
          <p className="mb-5 mt-1 text-sm text-muted">
            Organiza el catálogo de productos.
          </p>
          <CategoryCreateForm />
          <ul className="mt-5 divide-y">
            {categories.map((item) => (
              <li className="py-3" key={item.id}>
                <form
                  action={updateCategory.bind(null, item.id)}
                  className="grid grid-cols-[1fr_5rem_auto] gap-2"
                >
                  <input
                    className="h-9 min-w-0 rounded-lg border px-2 text-sm"
                    defaultValue={item.name}
                    name="name"
                    required
                  />
                  <input
                    className="h-9 rounded-lg border px-2 text-sm"
                    defaultValue={item.display_order}
                    min="0"
                    name="display_order"
                    type="number"
                  />
                  <button className="text-sm font-semibold text-brand" type="submit">
                    Guardar
                  </button>
                </form>
                <form
                  action={toggleCategory.bind(null, item.id, !item.is_active)}
                  className="mt-2 text-right"
                >
                  <ConfirmSubmitButton
                    className={
                      item.is_active
                        ? "text-xs font-semibold text-red-700"
                        : "text-xs font-semibold text-brand"
                    }
                    confirmMessage={`¿${item.is_active ? "Desactivar" : "Activar"} la categoría ${item.name}?`}
                    pendingLabel="Guardando..."
                  >
                    {item.is_active ? "Desactivar" : "Activar"}
                  </ConfirmSubmitButton>
                </form>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-2xl border bg-surface p-5">
          <h3 className="font-bold">Métodos de pago</h3>
          <p className="mb-5 mt-1 text-sm text-muted">
            Define las opciones para registrar ventas.
          </p>
          <PaymentCreateForm />
          <ul className="mt-5 divide-y">
            {methods.map((item) => (
              <li className="py-3" key={item.id}>
                <form
                  action={updatePaymentMethod.bind(null, item.id)}
                  className="grid grid-cols-[1fr_5rem_auto] gap-2"
                >
                  <input
                    className="h-9 min-w-0 rounded-lg border px-2 text-sm"
                    defaultValue={item.name}
                    name="name"
                    required
                  />
                  <input
                    className="h-9 rounded-lg border px-2 text-sm"
                    defaultValue={item.display_order}
                    min="0"
                    name="display_order"
                    type="number"
                  />
                  <button className="text-sm font-semibold text-brand" type="submit">
                    Guardar
                  </button>
                </form>
                <form
                  action={togglePaymentMethod.bind(null, item.id, !item.is_active)}
                  className="mt-2 text-right"
                >
                  <ConfirmSubmitButton
                    className={
                      item.is_active
                        ? "text-xs font-semibold text-red-700"
                        : "text-xs font-semibold text-brand"
                    }
                    confirmMessage={`¿${item.is_active ? "Desactivar" : "Activar"} el método ${item.name}?`}
                    pendingLabel="Guardando..."
                  >
                    {item.is_active ? "Desactivar" : "Activar"}
                  </ConfirmSubmitButton>
                </form>
              </li>
            ))}
          </ul>
        </section>
      </div>
      <section className="mt-6 max-w-xl rounded-2xl border bg-surface p-5">
        <h3 className="font-bold">Seguridad de la cuenta</h3>
        <p className="mb-5 mt-1 text-sm text-muted">
          Cambia la contraseña utilizada para ingresar al sistema.
        </p>
        <AccountPasswordForm />
      </section>
    </div>
  );
}
