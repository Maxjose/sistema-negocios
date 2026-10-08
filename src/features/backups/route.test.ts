// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ profile: vi.fn(), create: vi.fn(), list: vi.fn(), restore: vi.fn(), revalidate: vi.fn(), download: vi.fn() }));
vi.mock("@/lib/auth/session", () => ({ getCurrentProfile: mocks.profile }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
vi.mock("@/features/backups/service", () => ({ createBackup: mocks.create, listBackups: mocks.list, restoreBackup: mocks.restore, downloadBackup: mocks.download, prepareImport: vi.fn(), completeImport: vi.fn(), previewBackup: vi.fn() }));
import { GET, POST } from "@/app/api/admin/backups/route";
const id = "00000000-0000-4000-8000-000000000001";
function post(body: unknown, origin = "https://www.moniiapp.com") {
  return new Request("https://www.moniiapp.com/api/admin/backups", { method: "POST", headers: { origin, "content-type": "application/json" }, body: JSON.stringify(body) });
}
beforeEach(() => { vi.clearAllMocks(); mocks.profile.mockResolvedValue({ id, role: "super_admin", must_change_password: false }); });
describe("backup API authorization", () => {
  it("denies anonymous, owners and accounts awaiting password change", async () => {
    for (const profile of [null, { id, role: "owner" }, { id, role: "super_admin", must_change_password: true }]) {
      mocks.profile.mockResolvedValue(profile);
      expect((await GET(new Request("https://www.moniiapp.com/api/admin/backups"))).status).toBe(403);
      expect((await POST(post({ operation: "create", businessId: null }))).status).toBe(403);
    }
    expect(mocks.create).not.toHaveBeenCalled(); expect(mocks.list).not.toHaveBeenCalled();
  });
  it("denies foreign-origin writes before consulting any credentials", async () => {
    expect((await POST(post({ operation: "restore", id, confirmation: "RESTAURAR TODOS" }, "https://foreign.example"))).status).toBe(403);
    expect(mocks.restore).not.toHaveBeenCalled(); expect(mocks.profile).not.toHaveBeenCalled();
  });
  it("requires a valid operation and UUID, and bounds payloads", async () => {
    expect((await POST(post({ operation: "restore", id: "bad", confirmation: "" }))).status).toBe(400);
    expect((await POST(post({ operation: "create", businessId: id, extra: "x" }))).status).toBe(400);
    expect((await POST(post({ operation: "create", businessId: null, oversized: "a".repeat(5000) }))).status).toBe(413);
    expect(mocks.restore).not.toHaveBeenCalled();
  });
  it("uses the authenticated actor and invalidates pages after a successful restore", async () => {
    mocks.restore.mockResolvedValue({ safetyId: id });
    const response = await POST(post({ operation: "restore", id, confirmation: "RESTAURAR TODOS" }));
    expect(response.status).toBe(200); expect(response.headers.get("cache-control")).toContain("no-store");
    expect(mocks.restore).toHaveBeenCalledWith(id, id, "RESTAURAR TODOS");
    expect(mocks.revalidate).toHaveBeenCalledWith("/", "layout");
  });
  it("returns a private short-lived download redirect", async () => {
    mocks.download.mockResolvedValue("https://storage.example/signed/file");
    const response = await GET(new Request(`https://www.moniiapp.com/api/admin/backups?download=${id}`));
    expect(response.status).toBe(303); expect(response.headers.get("cache-control")).toContain("no-store");
    expect(response.headers.get("location")).toBe("https://storage.example/signed/file");
  });
});
