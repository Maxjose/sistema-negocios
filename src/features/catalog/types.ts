export type Category = {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  display_order: number;
};

export type PaymentMethod = {
  id: string;
  name: string;
  is_active: boolean;
  display_order: number;
};

export type Product = {
  id: string;
  name: string;
  sku: string | null;
  description: string | null;
  image_path: string | null;
  cost_price: number;
  sale_price: number;
  stock_quantity: number;
  low_stock_threshold: number;
  is_active: boolean;
  category_id: string | null;
  categories: { name: string } | null;
  created_at: string;
};
