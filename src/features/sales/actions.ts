"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export type SaleState = { error?: string };
const saleSchema = z.object({
  items: z.array(z.object({ product_id: z.uuid(), quantity: z.number().int().positive() })).min(1).max(100),
  payment_method_id: z.uuid(),
  discount: z.number().min(0),
  note: z.string().max(500),
});

export async function confirmSale(_state: SaleState, formData: FormData): Promise<SaleState> {
  await requireRole("owner");
  let rawItems: unknown;
  try { rawItems = JSON.parse(String(formData.get("items"))); } catch { return { error: "La venta no contiene productos válidos." }; }
  const parsed = saleSchema.safeParse({
    items: rawItems,
    payment_method_id: formData.get("payment_method_id"),
    discount: Number(formData.get("discount") || 0),
    note: String(formData.get("note") || ""),
  });
  if (!parsed.success) return { error: "Revisa los productos, cantidades y método de pago." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("confirm_sale", {
    p_items: parsed.data.items,
    p_payment_method_id: parsed.data.payment_method_id,
    p_discount: parsed.data.discount,
    p_note: parsed.data.note,
  });
  if (error) {
    if (error.message.includes("INSUFFICIENT_STOCK")) return { error: "La existencia cambió. Revisa las cantidades." };
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
