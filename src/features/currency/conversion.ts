import type { BusinessCurrency } from "@/features/currency/types";

export function effectiveRate(input: {
  automaticRate: number | null;
  manualRate: number | null;
  mode: "automatic" | "manual";
  adjustmentPercent: number;
}) {
  const base = input.mode === "manual" ? input.manualRate : input.automaticRate;
  if (base === null || !Number.isFinite(base) || base <= 0) return null;
  if (input.mode === "manual") return base;
  return base * (1 + input.adjustmentPercent / 100);
}

export function roundConverted(amount: number, rate: number, increment: number) {
  if (!Number.isFinite(amount) || !Number.isFinite(rate) || !Number.isFinite(increment) || increment <= 0) return 0;
  return Math.round((amount * rate) / increment) * increment;
}

export function convertWithCurrency(amount: number, currency: BusinessCurrency) {
  if (!currency.effective_rate) return null;
  return roundConverted(amount, currency.effective_rate, currency.rounding_increment);
}

export function formatCurrencyAmount(amount: number, currency: string) {
  return new Intl.NumberFormat("es-VE", {
    style: "currency",
    currency,
    minimumFractionDigits: currency === "COP" ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount);
}
