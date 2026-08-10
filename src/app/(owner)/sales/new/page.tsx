import { getBusinessFeatures, getPaymentMethods, getProducts } from "@/features/catalog/data";
import { PosForm } from "@/features/sales/pos-form";
import { getCustomers } from "@/features/customers/data";
import { getCurrencyDisplayConfig } from "@/features/currency/data";

export default async function NewSalePage() {
  const [products, methods, features, currencyConfig] = await Promise.all([getProducts(), getPaymentMethods(), getBusinessFeatures(), getCurrencyDisplayConfig()]);
  const customers = features.enable_customers ? await getCustomers() : [];
  return <div><p className="text-sm text-muted">Punto de venta</p><h2 className="mt-1 text-2xl font-bold">Registrar venta</h2><div className="mt-7"><PosForm currencyConfig={currencyConfig} customers={customers} features={features} methods={methods} products={products} /></div></div>;
}
