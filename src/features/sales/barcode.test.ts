import { describe, expect, it } from "vitest";

import type { Product } from "@/features/catalog/types";
import { findProductByBarcode, normalizeBarcode } from "@/features/sales/barcode";

const product = {
  id: "product-1",
  name: "Producto",
  sku: "  abc-001 ",
  description: null,
  image_path: null,
  cost_price: 1,
  sale_price: 2,
  stock_quantity: 5,
  low_stock_threshold: 1,
  is_active: true,
  category_id: null,
  categories: null,
  created_at: "2026-08-11T00:00:00Z",
} satisfies Product;

describe("barcode matching", () => {
  it("preserves leading zeroes while removing scanner whitespace", () => {
    expect(normalizeBarcode(" 001234567890\r\n")).toBe("001234567890");
  });

  it("matches SKU exactly without case sensitivity", () => {
    expect(findProductByBarcode([product], "ABC-001")?.id).toBe(product.id);
    expect(findProductByBarcode([product], "ABC-00")).toBeUndefined();
  });
});
