import { describe, expect, it } from "vitest";
import { effectiveRate, roundConverted } from "@/features/currency/conversion";

describe("currency conversion", () => {
  it("applies the business adjustment only to automatic rates", () => {
    expect(effectiveRate({ automaticRate: 100, manualRate: null, mode: "automatic", adjustmentPercent: 3 })).toBe(103);
    expect(effectiveRate({ automaticRate: 100, manualRate: 120, mode: "manual", adjustmentPercent: 3 })).toBe(120);
  });

  it("rounds converted values using the configured increment", () => {
    expect(roundConverted(10, 3_912.34, 100)).toBe(39_100);
    expect(roundConverted(10, 761.22, 0.01)).toBe(7_612.2);
  });
});
