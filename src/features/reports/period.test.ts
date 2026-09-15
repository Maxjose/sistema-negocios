import { describe, expect, it } from "vitest";
import { resolveSalesPeriod, salesPeriodUtcBounds } from "./period";

describe("resolveSalesPeriod", () => {
  const now = new Date("2026-09-14T15:00:00Z");
  it("resolves the current week from Monday", () => {
    expect(resolveSalesPeriod({ period: "week" }, "America/Caracas", now)).toEqual({
      period: "week", from: "2026-09-14", to: "2026-09-14",
    });
  });
  it("normalizes an inverted custom range", () => {
    expect(resolveSalesPeriod({ period: "custom", from: "2026-09-14", to: "2026-09-10" }, "America/Bogota", now)).toEqual({
      period: "custom", from: "2026-09-10", to: "2026-09-14",
    });
  });
});

describe("salesPeriodUtcBounds", () => {
  it("converts Caracas calendar days to an exclusive UTC range", () => {
    expect(salesPeriodUtcBounds("2026-09-14", "2026-09-14", "America/Caracas")).toEqual({
      from: "2026-09-14T04:00:00.000Z", until: "2026-09-15T04:00:00.000Z",
    });
  });
});
