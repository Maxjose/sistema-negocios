export function debtWhatsappUrl(input: {
  balance: number;
  currency: string;
  customerName: string;
  description: string;
  dueDate: string;
  phone: string;
}) {
  const phone = input.phone.replace(/\D/g, "");
  const dueDate = new Intl.DateTimeFormat("es-VE", { dateStyle: "long" }).format(new Date(`${input.dueDate}T12:00:00`));
  const amount = new Intl.NumberFormat("es-VE", { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(input.balance);
  const currencyLabels: Record<string, string> = { EUR: "€", USD: "$", VES: "Bs" };
  const currency = currencyLabels[input.currency.toUpperCase()] ?? input.currency.toUpperCase();
  const message = `Hola ${input.customerName}, te recordamos que tienes un saldo pendiente de ${amount} ${currency} por ${input.description}, con vencimiento el ${dueDate}.`;
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

export function invoiceWhatsappUrl(input: {
  businessName: string;
  currency: string;
  customerName: string;
  date: string;
  items: Array<{ name: string; quantity: number; subtotal: number }>;
  paymentMethod: string;
  phone: string;
  saleNumber: number;
  total: number;
}) {
  const phone = input.phone.replace(/\D/g, "");
  const money = (amount: number) =>
    new Intl.NumberFormat("es-VE", {
      style: "currency",
      currency: input.currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  const items = input.items
    .map((item) => `• ${item.quantity} × ${item.name}: ${money(item.subtotal)}`)
    .join("\n");
  const message = [
    `*${input.businessName}*`,
    `Factura V-${String(input.saleNumber).padStart(6, "0")}`,
    `Fecha: ${input.date}`,
    `Cliente: ${input.customerName}`,
    "",
    items,
    "",
    `*Total: ${money(input.total)}*`,
    `Método de pago: ${input.paymentMethod}`,
    "",
    "Gracias por su compra.",
  ].join("\n");
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}
