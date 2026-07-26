export type Customer = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
};

export type Receivable = {
  id: string;
  customer_id: string;
  sale_id: string | null;
  description: string;
  original_amount: number;
  balance: number;
  due_date: string;
  status: "open" | "paid" | "cancelled";
  created_at: string;
  customers: { name: string; phone: string | null } | null;
};

export type ReceivablePayment = {
  id: string;
  amount: number;
  payment_method_name: string;
  note: string | null;
  paid_at: string;
};
