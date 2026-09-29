export type BcvTodayPayload = {
  USD?: unknown;
  date?: unknown;
  effective_date?: unknown;
  updated_at?: unknown;
  [key: string]: unknown;
};

export function parseBcvTodayPayload(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("BCV Today devolvió una respuesta inválida.");
  }

  const payload = value as BcvTodayPayload;
  const rate = Number(payload.USD);
  const effectiveDate = payload.effective_date ?? payload.date;

  if (!Number.isFinite(rate) || rate <= 0) {
    throw new Error("BCV Today no devolvió una tasa USD válida.");
  }
  if (typeof effectiveDate !== "string" || !effectiveDate.trim()) {
    throw new Error("BCV Today no devolvió la fecha efectiva.");
  }

  return { rate, effectiveDate, raw: payload };
}
