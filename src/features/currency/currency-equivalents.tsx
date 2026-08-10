import { convertWithCurrency, formatCurrencyAmount } from "@/features/currency/conversion";
import type { CurrencyDisplayConfig } from "@/features/currency/types";

export function CurrencyEquivalents({ amount, config, className = "" }: { amount: number; config: CurrencyDisplayConfig; className?: string }) {
  if (!config.enabled) return null;
  const values = config.currencies
    .filter((currency) => currency.is_enabled)
    .map((currency) => ({ currency, amount: convertWithCurrency(amount, currency) }))
    .filter((entry) => entry.amount !== null);
  if (values.length === 0) return null;
  return <span className={`flex flex-wrap gap-x-2 gap-y-0.5 text-xs text-muted ${className}`}>{values.map(({ currency, amount: converted }) => <span key={currency.id}>{formatCurrencyAmount(converted!, currency.currency_code)}</span>)}</span>;
}
