export type RateMode = "automatic" | "manual";
export type RateStatus = "current" | "stale" | "error" | "missing";

export type GlobalExchangeRate = {
  id: string;
  base_currency: string;
  quote_currency: string;
  rate: number | null;
  source: string;
  effective_date: string | null;
  retrieved_at: string | null;
  status: RateStatus;
  error_message: string | null;
};

export type BusinessCurrency = {
  id: string;
  currency_code: string;
  is_enabled: boolean;
  rate_mode: RateMode;
  manual_rate: number | null;
  adjustment_percent: number;
  rounding_increment: number;
  display_order: number;
  automatic_rate: number | null;
  automatic_source: string | null;
  automatic_effective_date: string | null;
  automatic_status: RateStatus | null;
  effective_rate: number | null;
};

export type CurrencyDisplayConfig = {
  baseCurrency: string;
  enabled: boolean;
  currencies: BusinessCurrency[];
};

export type SaleExchangeRate = {
  id: string;
  base_currency: string;
  quote_currency: string;
  rate: number;
  rounding_increment: number;
  source: string;
  effective_date: string | null;
};
