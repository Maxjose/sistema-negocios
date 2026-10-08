import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
const mocks = vi.hoisted(() => ({ refresh: vi.fn(), upload: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: mocks.refresh }) }));
vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({ storage: { from: () => ({ uploadToSignedUrl: mocks.upload }) } }) }));
import { BackupPanel } from "./backup-panel";
const id = "00000000-0000-4000-8000-000000000001";
const record = { id, scope: "business", business_id: id, kind: "manual", status: "ready", label: "Respaldo manual", created_at: "2026-10-08T12:00:00Z", captured_at: "2026-10-08T12:00:00Z", size_bytes: 1000, counts: { products: 1, sales: 2 } };
const detail = { id, scope: "business", captured_at: record.captured_at, businesses: [{ id, name: "Quesería" }], counts: record.counts, assets: 0, confirmation: "RESTAURAR NEGOCIO" };
const requests: Record<string, unknown>[] = [];
beforeEach(() => {
  requests.length = 0; vi.clearAllMocks();
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", { configurable: true, value: function(this: HTMLDialogElement) { this.setAttribute("open", ""); } });
  mocks.upload.mockResolvedValue({ error: null });
  vi.stubGlobal("fetch", vi.fn(async (_url: string, init?: RequestInit) => {
    if (!init?.body) return Response.json({ records: [record], total: 1 });
    const input = JSON.parse(String(init.body)); requests.push(input);
    if (input.operation === "import-start") return Response.json({ id, path: "private/file", token: "signed-test-token" });
    if (input.operation === "restore") return Response.json({ safetyId: id });
    return Response.json(detail);
  }));
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
describe("backup management UI", () => {
  it("requires a web popup and exact confirmation before restoring", async () => {
    render(<BackupPanel businessId={id} />);
    fireEvent.click(await screen.findByRole("button", { name: "Restaurar" }));
    await screen.findByRole("dialog");
    expect(requests.some((input) => input.operation === "restore")).toBe(false);
    const restore = screen.getByRole("button", { name: "Restaurar respaldo" });
    expect((restore as HTMLButtonElement).disabled).toBe(true);
    const input = screen.getByLabelText("Escribe RESTAURAR NEGOCIO");
    fireEvent.change(input, { target: { value: "restaurar" } });
    expect((restore as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(input, { target: { value: "RESTAURAR NEGOCIO" } });
    fireEvent.click(restore);
    await waitFor(() => expect(requests).toContainEqual({ operation: "restore", id, confirmation: "RESTAURAR NEGOCIO" }));
    await screen.findByText("Restauración completada. El respaldo de seguridad quedó guardado en el historial.");
    expect(mocks.refresh).toHaveBeenCalled();
  });
  it("importing uploads directly and previews without replacing any data", async () => {
    render(<BackupPanel businessId={id} />);
    await screen.findByText("Respaldo manual");
    fireEvent.change(screen.getByLabelText("Archivo de respaldo"), { target: { files: [new File(["archive"], "monii.json.gz", { type: "application/gzip" })] } });
    await screen.findByRole("dialog");
    expect(mocks.upload).toHaveBeenCalled();
    expect(requests.map((input) => input.operation)).toEqual(["import-start", "import-complete"]);
    expect(screen.getByText("Respaldo importado y validado. Todavía no se han reemplazado datos.")).toBeTruthy();
  });
  it("rejects unsupported files before sending an upload request", async () => {
    render(<BackupPanel businessId={id} />);
    await screen.findByText("Respaldo manual");
    fireEvent.change(screen.getByLabelText("Archivo de respaldo"), { target: { files: [new File(["archive"], "sales.csv")] } });
    expect(screen.getByRole("alert").textContent).toContain(".json.gz");
    expect(requests).toHaveLength(0);
  });
});
