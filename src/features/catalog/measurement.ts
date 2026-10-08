export type SaleUnit = "unit" | "weight";

// Weight quantities are always integer grams; prices are per kilogram.
export function quantityFromInput(value: number, unit: SaleUnit, inputUnit: "g" | "kg" = "kg") {
  const quantity = unit === "weight" && inputUnit === "kg" ? value * 1000 : value;
  if (!Number.isFinite(quantity) || quantity < 0 || Math.abs(quantity - Math.round(quantity)) > 0.000001 || quantity > 2_147_483_647) {
    throw new Error(unit === "weight" ? "Usa gramos enteros o kilos con hasta tres decimales." : "Usa una cantidad entera válida.");
  }
  return Math.round(quantity);
}

export function displayQuantity(quantity: number, unit?: SaleUnit) {
  return unit === "weight" ? quantity / 1000 : quantity;
}

export function formatQuantity(quantity: number, unit?: SaleUnit) {
  if (unit === "weight" && Math.abs(quantity) < 1000) return `${quantity} g`;
  const value = displayQuantity(quantity, unit).toLocaleString("es-VE", { maximumFractionDigits: 3 });
  return `${value} ${unit === "weight" ? "kg" : "unid."}`;
}

export function lineAmount(price: number, quantity: number, unit?: SaleUnit) {
  return Math.round(Math.round(price * 100) * quantity / (unit === "weight" ? 1000 : 1)) / 100;
}
