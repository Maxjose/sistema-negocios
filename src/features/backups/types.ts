export const BACKUP_TABLES = [
  "businesses", "profiles", "categories", "payment_methods", "customers", "products",
  "business_currencies", "sales", "sale_items", "sale_payments", "sale_exchange_rates",
  "receivables", "receivable_payments", "inventory_adjustments", "audit_logs",
  "exchange_rates", "platform_settings",
] as const;
export type BackupTable = typeof BACKUP_TABLES[number];
export type BackupRow = Record<string, unknown>;
export type BackupData = Record<BackupTable, BackupRow[]>;
export type DatabaseSnapshot = { schema: string; captured_at: string; data: BackupData };
export type BackupContent = {
  format: "monii-backup";
  version: 1;
  source_project: string;
  scope: "business" | "platform";
  business_id: string | null;
  snapshot: DatabaseSnapshot;
  assets: { path: string; content_type: string; data: string; sha256: string }[];
};
export type BackupRecord = {
  id: string;
  business_id: string | null;
  scope: "business" | "platform";
  kind: "manual" | "imported" | "safety";
  status: "creating" | "ready" | "failed";
  label: string;
  created_at: string;
  captured_at: string | null;
  size_bytes: number | null;
  counts: Record<string, number>;
  error_message: string | null;
};
export type BackupPreview = {
  id: string;
  scope: "business" | "platform";
  captured_at: string;
  businesses: { id: string; name: string }[];
  counts: Record<string, number>;
  assets: number;
  confirmation: string;
};
export const BACKUP_BUCKET = "platform-backups";
export const MAX_ARCHIVE_BYTES = 50 * 1024 * 1024;
export const MAX_EXPANDED_BYTES = 180 * 1024 * 1024;
export const MAX_DATA_BYTES = 24 * 1024 * 1024;
