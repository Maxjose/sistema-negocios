"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export type SaleState = { error?: string };
const saleSchema = z.object({
  items: z.array(z.object({ product_id: z.uuid(), quantity: z.number().int().positive() })).min(1).max(100),
  payments: z.array(z.object({ payment_method_id: z.string(), amount: z.number().min(0) })).min(1).max(5),
  discount: z.number().min(0),
  note: z.string().max(500),
  sale_type: z.enum(["cash", "credit"]),
  customer_id: z.union([z.literal(""), z.uuid()]),
  due_date: z.string(),
});

export async function confirmSale(_state: SaleState, formData: FormData): Promise<SaleState> {
  await requireRole("owner");
  let items: unknown;
  let payments: unknown;
  try {
    items = JSON.parse(String(formData.get("items")));
    payments = JSON.parse(String(formData.get("payments")));
  } catch {
    return { error: "La venta contiene datos inválidos." };
  }
  const parsed = saleSchema.safeParse({
    items,
    payments,
    discount: Number(formData.get("discount") || 0),
    note: String(formData.get("note") || ""),
    sale_type: formData.get("sale_type") === "credit" ? "credit" : "cash",
    customer_id: String(formData.get("customer_id") || ""),
    due_date: String(formData.get("due_date") || ""),
  });
  if (!parsed.success) return { error: "Revisa los productos, cantidades y pagos." };
  const supabase = await createClient();
  if (parsed.data.sale_type === "credit" && (!parsed.data.customer_id || !/^\d{4}-\d{2}-\d{2}$/.test(parsed.data.due_date))) {
    return { error: "Selecciona el cliente y la fecha de vencimiento." };
  }
  if (parsed.data.sale_type === "cash" && parsed.data.payments.some((payment) => !z.uuid().safeParse(payment.payment_method_id).success || payment.amount <= 0)) {
    return { error: "Revisa los métodos y montos de pago." };
  }
  const request = parsed.data.sale_type === "credit"
    ? supabase.rpc("confirm_credit_sale", { p_items: parsed.data.items, p_customer_id: parsed.data.customer_id, p_due_date: parsed.data.due_date, p_discount: parsed.data.discount, p_note: parsed.data.note })
    : supabase.rpc("confirm_sale_v2", { p_items: parsed.data.items, p_payments: parsed.data.payments, p_discount: parsed.data.discount, p_note: parsed.data.note });
  const { data, error } = await request;
  if (error) {
    if (error.message.includes("INSUFFICIENT_STOCK")) return { error: "La existencia cambió. Revisa las cantidades." };
    if (error.message.includes("DISCOUNTS_DISABLED")) return { error: "Los descuentos están desactivados para este negocio." };
    if (error.message.includes("SALE_NOTES_DISABLED")) return { error: "Las notas están desactivadas para este negocio." };
    if (error.message.includes("PAYMENT_TOTAL_MISMATCH")) return { error: "Los pagos deben sumar exactamente el total." };
    if (error.message.includes("CREDITS_DISABLED")) return { error: "Las ventas a crédito están desactivadas." };
    if (error.message.includes("INVALID_CUSTOMER")) return { error: "El cliente no está disponible." };
    if (error.message.includes("INVALID_DUE_DATE")) return { error: "La fecha de vencimiento no es válida." };
    return { error: `No se pudo confirmar la venta: ${error.message}` };
  }
  revalidatePath("/products");
  revalidatePath("/sales");
  redirect(`/sales/${data}`);
}

export async function voidSale(id: string, formData: FormData) {
  await requireRole("owner");
  const reason = String(formData.get("reason") || "").trim();
  if (reason.length < 3) throw new Error("El motivo debe tener al menos 3 caracteres.");
  const supabase = await createClient();
  const { error } = await supabase.rpc("void_sale", { p_sale_id: id, p_reason: reason });
  if (error) throw new Error(error.message);
  revalidatePath("/products");
  revalidatePath("/sales");
  revalidatePath(`/sales/${id}`);
}
