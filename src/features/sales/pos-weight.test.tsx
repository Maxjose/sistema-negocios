import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PosForm } from "./pos-form";
import type { Product } from "@/features/catalog/types";

vi.mock("./actions", () => ({ confirmSale: vi.fn() }));
vi.mock("./barcode-sound", () => ({ playBarcodeSuccessSound: vi.fn(), prepareBarcodeSuccessSound: vi.fn() }));
Object.defineProperty(HTMLDialogElement.prototype, "showModal", { configurable: true, value() { this.setAttribute("open", ""); } });
const product: Product = { id: "00000000-0000-4000-8000-000000000001", name: "Queso", sale_unit: "weight", cost_price: 6, sale_price: 10, stock_quantity: 2000, low_stock_threshold: 500, is_active: true, sku: null, description: null, image_path: null, category_id: null, categories: null, created_at: "2026-10-08" };
const props = { products: [product], methods: [], customers: [], currencyConfig: { baseCurrency: "USD", enabled: false, currencies: [] }, features: { use_stock: true, allow_discounts: true, allow_sale_notes: true, enable_customers: false, enable_credits: false, enable_stock_adjustments: false, enable_multicurrency: false, enable_barcode_scanner: false } };
afterEach(cleanup);

describe("weighted cart", () => {
  it("adds and edits grams without treating them as unit counts", () => {
    const { container } = render(<PosForm {...props} />);
    fireEvent.click(screen.getByRole("button", { name: /Queso.*disponibles/ }));
    const dialog = screen.getByRole("dialog");
    fireEvent.change(within(dialog).getByRole("spinbutton", { name: "Peso" }), { target: { value: "350" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Agregar" }));
    expect(JSON.parse((container.querySelector('input[name="items"]') as HTMLInputElement).value)).toEqual([{ product_id: product.id, quantity: 350, sale_unit: "weight" }]);
    fireEvent.click(screen.getByRole("button", { name: /350 g · Editar/ }));
    fireEvent.change(screen.getByRole("combobox", { name: "Medida" }), { target: { value: "kg" } });
    fireEvent.change(screen.getByRole("spinbutton", { name: "Peso" }), { target: { value: "1.2" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar peso" }));
    expect(JSON.parse((container.querySelector('input[name="items"]') as HTMLInputElement).value)[0].quantity).toBe(1200);
  });
  it("blocks excessive stock and partial grams", () => {
    render(<PosForm {...props} />);
    fireEvent.click(screen.getByRole("button", { name: /Queso.*disponibles/ }));
    const input = screen.getByRole("spinbutton", { name: "Peso" });
    fireEvent.change(input, { target: { value: "2001" } });
    expect((screen.getByRole("button", { name: "Agregar" }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(input, { target: { value: "0.5" } });
    expect((screen.getByRole("button", { name: "Agregar" }) as HTMLButtonElement).disabled).toBe(true);
  });
  it("allows weighed sales without stock enabled", () => {
    render(<PosForm {...props} features={{ ...props.features, use_stock: false }} />);
    fireEvent.click(screen.getByRole("button", { name: /Queso/ }));
    fireEvent.change(screen.getByRole("spinbutton", { name: "Peso" }), { target: { value: "3000" } });
    expect((screen.getByRole("button", { name: "Agregar" }) as HTMLButtonElement).disabled).toBe(false);
  });
});
