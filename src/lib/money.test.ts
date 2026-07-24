import { describe, expect, it } from "vitest";

import { formatMoney } from "@/lib/money";

describe("formatMoney", () => {
  it("formats an amount using the business currency", () => {
    expect(formatMoney(1250.5, "USD", "en-US")).toBe("$1,250.50");
  });
});
