import { describe, expect, it } from "vitest";
import { parseBcvTodayPayload } from "./rate-provider";
import { rateAlertTransition } from "./rate-alert-policy";

describe("BCV Today provider", () => {
  it("reads the official USD rate and effective date", () => {
    expect(parseBcvTodayPayload({ USD: 501.25, effective_date: "2026-09-29" })).toMatchObject({
      rate: 501.25,
      effectiveDate: "2026-09-29",
    });
  });

  it("rejects malformed payloads", () => {
    expect(() => parseBcvTodayPayload({ USD: "not-a-rate", date: "2026-09-29" })).toThrow(
      "tasa USD válida",
    );
  });
});

describe("rate alert policy", () => {
  it("notifies only when an incident is new or changes", () => {
    expect(rateAlertTransition({ status: "current" }, { status: "error", message: "Sin conexión" })).toBe("error");
    expect(rateAlertTransition({ status: "error", error_message: "Sin conexión" }, { status: "error", message: "Sin conexión" })).toBeNull();
    expect(rateAlertTransition({ status: "error", error_message: "Sin conexión" }, { status: "error", message: "Respuesta inválida" })).toBe("error");
  });

  it("notifies when the provider recovers", () => {
    expect(rateAlertTransition({ status: "error" }, { status: "current" })).toBe("recovery");
  });
});
