import { describe, expect, it } from "vitest";
import { formatQuantity, lineAmount, quantityFromInput } from "./measurement";

describe("weight measurements", () => {
  it("stores whole grams without losing fractional kilograms", () => {
    expect(quantityFromInput(0.35, "weight")).toBe(350);
    expect(quantityFromInput(1.234, "weight")).toBe(1234);
    expect(quantityFromInput(350, "weight", "g")).toBe(350);
    expect(() => quantityFromInput(0.0001, "weight")).toThrow();
    expect(() => quantityFromInput(2.5, "unit")).toThrow();
    expect(() => quantityFromInput(Infinity, "weight")).toThrow();
  });
  it("rounds each portion to cents and preserves unit pricing", () => {
    expect(lineAmount(10, 350, "weight")).toBe(3.5);
    expect(lineAmount(10, 1200, "weight")).toBe(12);
    expect(lineAmount(10.05, 100, "weight")).toBe(1.01);
    expect(lineAmount(10, 2, "unit")).toBe(20);
  });
  it("labels historical quantities with their own measure", () => {
    expect(formatQuantity(350, "weight")).toBe("350 g");
    expect(formatQuantity(1500, "weight")).toBe("1,5 kg");
    expect(formatQuantity(2, "unit")).toBe("2 unid.");
  });
});
