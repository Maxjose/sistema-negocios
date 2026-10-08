import "server-only";
import { randomUUID } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPublicEnv } from "@/lib/env";
import { BackupError, backupCounts, decodeBackup, detectImageType, encodeBackup, referencedAssets, sha256 } from "./format";
import { BACKUP_BUCKET, MAX_ARCHIVE_BYTES, type BackupContent, type BackupPreview, type BackupRecord, type DatabaseSnapshot } from "./types";

type StoredBackup = BackupRecord & { storage_path: string; sha256: string | null; created_by: string; restore_token: string | null };
function projectIdentity() { return new URL(getPublicEnv().NEXT_PUBLIC_SUPABASE_URL).origin; }
function check(error: { message: string } | null) { if (error) throw new Error(error.message); }
function ensureTime(deadline: number) { if (Date.now() > deadline) throw new BackupError("El respaldo requiere más tiempo del permitido. Los datos no se han reemplazado; intenta un respaldo por negocio."); }

async function snapshot(actorId: string, businessId: string | null): Promise<DatabaseSnapshot> {
  const { data, error } = await createAdminClient().rpc("export_business_backup", { p_actor: actorId, p_business_id: businessId });
  check(error);
  return data as DatabaseSnapshot;
}
async function makeContent(raw: DatabaseSnapshot, businessId: string | null, deadline: number): Promise<BackupContent> {
  const admin = createAdminClient();
  const content: BackupContent = { format: "monii-backup", version: 1, source_project: projectIdentity(), scope: businessId ? "business" : "platform", business_id: businessId, snapshot: structuredClone(raw), assets: [] };
  const paths = [...referencedAssets(raw.data)];
  // Bound concurrency and total media size instead of launching every download.
  let total = 0;
  if (paths.length > 2000) throw new BackupError("Demasiadas imágenes para un respaldo único.");
  for (let offset = 0; offset < paths.length; offset += 4) {
    ensureTime(deadline);
    const batch = await Promise.all(paths.slice(offset, offset + 4).map(async (path) => {
      const { data, error } = await admin.storage.from("business-assets").download(path);
      if (error || !data) throw new BackupError("No se pudo respaldar una foto o logo. No se guardó una copia incompleta.");
      if (data.size > 5 * 1024 * 1024) throw new BackupError("Una imagen supera el tamaño permitido.");
      const buffer = Buffer.from(await data.arrayBuffer());
      const type = detectImageType(buffer);
      if (!type) throw new BackupError("Una foto o logo tiene un formato no compatible.");
      return { path, content_type: type, data: buffer.toString("base64"), sha256: sha256(buffer), size: buffer.length };
    }));
    for (const asset of batch) {
      total += asset.size;
      if (total > 100 * 1024 * 1024) throw new BackupError("Las imágenes superan el límite de 100 MB por respaldo.");
      const { size: _size, ...entry } = asset;
      void _size;
      content.assets.push(entry);
    }
  }
  for (let offset = 0; offset < content.snapshot.data.profiles.length; offset += 8) {
    ensureTime(deadline);
    await Promise.all(content.snapshot.data.profiles.slice(offset, offset + 8).map(async (profile) => {
      const { data, error } = await admin.auth.admin.getUserById(String(profile.id));
      check(error);
      profile.email = data.user?.email ?? null;
    }));
  }
  return content;
}
async function newRecord(actorId: string, businessId: string | null, kind: BackupRecord["kind"], token?: string) {
  const id = randomUUID();
  const record = { id, business_id: businessId, scope: businessId ? "business" : "platform", kind, created_by: actorId, restore_token: token ?? null,
    label: kind === "safety" ? "Seguridad antes de restaurar" : kind === "imported" ? "Respaldo importado" : "Respaldo manual",
    storage_path: `${businessId ?? "platform"}/${id}.monii.json.gz` };
  const { error } = await createAdminClient().from("business_backups").insert(record);
  check(error);
  return record;
}
async function markFailure(id: string) {
  await createAdminClient().from("business_backups").update({ status: "failed", error_message: "No se pudo completar o validar el respaldo." }).eq("id", id);
}
async function saveContent(actorId: string, businessId: string | null, kind: BackupRecord["kind"], content: BackupContent, token?: string) {
  const record = await newRecord(actorId, businessId, kind, token);
  try {
    const archive = encodeBackup(content);
    const admin = createAdminClient();
    const { error: uploadError } = await admin.storage.from(BACKUP_BUCKET).upload(record.storage_path, archive, { contentType: "application/gzip", upsert: false });
    check(uploadError);
    const { error } = await admin.from("business_backups").update({ status: "ready", size_bytes: archive.length, sha256: sha256(archive), schema_fingerprint: content.snapshot.schema, captured_at: content.snapshot.captured_at, counts: backupCounts(content.snapshot.data) }).eq("id", record.id);
    check(error);
    return record.id;
  } catch (error) { await markFailure(record.id); throw error; }
}
async function loadRecord(id: string): Promise<StoredBackup> {
  const { data, error } = await createAdminClient().from("business_backups").select("*").eq("id", id).maybeSingle();
  check(error);
  if (!data) throw new BackupError("El respaldo no existe.");
  return data as StoredBackup;
}
async function readContent(record: StoredBackup) {
  const { data, error } = await createAdminClient().storage.from(BACKUP_BUCKET).download(record.storage_path);
  if (error || !data) throw new BackupError("No se pudo leer el archivo del respaldo.");
  if (data.size > MAX_ARCHIVE_BYTES) throw new BackupError("El archivo supera 50 MB.");
  const buffer = Buffer.from(await data.arrayBuffer());
  if (record.sha256 && sha256(buffer) !== record.sha256) throw new BackupError("El respaldo almacenado está dañado o fue modificado.");
  return { buffer, content: decodeBackup(buffer, projectIdentity(), record.business_id) };
}
async function validateCompatibility(content: BackupContent) {
  const admin = createAdminClient();
  const { data: fingerprint, error } = await admin.rpc("backup_schema_fingerprint");
  check(error);
  if (fingerprint !== content.snapshot.schema) throw new BackupError("La estructura de la base de datos cambió. Este respaldo requiere una adaptación antes de restaurarlo.");
  for (let offset = 0; offset < content.snapshot.data.profiles.length; offset += 100) {
    const rows = content.snapshot.data.profiles.slice(offset, offset + 100);
    const { data, error: profileError } = await admin.from("profiles").select("id, role, business_id").in("id", rows.map((item) => String(item.id)));
    check(profileError);
    const profiles = new Map((data ?? []).map((item) => [item.id, item]));
    for (const item of rows) {
      const current = profiles.get(String(item.id));
      if (!current || current.role !== item.role || item.role === "owner" && current.business_id !== item.business_id) throw new BackupError("Un usuario del respaldo fue eliminado, reasignado o cambió de rol. Debes resolverlo antes de restaurar.");
    }
  }
}
function preview(record: StoredBackup, content: BackupContent): BackupPreview {
  return { id: record.id, scope: record.scope, captured_at: content.snapshot.captured_at,
    businesses: content.snapshot.data.businesses.map((item) => ({ id: String(item.id), name: String(item.name) })),
    counts: backupCounts(content.snapshot.data), assets: content.assets.length,
    confirmation: record.scope === "platform" ? "RESTAURAR TODOS" : "RESTAURAR NEGOCIO" };
}
export async function listBackups(businessId: string | null, page: number) {
  const admin = createAdminClient();
  await admin.from("business_backups").update({ status: "failed", error_message: "La operación no terminó. Crea o importa una nueva copia." }).eq("status", "creating").lt("created_at", new Date(Date.now() - 20 * 60 * 1000).toISOString());
  let query = admin.from("business_backups").select("id, business_id, scope, kind, status, label, created_at, captured_at, size_bytes, counts, error_message", { count: "exact" }).order("created_at", { ascending: false }).order("id").range((page - 1) * 10, page * 10 - 1);
  query = businessId ? query.eq("business_id", businessId) : query.is("business_id", null);
  const { data, error, count } = await query;
  check(error);
  return { records: (data ?? []) as BackupRecord[], total: count ?? 0 };
}
export async function createBackup(actorId: string, businessId: string | null) {
  const deadline = Date.now() + 210000;
  const content = await makeContent(await snapshot(actorId, businessId), businessId, deadline);
  ensureTime(deadline);
  const id = await saveContent(actorId, businessId, "manual", content);
  await createAdminClient().from("audit_logs").insert({ business_id: businessId, actor_user_id: actorId, action: "backup.created", entity_type: "backup", entity_id: id });
  return id;
}
export async function prepareImport(actorId: string, businessId: string | null) {
  // Check the business exists and validate admin permissions in the SQL engine.
  if (businessId) { const { data } = await createAdminClient().from("businesses").select("id").eq("id", businessId).maybeSingle(); if (!data) throw new BackupError("Negocio no encontrado."); }
  const record = await newRecord(actorId, businessId, "imported");
  const { data, error } = await createAdminClient().storage.from(BACKUP_BUCKET).createSignedUploadUrl(record.storage_path);
  check(error);
  if (!data) throw new BackupError("No se pudo preparar la importación.");
  return { id: record.id, path: record.storage_path, token: data.token };
}
export async function completeImport(actorId: string, id: string) {
  const record = await loadRecord(id);
  if (record.created_by !== actorId || record.kind !== "imported" || record.status !== "creating") throw new BackupError("La importación no está disponible.");
  try {
    const { buffer, content } = await readContent(record);
    await validateCompatibility(content);
    const { error } = await createAdminClient().from("business_backups").update({ status: "ready", size_bytes: buffer.length, sha256: sha256(buffer), schema_fingerprint: content.snapshot.schema, captured_at: content.snapshot.captured_at, counts: backupCounts(content.snapshot.data) }).eq("id", id).eq("status", "creating");
    check(error);
    await createAdminClient().from("audit_logs").insert({ business_id: record.business_id, actor_user_id: actorId, action: "backup.imported", entity_type: "backup", entity_id: id });
    return preview(record, content);
  } catch (error) { await markFailure(id); throw error; }
}
export async function previewBackup(id: string) {
  const record = await loadRecord(id);
  if (record.status !== "ready") throw new BackupError("El respaldo todavía no está listo.");
  const { content } = await readContent(record);
  await validateCompatibility(content);
  return preview(record, content);
}
export async function downloadBackup(id: string) {
  const record = await loadRecord(id);
  if (record.status !== "ready") throw new BackupError("El respaldo no está listo.");
  const { data, error } = await createAdminClient().storage.from(BACKUP_BUCKET).createSignedUrl(record.storage_path, 60, { download: `monii-${record.scope}-${record.id}.json.gz` });
  check(error);
  return data!.signedUrl;
}
export async function restoreBackup(actorId: string, id: string, confirmation: string) {
  const deadline = Date.now() + 210000;
  const record = await loadRecord(id);
  if (record.status !== "ready") throw new BackupError("El respaldo no está listo.");
  const expected = record.scope === "platform" ? "RESTAURAR TODOS" : "RESTAURAR NEGOCIO";
  if (confirmation !== expected) throw new BackupError("Escribe la frase de confirmación exactamente.");
  const { content } = await readContent(record);
  await validateCompatibility(content);
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("begin_backup_restore", { p_actor: actorId, p_business_id: record.business_id });
  check(error);
  const lock = data as { token: string; snapshot: DatabaseSnapshot };
  let applied = false;
  try {
    const safety = await makeContent(lock.snapshot, record.business_id, deadline);
    const safetyId = await saveContent(actorId, record.business_id, "safety", safety, lock.token);
    // Stage media under NEW names. Failure can leave orphan media, but never
    // overwrites the original files or alters references before SQL commits.
    const paths = new Map<string, string>();
    const staged = structuredClone(content.snapshot);
    for (const asset of content.assets) {
      ensureTime(deadline);
      const business = asset.path.split("/")[0];
      const extension = asset.content_type === "image/png" ? "png" : asset.content_type === "image/jpeg" ? "jpg" : "webp";
      const path = `${business}/restored/${randomUUID()}.${extension}`;
      const { error: uploadError } = await admin.storage.from("business-assets").upload(path, Buffer.from(asset.data, "base64"), { contentType: asset.content_type, upsert: false });
      check(uploadError);
      paths.set(asset.path, path);
    }
    for (const row of staged.data.businesses) if (row.logo_path) row.logo_path = paths.get(String(row.logo_path));
    for (const row of staged.data.products) if (row.image_path) row.image_path = paths.get(String(row.image_path));
    ensureTime(deadline);
    const { error: restoreError } = await admin.rpc("restore_business_backup", { p_actor: actorId, p_token: lock.token, p_backup_id: id, p_safety_id: safetyId, p_snapshot: staged });
    check(restoreError);
    applied = true;
    return { safetyId };
  } finally {
    const { error: releaseError } = await admin.rpc("finish_backup_restore", { p_actor: actorId, p_token: lock.token });
    if (releaseError) console.error("Backup restore lease release failed", { applied, code: releaseError.code });
  }
}
