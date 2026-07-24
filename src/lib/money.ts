export function formatMoney(
  amount: number,
  currency = "USD",
  locale = "es-VE",
) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}
