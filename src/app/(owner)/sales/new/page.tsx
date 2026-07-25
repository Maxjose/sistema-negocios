import { getPaymentMethods, getProducts } from "@/features/catalog/data";
import { PosForm } from "@/features/sales/pos-form";

export default async function NewSalePage() {
  const [products, methods] = await Promise.all([getProducts(), getPaymentMethods()]);
  return <div><p className="text-sm text-muted">Punto de venta</p><h2 className="mt-1 text-2xl font-bold">Registrar venta</h2><div className="mt-7"><PosForm methods={methods} products={products} /></div></div>;
}
