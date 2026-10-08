import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentProfile } from "@/lib/auth/session";
import { BackupError } from "@/features/backups/format";
import { completeImport, createBackup, downloadBackup, listBackups, prepareImport, previewBackup, restoreBackup } from "@/features/backups/service";

export const maxDuration = 300;
const noStore = { "Cache-Control": "private, no-store" };
const scopeSchema = z.uuid().nullable();
const inputSchema = z.discriminatedUnion("operation", [
  z.object({ operation: z.literal("create"), businessId: scopeSchema }).strict(),
  z.object({ operation: z.literal("import-start"), businessId: scopeSchema }).strict(),
  z.object({ operation: z.literal("import-complete"), id: z.uuid() }).strict(),
  z.object({ operation: z.literal("preview"), id: z.uuid() }).strict(),
  z.object({ operation: z.literal("restore"), id: z.uuid(), confirmation: z.string().max(80) }).strict(),
]);
async function actor() {
  const profile = await getCurrentProfile();
  return profile?.role === "super_admin" && !profile.must_change_password ? profile : null;
}
function failure(error: unknown) {
  if (error instanceof BackupError) return Response.json({ error: error.message }, { status: 400, headers: noStore });
  const message = error instanceof Error ? error.message : "";
  const known: Record<string, string> = {
    RESTORE_IN_PROGRESS: "Hay una restauración en curso. Espera a que termine.",
    RESTORE_LOCK_EXPIRED: "El tiempo de restauración se agotó. Los datos no se reemplazaron.",
    BACKUP_USERS_CHANGED: "Los usuarios del respaldo ya no coinciden con los actuales.",
    BACKUP_TOO_LARGE: "Los datos superan el límite del respaldo. Prueba un respaldo por negocio.",
    INCOMPATIBLE_BACKUP_SCHEMA: "El respaldo no es compatible con la estructura actual.",
  };
  console.error("Backup operation failed", { reason: Object.keys(known).find((key) => message.includes(key)) ?? "server_error" });
  return Response.json({ error: Object.entries(known).find(([key]) => message.includes(key))?.[1] ?? "No se pudo completar la operación. Verifica la migración y vuelve a intentarlo." }, { status: 500, headers: noStore });
}
export async function GET(request: Request) {
  if (!await actor()) return Response.json({ error: "Acceso reservado al super admin." }, { status: 403, headers: noStore });
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get("download");
    if (id) {
      if (!z.uuid().safeParse(id).success) return Response.json({ error: "Identificador inválido." }, { status: 400, headers: noStore });
      return new Response(null, { status: 303, headers: { ...noStore, Location: await downloadBackup(id) } });
    }
    const businessId = url.searchParams.get("businessId");
    if (!scopeSchema.safeParse(businessId).success) return Response.json({ error: "Negocio inválido." }, { status: 400, headers: noStore });
    const page = Math.max(1, Math.min(100000, Number(url.searchParams.get("page")) || 1));
    return Response.json(await listBackups(businessId, Math.floor(page)), { headers: noStore });
  } catch (error) { return failure(error); }
}
export async function POST(request: Request) {
  // Cookie-authenticated mutations require same-origin requests (CSRF defense).
  if (request.headers.get("origin") !== new URL(request.url).origin) return Response.json({ error: "Origen de solicitud no permitido." }, { status: 403, headers: noStore });
  const profile = await actor();
  if (!profile) return Response.json({ error: "Acceso reservado al super admin." }, { status: 403, headers: noStore });
  try {
    if (Number(request.headers.get("content-length")) > 4096) return Response.json({ error: "Solicitud demasiado grande." }, { status: 413, headers: noStore });
    const text = await request.text();
    if (text.length > 4096) return Response.json({ error: "Solicitud demasiado grande." }, { status: 413, headers: noStore });
    const parsed = inputSchema.safeParse(JSON.parse(text));
    if (!parsed.success) return Response.json({ error: "Revisa los datos de la operación." }, { status: 400, headers: noStore });
    const input = parsed.data;
    let result: unknown;
    switch (input.operation) {
      case "create": result = { id: await createBackup(profile.id, input.businessId) }; break;
      case "import-start": result = await prepareImport(profile.id, input.businessId); break;
      case "import-complete": result = await completeImport(profile.id, input.id); break;
      case "preview": result = await previewBackup(input.id); break;
      case "restore":
        result = await restoreBackup(profile.id, input.id, input.confirmation);
        revalidatePath("/", "layout");
        break;
    }
    return Response.json(result, { headers: noStore });
  } catch (error) { return failure(error); }
}
