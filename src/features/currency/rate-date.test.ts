import { describe, expect, it } from "vitest";
import { normalizeEffectiveDate } from "@/features/currency/rate-date";

describe("exchange-rate effective dates", () => {
  it.each([
    ["2026-08-11T00:00:00.000", "2026-08-11"],
    ["11/08/2026", "2026-08-11"],
    ["Martes, 11 de agosto de 2026", "2026-08-11"],
    ["Miércoles, 9 Septiembre 2026", "2026-09-09"],
  ])("normalizes %s", (source, expected) => {
    expect(normalizeEffectiveDate(source)).toBe(expected);
  });

  it("rejects impossible dates", () => {
    expect(() => normalizeEffectiveDate("31/02/2026")).toThrow();
  });
});
