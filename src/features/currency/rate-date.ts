const SPANISH_MONTHS: Record<string, number> = {
  enero: 1,
  febrero: 2,
  marzo: 3,
  abril: 4,
  mayo: 5,
  junio: 6,
  julio: 7,
  agosto: 8,
  septiembre: 9,
  setiembre: 9,
  octubre: 10,
  noviembre: 11,
  diciembre: 12,
};

function isoDate(year: number, month: number, day: number) {
  const candidate = new Date(Date.UTC(year, month - 1, day));
  if (
    candidate.getUTCFullYear() !== year ||
    candidate.getUTCMonth() !== month - 1 ||
    candidate.getUTCDate() !== day
  ) {
    throw new Error("La fuente devolvió una fecha efectiva inválida.");
  }
  return `${year.toString().padStart(4, "0")}-${month.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
}

export function normalizeEffectiveDate(value: string) {
  const trimmed = value.trim();
  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return isoDate(Number(isoMatch[1]), Number(isoMatch[2]), Number(isoMatch[3]));

  const numericMatch = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  if (numericMatch) return isoDate(Number(numericMatch[3]), Number(numericMatch[2]), Number(numericMatch[1]));

  const normalized = trimmed
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  const spanishMatch = normalized.match(/(?:[a-z]+,?\s+)?(\d{1,2})\s+(?:de\s+)?([a-z]+)\s+(?:de\s+)?(\d{4})/);
  if (spanishMatch) {
    const month = SPANISH_MONTHS[spanishMatch[2]];
    if (month) return isoDate(Number(spanishMatch[3]), month, Number(spanishMatch[1]));
  }

  throw new Error("La fuente devolvió una fecha efectiva con un formato desconocido.");
}
