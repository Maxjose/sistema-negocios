import { createHash } from "node:crypto";
import { gzipSync, gunzipSync } from "node:zlib";
import { z } from "zod";
import { BACKUP_TABLES, MAX_ARCHIVE_BYTES, MAX_DATA_BYTES, MAX_EXPANDED_BYTES, type BackupContent, type BackupData, type BackupRow } from "./types";

export class BackupError extends Error {}
export function sha256(value: string | Uint8Array) { return createHash("sha256").update(value).digest("hex"); }
// Stable hashing is independent of the order in which JSON keys were serialized.
export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value !== null && typeof value === "object") {
    const object = value as Record<string, unknown>;
    return `{${Object.keys(object).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(object[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}
const uuid = z.uuid();
const row = z.record(z.string(), z.unknown());
const dataSchema = z.object(Object.fromEntries(BACKUP_TABLES.map((table) => [table, z.array(row).max(100000)])) as Record<typeof BACKUP_TABLES[number], z.ZodArray<typeof row>>).strict();
const contentSchema = z.object({
  format: z.literal("monii-backup"), version: z.literal(1), source_project: z.string().min(1).max(250),
  scope: z.enum(["business", "platform"]), business_id: uuid.nullable(),
  snapshot: z.object({ schema: z.string().regex(/^[a-f0-9]{32}$/), captured_at: z.iso.datetime({ offset: true }), data: dataSchema }).strict(),
  assets: z.array(z.object({ path: z.string().max(500), content_type: z.enum(["image/png", "image/jpeg", "image/webp"]), data: z.string(), sha256: z.string().regex(/^[a-f0-9]{64}$/) }).strict()).max(2000),
}).strict();

export function referencedAssets(data: BackupData) {
  const paths = new Set<string>();
  for (const item of [...data.businesses.map((item) => ({ business_id: item.id, path: item.logo_path })), ...data.products.map((item) => ({ business_id: item.business_id, path: item.image_path }))]) {
    if (item.path == null) continue;
    if (typeof item.path !== "string" || !item.path.startsWith(`${item.business_id}/`) || item.path.includes("..") || /[\\\s?#]/.test(item.path)) throw new BackupError("Una imagen tiene una ruta inválida o pertenece a otro negocio.");
    paths.add(item.path);
  }
  return paths;
}

export function validateRelations(content: BackupContent) {
  const { data } = content.snapshot;
  const maps = new Map<string, Map<string, BackupRow>>();
  let totalRows = 0;
  for (const table of BACKUP_TABLES) {
    const map = new Map<string, BackupRow>();
    for (const item of data[table]) {
      totalRows++;
      const id = String(item.id);
      if (!id || id === "undefined" || map.has(id)) throw new BackupError(`Identificadores inválidos o duplicados en ${table}.`);
      if (table !== "audit_logs" && table !== "platform_settings" && !uuid.safeParse(id).success) throw new BackupError(`Identificador inválido en ${table}.`);
      map.set(id, item);
    }
    maps.set(table, map);
  }
  if (totalRows > 200000 || Buffer.byteLength(JSON.stringify(data)) > MAX_DATA_BYTES) throw new BackupError("El respaldo supera el límite de datos admitido para esta versión.");
  const businesses = maps.get("businesses")!;
  if (content.scope === "business" && (businesses.size !== 1 || !businesses.has(content.business_id ?? ""))) throw new BackupError("El respaldo no corresponde al negocio seleccionado.");
  if (content.scope === "platform" && content.business_id !== null) throw new BackupError("Alcance del respaldo inválido.");
  if (content.scope === "business" && (data.exchange_rates.length || data.platform_settings.length)) throw new BackupError("Un respaldo de negocio no puede modificar ajustes globales.");
  const relation = (item: BackupRow, field: string, table: string, businessId: unknown, optional = false) => {
    if (optional && item[field] == null) return;
    const parent = maps.get(table)!.get(String(item[field]));
    if (!parent || (table !== "profiles" || parent.role !== "super_admin") && parent.business_id !== businessId) throw new BackupError(`Relación inválida: ${field}.`);
  };
  for (const table of ["profiles", "categories", "payment_methods", "customers", "products", "business_currencies", "sales", "receivables", "receivable_payments", "inventory_adjustments", "audit_logs"] as const) {
    for (const item of data[table]) {
      if (table === "profiles" && item.role === "super_admin" && item.business_id === null) continue;
      if (table === "audit_logs" && item.business_id === null && content.scope === "platform") continue;
      if (!businesses.has(String(item.business_id))) throw new BackupError(`Datos de otro negocio en ${table}.`);
    }
  }
  for (const item of data.profiles) if (!["owner", "super_admin"].includes(String(item.role))) throw new BackupError("Rol inválido.");
  for (const item of data.products) relation(item, "category_id", "categories", item.business_id, true);
  for (const item of data.sales) {
    relation(item, "created_by", "profiles", item.business_id);
    relation(item, "voided_by", "profiles", item.business_id, true);
    relation(item, "customer_id", "customers", item.business_id, true);
    relation(item, "payment_method_id", "payment_methods", item.business_id, true);
  }
  for (const table of ["sale_items", "sale_payments", "sale_exchange_rates"] as const) {
    for (const item of data[table]) {
      const sale = maps.get("sales")!.get(String(item.sale_id));
      if (!sale) throw new BackupError("Detalle sin venta asociada.");
      if (table === "sale_items") relation(item, "product_id", "products", sale.business_id);
      if (table === "sale_payments") relation(item, "payment_method_id", "payment_methods", sale.business_id);
    }
  }
  for (const item of data.receivables) {
    relation(item, "customer_id", "customers", item.business_id);
    relation(item, "sale_id", "sales", item.business_id, true);
    relation(item, "created_by", "profiles", item.business_id);
  }
  for (const item of data.receivable_payments) {
    relation(item, "receivable_id", "receivables", item.business_id);
    relation(item, "payment_method_id", "payment_methods", item.business_id);
    relation(item, "created_by", "profiles", item.business_id);
  }
  for (const item of data.inventory_adjustments) {
    relation(item, "product_id", "products", item.business_id);
    relation(item, "created_by", "profiles", item.business_id);
  }
  const expected = referencedAssets(data);
  const actual = new Set<string>();
  let assetBytes = 0;
  for (const asset of content.assets) {
    if (!expected.has(asset.path) || actual.has(asset.path) || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(asset.data)) throw new BackupError("Archivo de imagen no válido.");
    const buffer = Buffer.from(asset.data, "base64");
    assetBytes += buffer.length;
    if (!buffer.length || buffer.length > 5 * 1024 * 1024 || assetBytes > 100 * 1024 * 1024 || sha256(buffer) !== asset.sha256) throw new BackupError("Una imagen está dañada o supera el tamaño permitido.");
    const imageType = detectImageType(buffer);
    if (imageType !== asset.content_type) throw new BackupError("El contenido de una imagen no coincide con su tipo.");
    actual.add(asset.path);
  }
  if (expected.size !== actual.size) throw new BackupError("Faltan fotos o logotipos en el respaldo.");
}

export function detectImageType(buffer: Uint8Array): string | null {
  const b = Buffer.from(buffer);
  if (b.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) return "image/png";
  if (b[0] === 255 && b[1] === 216 && b[2] === 255) return "image/jpeg";
  if (b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP") return "image/webp";
  return null;
}

export function encodeBackup(content: BackupContent) {
  validateRelations(content);
  const raw = JSON.stringify({ content, checksum: sha256(canonicalJson(content)) });
  if (Buffer.byteLength(raw) > MAX_EXPANDED_BYTES) throw new BackupError("El respaldo excede el tamaño permitido.");
  const archive = gzipSync(raw);
  if (archive.length > MAX_ARCHIVE_BYTES) throw new BackupError("El archivo excede el límite de 50 MB.");
  return archive;
}
export function decodeBackup(archive: Uint8Array, project: string, businessId: string | null): BackupContent {
  if (!archive.length || archive.length > MAX_ARCHIVE_BYTES) throw new BackupError("El archivo excede el límite de 50 MB.");
  let envelope: unknown;
  try { envelope = JSON.parse(gunzipSync(archive, { maxOutputLength: MAX_EXPANDED_BYTES }).toString("utf8")); }
  catch { throw new BackupError("El archivo no es un respaldo válido de Monii App o está dañado."); }
  const parsed = z.object({ content: contentSchema, checksum: z.string().regex(/^[a-f0-9]{64}$/) }).strict().safeParse(envelope);
  if (!parsed.success) throw new BackupError("Formato o versión de respaldo no compatible.");
  const content = parsed.data.content as BackupContent;
  if (sha256(canonicalJson(content)) !== parsed.data.checksum) throw new BackupError("La comprobación de integridad falló. El archivo fue modificado.");
  if (content.source_project !== project) throw new BackupError("Este respaldo pertenece a otro proyecto de Supabase.");
  if (content.business_id !== businessId || content.scope !== (businessId ? "business" : "platform")) throw new BackupError("El respaldo no corresponde a esta sección o negocio.");
  validateRelations(content);
  return content;
}
export function backupCounts(data: BackupData) {
  return Object.fromEntries(BACKUP_TABLES.map((table) => [table, data[table].length]));
}
