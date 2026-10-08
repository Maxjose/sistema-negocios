// @vitest-environment node
import { describe, expect, it } from "vitest";
import { gzipSync } from "node:zlib";
import { BACKUP_TABLES, type BackupContent, type BackupData } from "./types";
import { canonicalJson, decodeBackup, encodeBackup, sha256, validateRelations } from "./format";
const business = "00000000-0000-4000-8000-000000000001";
const owner = "00000000-0000-4000-8000-000000000002";
const product = "00000000-0000-4000-8000-000000000003";
function fixture(): BackupContent {
  const data = Object.fromEntries(BACKUP_TABLES.map((table) => [table, []])) as unknown as BackupData;
  data.businesses = [{ id: business, name: "Quesería", logo_path: null }];
  data.profiles = [{ id: owner, business_id: business, role: "owner", full_name: "Propietario" }];
  data.products = [{ id: product, business_id: business, category_id: null, image_path: null, sale_unit: "weight", stock_quantity: 2350 }];
  return { format: "monii-backup", version: 1, source_project: "https://test.supabase.co", scope: "business", business_id: business,
    snapshot: { schema: "a".repeat(32), captured_at: "2026-10-08T12:00:00+00:00", data }, assets: [] };
}
describe("backup archives", () => {
  it("round-trips quantities, UTF-8 text and immutable historic data", () => {
    const content = fixture();
    expect(decodeBackup(encodeBackup(content), content.source_project, business)).toEqual(content);
  });
  it("rejects broken compression, altered checksum and unsupported versions", () => {
    expect(() => decodeBackup(Buffer.from("not gzip"), "https://test.supabase.co", business)).toThrow("dañado");
    const content = fixture();
    const altered = gzipSync(JSON.stringify({ content, checksum: "0".repeat(64) }));
    expect(() => decodeBackup(altered, content.source_project, business)).toThrow("integridad");
    const incompatible = { ...content, version: 2 };
    expect(() => decodeBackup(gzipSync(JSON.stringify({ content: incompatible, checksum: sha256(canonicalJson(incompatible)) })), content.source_project, business)).toThrow("versión");
  });
  it("rejects different projects, businesses and scope", () => {
    const content = fixture(); const archive = encodeBackup(content);
    expect(() => decodeBackup(archive, "https://other.supabase.co", business)).toThrow("otro proyecto");
    expect(() => decodeBackup(archive, content.source_project, null)).toThrow("negocio");
  });
  it("rejects cross-tenant relationships and duplicate IDs", () => {
    const content = fixture(); content.snapshot.data.products[0].business_id = owner;
    expect(() => validateRelations(content)).toThrow("otro negocio");
    const duplicate = fixture(); duplicate.snapshot.data.products.push(duplicate.snapshot.data.products[0]);
    expect(() => validateRelations(duplicate)).toThrow("duplicados");
    const invalid = fixture(); invalid.snapshot.data.products[0].category_id = owner;
    expect(() => validateRelations(invalid)).toThrow("Relación");
  });
  it("requires complete media and rejects foreign paths and invalid contents", () => {
    const content = fixture(); content.snapshot.data.products[0].image_path = `${business}/queso.png`;
    expect(() => validateRelations(content)).toThrow("Faltan");
    const image = Buffer.from([137,80,78,71,13,10,26,10]);
    content.assets.push({ path: `${business}/queso.png`, content_type: "image/png", data: image.toString("base64"), sha256: sha256(image) });
    expect(() => validateRelations(content)).not.toThrow();
    content.assets[0].content_type = "image/jpeg";
    expect(() => validateRelations(content)).toThrow("tipo");
    content.snapshot.data.products[0].image_path = `${owner}/queso.png`;
    expect(() => validateRelations(content)).toThrow("otro negocio");
  });
  it("forbids business archives carrying global configuration", () => {
    const content = fixture(); content.snapshot.data.platform_settings = [{ id: true, maintenance_mode: true }];
    expect(() => validateRelations(content)).toThrow("globales");
  });
});
