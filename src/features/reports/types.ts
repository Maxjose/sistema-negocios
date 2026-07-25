export type ReportSummary = {
  total_sales: number;
  total_cost: number;
  gross_profit: number;
  sale_count: number;
  average_ticket: number;
  units_sold: number;
};
export type BusinessReport = {
  currency: string;
  timezone: string;
  from: string;
  to: string;
  summary: ReportSummary;
  daily: { date: string; sales: number; profit: number }[];
  top_products: { product_name: string; units: number; revenue: number; profit: number }[];
  payment_methods: { name: string; total: number; count: number }[];
  inventory: { product_count: number; out_of_stock: number; low_stock: number; cost_value: number };
};
