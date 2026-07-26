export type BusinessStatus = "active" | "inactive";
export type PlanTier = "free" | "basic" | "premium" | "unlimited";

export type Business = {
  id: string;
  name: string;
  logo_path: string | null;
  currency_code: string;
  timezone: string;
  contact_email: string | null;
  contact_phone: string | null;
  address: string | null;
  status: BusinessStatus;
  use_stock: boolean;
  allow_discounts: boolean;
  allow_sale_notes: boolean;
  plan_tier: PlanTier;
  plan_started_at: string;
  plan_expires_at: string | null;
  created_at: string;
};

export type OwnerProfile = {
  id: string;
  business_id: string;
  full_name: string;
  role: "owner";
  status: BusinessStatus;
  must_change_password: boolean;
  last_login_at: string | null;
  created_at: string;
  email: string;
  business_name: string;
};

export type AuditLog = {
  id: number;
  action: string;
  entity_type: string;
  entity_id: string | null;
  created_at: string;
  business_id: string | null;
  actor_user_id: string | null;
  businesses: { name: string } | null;
  profiles: { full_name: string } | null;
};
