export function debtWhatsappUrl(input: {
  balance: number;
  customerName: string;
  description: string;
  dueDate: string;
  phone: string;
}) {
  const phone = input.phone.replace(/\D/g, "");
  const dueDate = new Intl.DateTimeFormat("es-VE", { dateStyle: "long" }).format(new Date(`${input.dueDate}T12:00:00`));
  const amount = new Intl.NumberFormat("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(input.balance);
  const message = `Hola ${input.customerName}, te recordamos que tienes un saldo pendiente de ${amount} por ${input.description}, con vencimiento el ${dueDate}.`;
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}
