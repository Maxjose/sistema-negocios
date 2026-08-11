import "server-only";

import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { Customer, Receivable, ReceivablePayment, SaleCustomer } from "./types";

async function context(requireCredits = false) {
  const profile = await requireRole("owner");
  if (!profile.business_id) throw new Error("El usuario no tiene un negocio asignado.");
  const supabase = await createClient();
  const { data: business, error } = await supabase
    .from("businesses")
    .select("enable_customers, enable_credits")
    .eq("id", profile.business_id)
    .single();
  if (error || !business?.enable_customers || (requireCredits && !business.enable_credits)) {
    throw new Error("Esta función no está habilitada para el negocio.");
  }
  return { supabase };
}

export async function getCustomers(): Promise<Customer[]> {
  const { supabase } = await context();
  const { data, error } = await supabase.from("customers").select("*").order("name");
  if (error) throw new Error(error.message);
  return data as Customer[];
}

export async function getSaleCustomers(): Promise<SaleCustomer[]> {
  const { supabase } = await context();
  const today = new Date().toISOString().slice(0, 10);
  const [{ data: customers, error: customersError }, { data: overdue, error: overdueError }] = await Promise.all([
    supabase.from("customers").select("*").order("name"),
    supabase
      .from("receivables")
      .select("customer_id, balance")
      .eq("status", "open")
      .lt("due_date", today)
      .gt("balance", 0),
  ]);
  if (customersError || overdueError) throw new Error(customersError?.message ?? overdueError?.message);

  const summaries = new Map<string, { count: number; balance: number }>();
  for (const receivable of overdue ?? []) {
    const current = summaries.get(receivable.customer_id) ?? { count: 0, balance: 0 };
    summaries.set(receivable.customer_id, {
      count: current.count + 1,
      balance: current.balance + Number(receivable.balance),
    });
  }

  return (customers as Customer[]).map((customer) => {
    const summary = summaries.get(customer.id);
    return {
      ...customer,
      overdue_count: summary?.count ?? 0,
      overdue_balance: summary?.balance ?? 0,
    };
  });
}

export async function getReceivables(): Promise<Receivable[]> {
  const { supabase } = await context(true);
  const { data, error } = await supabase
    .from("receivables")
    .select("id, customer_id, sale_id, description, original_amount, balance, due_date, status, created_at, customers(name, phone)")
    .order("due_date");
  if (error) throw new Error(error.message);
  return data as unknown as Receivable[];
}

export async function getReceivable(id: string): Promise<{ receivable: Receivable; payments: ReceivablePayment[] } | null> {
  const { supabase } = await context(true);
  const [{ data, error }, { data: payments, error: paymentsError }] = await Promise.all([
    supabase.from("receivables").select("id, customer_id, sale_id, description, original_amount, balance, due_date, status, created_at, customers(name, phone)").eq("id", id).maybeSingle(),
    supabase.from("receivable_payments").select("id, amount, payment_method_name, note, paid_at").eq("receivable_id", id).order("paid_at", { ascending: false }),
  ]);
  if (error || paymentsError) throw new Error(error?.message ?? paymentsError?.message);
  return data ? { receivable: data as unknown as Receivable, payments: (payments ?? []) as ReceivablePayment[] } : null;
}
