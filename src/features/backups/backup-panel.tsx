"use client";

import { DatabaseBackup, Download, LoaderCircle, RotateCcw, Upload, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { BACKUP_BUCKET, MAX_ARCHIVE_BYTES, type BackupPreview, type BackupRecord } from "./types";

async function operation<T>(input: Record<string, unknown>): Promise<T> {
  const response = await fetch("/api/admin/backups", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) });
  if (!response.headers.get("content-type")?.includes("application/json")) throw new Error("El servidor no respondió a tiempo. Revisa el historial antes de repetir la operación.");
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? "No se pudo completar la operación.");
  return data as T;
}
const countLabels: Record<string, string> = { businesses: "Negocios", profiles: "Perfiles incluidos", products: "Productos", sales: "Ventas", customers: "Clientes", receivables: "Cuentas por cobrar", receivable_payments: "Abonos" };
function date(value: string) { return new Date(value).toLocaleString("es-VE", { dateStyle: "medium", timeStyle: "short" }); }

function RestoreDialog({ preview, busy, error, onClose, onRestore }: { preview: BackupPreview; busy: boolean; error: string | null; onClose: () => void; onRestore: (confirmation: string) => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [confirmation, setConfirmation] = useState("");
  useEffect(() => { ref.current?.showModal(); }, []);
  return <dialog aria-labelledby="restore-title" className="m-auto max-h-[calc(100dvh_-_2rem)] w-[calc(100%_-_2rem)] max-w-xl overflow-y-auto rounded-2xl border bg-surface p-5 text-foreground shadow-2xl backdrop:bg-black/60 sm:p-7" onCancel={(event) => { if (busy) event.preventDefault(); else onClose(); }} ref={ref}>
    <div className="flex items-center justify-between gap-3"><h3 className="text-lg font-bold" id="restore-title">Confirmar restauración</h3><button aria-label="Cerrar" className="grid size-10 place-items-center rounded-xl hover:bg-accent disabled:opacity-50" disabled={busy} onClick={onClose} type="button"><X className="size-5" /></button></div>
    <p className="mt-3 text-sm">Copia del {date(preview.captured_at)}.</p>
    <p className="mt-2 break-words text-sm font-semibold">{preview.scope === "platform" ? "Todos los negocios" : preview.businesses[0]?.name}</p>
    <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl border p-3 text-sm">{Object.entries(countLabels).map(([key, label]) => <div key={key}><span className="text-muted">{label}: </span><strong>{preview.counts[key] ?? 0}</strong></div>)}<div><span className="text-muted">Fotos y logos: </span><strong>{preview.assets}</strong></div></div>
    <div className="mt-4 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm leading-6">
      Se reemplazarán los datos actuales por los de esta copia. Las ventas, productos y abonos posteriores pueden perderse. Primero se guardará un respaldo de seguridad y se pausarán temporalmente las escrituras de toda la aplicación.
      {preview.scope === "platform" ? <p className="mt-2 font-semibold">Los negocios y propietarios creados después de esta copia quedarán inactivos.</p> : null}
    </div>
    <p className="mt-3 text-xs leading-5 text-muted">Se conservan las contraseñas, los super admins y el registro de actividad actual. No cierres esta ventana durante la restauración.</p>
    <label className="mt-5 block text-sm font-semibold" htmlFor="restore-confirmation">Escribe {preview.confirmation}</label>
    <input autoComplete="off" className="mt-2 min-h-11 w-full rounded-xl border bg-background px-3" disabled={busy} id="restore-confirmation" onChange={(event) => setConfirmation(event.target.value)} value={confirmation} />
    {error ? <p className="mt-3 text-sm text-red-600 dark:text-red-400" role="alert">{error}</p> : null}
    <div className="mt-5 flex flex-wrap justify-end gap-2"><button className="min-h-11 rounded-xl border px-4 text-sm font-semibold disabled:opacity-50" disabled={busy} onClick={onClose} type="button">Cancelar</button><button className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-red-600 px-4 text-sm font-semibold text-white disabled:opacity-50" disabled={busy || confirmation !== preview.confirmation} onClick={() => onRestore(confirmation)} type="button">{busy ? <LoaderCircle className="size-4 animate-spin" /> : <RotateCcw className="size-4" />}{busy ? "Restaurando…" : "Restaurar respaldo"}</button></div>
  </dialog>;
}

export function BackupPanel({ businessId = null }: { businessId?: string | null }) {
  const router = useRouter();
  const [records, setRecords] = useState<BackupRecord[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [preview, setPreview] = useState<BackupPreview | null>(null);
  const [revision, setRevision] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ page: String(page) });
    if (businessId) params.set("businessId", businessId);
    fetch(`/api/admin/backups?${params}`, { signal: controller.signal, cache: "no-store" }).then(async (response) => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "No se pudieron cargar los respaldos.");
      setRecords(data.records); setTotal(data.total); setLoading(false);
    }).catch((reason) => { if (!controller.signal.aborted) { setError(reason instanceof Error ? reason.message : "No se pudieron cargar los respaldos."); setLoading(false); } });
    return () => controller.abort();
  }, [businessId, page, revision]);
  function refresh() { setPage(1); setRevision((value) => value + 1); }
  async function run(label: string, work: () => Promise<void>) {
    if (busy) return;
    setBusy(label); setError(null); setNotice(null);
    try { await work(); } catch (reason) { setError(reason instanceof Error ? reason.message : "Ocurrió un error."); }
    finally { setBusy(null); refresh(); }
  }
  async function importFile(file: File) {
    if (file.size > MAX_ARCHIVE_BYTES || !file.name.endsWith(".json.gz")) { setError("Selecciona un respaldo de Monii App (.json.gz), de hasta 50 MB."); return; }
    await run("Subiendo y validando…", async () => {
      const upload = await operation<{ id: string; path: string; token: string }>({ operation: "import-start", businessId });
      const { error } = await createClient().storage.from(BACKUP_BUCKET).uploadToSignedUrl(upload.path, upload.token, file, { contentType: "application/gzip" });
      if (error) throw new Error("No se pudo subir el archivo. Inténtalo nuevamente.");
      const detail = await operation<BackupPreview>({ operation: "import-complete", id: upload.id });
      setNotice("Respaldo importado y validado. Todavía no se han reemplazado datos.");
      setPreview(detail);
    });
  }
  return <section className="mt-6 min-w-0 rounded-2xl border bg-surface p-5 sm:p-7">
    <div className="flex items-start gap-3"><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-accent text-brand"><DatabaseBackup className="size-5" /></span><div className="min-w-0"><h3 className="font-bold">{businessId ? "Respaldos del negocio" : "Respaldo total"}</h3><p className="mt-2 text-sm leading-6 text-muted">{businessId ? "Datos, usuarios asociados, ventas, deudas, fotos y logotipo de este negocio." : "Datos de todos los negocios, imágenes y ajustes globales en un solo archivo."}</p></div></div>
    <p className="mt-3 text-xs leading-5 text-muted">Sin contraseñas, sesiones ni claves de API. Se restaura únicamente en este proyecto. Los usuarios deben seguir existiendo con su mismo negocio. Los archivos descargados contienen información privada: guárdalos en un lugar seguro.</p>
    <div className="mt-5 flex flex-wrap gap-2"><button className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-brand px-4 text-sm font-semibold text-white disabled:opacity-50" disabled={Boolean(busy)} onClick={() => run("Generando respaldo…", async () => { await operation({ operation: "create", businessId }); setNotice("Respaldo completo guardado. Ya puedes descargarlo."); })} type="button"><DatabaseBackup className="size-4" />Crear respaldo</button><button className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-semibold disabled:opacity-50" disabled={Boolean(busy)} onClick={() => fileRef.current?.click()} type="button"><Upload className="size-4" />Importar respaldo</button><input accept=".json.gz,application/gzip" aria-label="Archivo de respaldo" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) void importFile(file); event.target.value = ""; }} ref={fileRef} type="file" /></div>
    {busy ? <p aria-live="polite" className="mt-4 flex items-center gap-2 text-sm text-brand"><LoaderCircle className="size-4 animate-spin" />{busy}</p> : null}
    {error && !preview ? <p className="mt-4 text-sm text-red-600 dark:text-red-400" role="alert">{error}</p> : null}
    {notice ? <p className="mt-4 text-sm text-brand" role="status">{notice}</p> : null}
    <div className="mt-5 space-y-3">{loading ? <p className="text-sm text-muted">Cargando respaldos…</p> : !records.length ? <p className="text-sm text-muted">Aún no hay respaldos guardados.</p> : records.map((record) => <article className="flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between" key={record.id}>
      <div className="min-w-0"><p className="font-semibold">{record.label}</p><p className="mt-1 text-xs text-muted">{date(record.captured_at ?? record.created_at)}{record.size_bytes ? ` · ${(record.size_bytes / 1048576).toFixed(2)} MB` : ""}</p><p className="mt-1 text-xs text-muted">{record.status === "ready" ? `${record.counts.products ?? 0} productos · ${record.counts.sales ?? 0} ventas` : record.status === "failed" ? record.error_message ?? "Respaldo incompleto" : "Pendiente o en proceso; no se puede restaurar"}</p></div>
      {record.status === "ready" ? <div className="flex shrink-0 gap-2"><a aria-disabled={Boolean(busy)} className={`inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg border px-3 text-xs font-semibold ${busy ? "pointer-events-none opacity-50" : ""}`} href={`/api/admin/backups?download=${record.id}`}><Download className="size-4" />Descargar</a><button className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg border px-3 text-xs font-semibold disabled:opacity-50" disabled={Boolean(busy)} onClick={() => run("Validando respaldo…", async () => { setPreview(await operation<BackupPreview>({ operation: "preview", id: record.id })); })} type="button"><RotateCcw className="size-4" />Restaurar</button></div> : null}
    </article>)}</div>
    {total > 10 ? <div className="mt-5 flex items-center justify-between gap-2 text-sm"><button className="min-h-10 rounded-lg border px-3 disabled:opacity-50" disabled={page === 1 || Boolean(busy)} onClick={() => setPage((value) => value - 1)} type="button">Anterior</button><span className="text-muted">{page} / {Math.ceil(total / 10)}</span><button className="min-h-10 rounded-lg border px-3 disabled:opacity-50" disabled={page * 10 >= total || Boolean(busy)} onClick={() => setPage((value) => value + 1)} type="button">Siguiente</button></div> : null}
    {preview ? <RestoreDialog busy={busy === "Restaurando…"} error={error} onClose={() => { setPreview(null); setError(null); }} onRestore={(confirmation) => run("Restaurando…", async () => { await operation({ operation: "restore", id: preview.id, confirmation }); setPreview(null); setNotice("Restauración completada. El respaldo de seguridad quedó guardado en el historial."); router.refresh(); })} preview={preview} /> : null}
  </section>;
}
