export type Sale = {
  id: string;
  sale_number: number;
  sold_at: string;
  total: number;
  total_cost: number;
  gross_profit: number;
  discount: number;
  payment_method_name: string;
  status: "completed" | "voided";
  note: string | null;
  void_reason: string | null;
  voided_at: string | null;
  sale_items?: SaleItem[];
};

export type SaleItem = {
  id: string;
  product_name: string;
  product_sku: string | null;
  quantity: number;
  unit_cost: number;
  unit_price: number;
  subtotal: number;
  gross_profit: number;
};
