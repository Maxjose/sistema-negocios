import type { Product } from "@/features/catalog/types";

export function normalizeBarcode(value: string) {
  return value.trim().toUpperCase();
}

export function findProductByBarcode(products: Product[], value: string) {
  const barcode = normalizeBarcode(value);
  if (!barcode) return undefined;

  return products.find(
    (product) => product.sku && normalizeBarcode(product.sku) === barcode,
  );
}
