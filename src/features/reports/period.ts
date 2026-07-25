export type PeriodKey = "today" | "week" | "month" | "custom";
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
