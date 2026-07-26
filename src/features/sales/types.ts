export type Sale = {
  id: string;
  sale_number: number;
  sold_at: string;
  subtotal: number;
  total: number;
  total_cost: number;
  gross_profit: number;
  discount: number;
  payment_method_name: string;
  status: "completed" | "voided";
  note: string | null;
  customer_name: string | null;
  customers: { phone: string | null } | null;
  void_reason: string | null;
  voided_at: string | null;
  sale_items?: SaleItem[];
  sale_payments?: SalePayment[];
};

export type ReceiptBusiness = {
  name: string;
  logo_url: string | null;
  currency_code: string;
  timezone: string;
  contact_email: string | null;
  contact_phone: string | null;
  address: string | null;
};

export type SalePayment = {
  id: string;
  payment_method_name: string;
  amount: number;
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
