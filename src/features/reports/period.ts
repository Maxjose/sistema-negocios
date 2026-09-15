export type PeriodKey = "today" | "week" | "month" | "custom";
export type SalesPeriodKey = "today" | "yesterday" | "week" | "month" | "custom";
const iso = (date: Date) => date.toISOString().slice(0, 10);
const addDays = (date: Date, days: number) => new Date(date.getTime() + days * 86400000);

export function resolvePeriod(input: { period?: string; from?: string; to?: string }) {
  const todayText = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Caracas",
    year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());
  const today = new Date(`${todayText}T12:00:00Z`);
  const period: PeriodKey = ["today", "week", "month", "custom"].includes(input.period ?? "") ? input.period as PeriodKey : "month";
  let from: Date; let to = today;
  if (period === "today") from = today;
  else if (period === "week") from = addDays(today, -6);
  else if (period === "month") from = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1, 12));
  else {
    const valid = /^\d{4}-\d{2}-\d{2}$/;
    from = valid.test(input.from ?? "") ? new Date(`${input.from}T12:00:00Z`) : today;
    to = valid.test(input.to ?? "") ? new Date(`${input.to}T12:00:00Z`) : today;
    if (from > to) [from, to] = [to, from];
  }
  const days = Math.round((to.getTime() - from.getTime()) / 86400000) + 1;
  return {
    period, from: iso(from), to: iso(to),
    previousFrom: iso(addDays(from, -days)),
    previousTo: iso(addDays(from, -1)),
  };
}

const datePattern = /^\d{4}-\d{2}-\d{2}$/;

function localDateInTimeZone(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric", month: "2-digit", day: "2-digit",
  }).format(date);
}

function dateAtNoon(value: string) {
  return new Date(`${value}T12:00:00Z`);
}

export function resolveSalesPeriod(
  input: { period?: string; from?: string; to?: string },
  timeZone: string,
  now = new Date(),
) {
  const today = dateAtNoon(localDateInTimeZone(now, timeZone));
  const period: SalesPeriodKey = ["today", "yesterday", "week", "month", "custom"].includes(input.period ?? "")
    ? input.period as SalesPeriodKey
    : "month";
  let from = today;
  let to = today;
  if (period === "yesterday") {
    from = addDays(today, -1);
    to = from;
  } else if (period === "week") {
    from = addDays(today, -((today.getUTCDay() + 6) % 7));
  } else if (period === "month") {
    from = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1, 12));
  } else if (period === "custom") {
    from = datePattern.test(input.from ?? "") ? dateAtNoon(input.from!) : today;
    to = datePattern.test(input.to ?? "") ? dateAtNoon(input.to!) : today;
    if (from > to) [from, to] = [to, from];
  }
  return { period, from: iso(from), to: iso(to) };
}

function timeZoneOffset(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return Date.UTC(
    Number(values.year), Number(values.month) - 1, Number(values.day),
    Number(values.hour), Number(values.minute), Number(values.second),
  ) - date.getTime();
}

export function salesPeriodUtcBounds(from: string, to: string, timeZone: string) {
  const toUtc = (date: string) => {
    const wallClock = new Date(`${date}T00:00:00Z`);
    let instant = new Date(wallClock.getTime() - timeZoneOffset(wallClock, timeZone));
    instant = new Date(wallClock.getTime() - timeZoneOffset(instant, timeZone));
    return instant;
  };
  return {
    from: toUtc(from).toISOString(),
    until: toUtc(iso(addDays(dateAtNoon(to), 1))).toISOString(),
  };
}
