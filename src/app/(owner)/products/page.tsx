import Link from "next/link";
import { PackageOpen } from "lucide-react";
import { CsvDownloadButton } from "@/components/ui/csv-download-button";
import { getBusinessFeatures, getCategories, getProducts } from "@/features/catalog/data";
import { ProductImportForm } from "@/features/catalog/product-import-form";
import { ProductCreateDialog } from "@/features/catalog/product-create-dialog";
import { formatMoney } from "@/lib/money";

function stockLabel(stock: number, threshold: number) {
  if (stock === 0) return { text: "Agotado", className: "bg-red-50 text-red-700" };
  if (stock <= threshold) return { text: "Pocas unidades", className: "bg-amber-50 text-amber-700" };
  return { text: "Disponible", className: "bg-accent text-brand-strong" };
}

export default async function ProductsPage({ searchParams }: { searchParams: Promise<{ q?: string; stock?: string }> }) {
  const filters = await searchParams;
  const query = filters.q?.trim().toLowerCase() ?? "";
  const [allProducts, features, categories] = await Promise.all([getProducts(), getBusinessFeatures(), getCategories()]);
  const products = allProducts.filter((product) => {
    const matchesQuery = !query || product.name.toLowerCase().includes(query) || product.sku?.toLowerCase().includes(query);
    const matchesStock = !features.use_stock || !filters.stock ||
      (filters.stock === "available" && product.stock_quantity > product.low_stock_threshold) ||
      (filters.stock === "low" && product.stock_quantity > 0 && product.stock_quantity <= product.low_stock_threshold) ||
      (filters.stock === "out" && product.stock_quantity === 0);
    return matchesQuery && matchesStock;
  });
  const exportRows = allProducts.map((product) => [
    product.name, product.sku, product.categories?.name ?? "", product.description,
    Number(product.cost_price), Number(product.sale_price), product.stock_quantity,
    product.low_stock_threshold, product.is_active ? "sí" : "no",
  ]);

  return (
    <div>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div><p className="text-sm text-muted">{features.use_stock ? "Catálogo e inventario actual" : "Catálogo de productos"}</p><h2 className="mt-1 text-2xl font-bold">Productos</h2></div>
        <div className="flex flex-wrap gap-2">
          <CsvDownloadButton filename="productos.csv" headers={["nombre", "sku", "categoria", "descripcion", "precio_costo", "precio_venta", "existencia", "minimo", "activo"]} label="Exportar productos" rows={exportRows} />
          <CsvDownloadButton filename="plantilla-productos.csv" headers={["nombre", "sku", "categoria", "descripcion", "precio_costo", "precio_venta", "existencia", "minimo"]} label="Descargar plantilla" rows={[["Producto ejemplo", "SKU-001", "", "", 10, 15, 20, 5]]} />
          <ProductCreateDialog categories={categories} useStock={features.use_stock} />
        </div>
      </div>
      <ProductImportForm />
      <form className={`mt-6 grid gap-3 rounded-2xl border bg-surface p-4 ${features.use_stock ? "sm:grid-cols-[1fr_12rem_auto]" : "sm:grid-cols-[1fr_auto]"}`}>
        <input className="h-11 rounded-xl border px-3" defaultValue={filters.q} name="q" placeholder="Buscar por nombre o SKU" />
        {features.use_stock && <select className="h-11 rounded-xl border px-3" defaultValue={filters.stock ?? ""} name="stock"><option value="">Todo el inventario</option><option value="available">Disponibles</option><option value="low">Pocas unidades</option><option value="out">Agotados</option></select>}
        <button className="rounded-xl bg-brand px-4 text-sm font-semibold text-white" type="submit">Filtrar</button>
      </form>
      {products.length === 0 ? (
        <section className="mt-7 rounded-2xl border border-dashed bg-surface p-12 text-center"><PackageOpen className="mx-auto size-8 text-muted" /><h3 className="mt-4 font-bold">Aún no hay productos</h3><p className="mt-2 text-sm text-muted">Agrega el primero o importa un archivo CSV.</p></section>
      ) : (
        <div className="mt-7 overflow-hidden rounded-2xl border bg-surface"><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-background text-xs uppercase tracking-wide text-muted"><tr><th className="px-5 py-3">Producto</th><th className="px-5 py-3">Categoría</th><th className="px-5 py-3">Venta</th>{features.use_stock && <><th className="px-5 py-3">Existencia</th><th className="px-5 py-3">Disponibilidad</th></>}<th className="px-5 py-3 text-right">Acción</th></tr></thead><tbody className="divide-y">{products.map((product) => { const stock = stockLabel(product.stock_quantity, product.low_stock_threshold); return <tr key={product.id}><td className="px-5 py-4"><p className="font-semibold">{product.name}</p><p className="text-xs text-muted">{product.sku || "Sin SKU"}</p></td><td className="px-5 py-4">{product.categories?.name ?? "Sin categoría"}</td><td className="px-5 py-4">{formatMoney(Number(product.sale_price))}</td>{features.use_stock && <><td className="px-5 py-4 font-semibold">{product.stock_quantity}</td><td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${stock.className}`}>{stock.text}</span></td></>}<td className="px-5 py-4 text-right"><Link className="font-semibold text-brand" href={`/products/${product.id}`}>Gestionar</Link></td></tr>; })}</tbody></table></div></div>
      )}
    </div>
  );
}
