import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) throw new Error("Supabase variables required.");
const service = createClient(url, serviceKey, { auth: { persistSession: false } });
const ids = {};

try {
  const { data: business, error } = await service.from("businesses").insert({ name: `Plans QA ${randomUUID()}` }).select("id, plan_tier, plan_started_at, plan_expires_at").single();
  if (error) throw error;
  ids.business = business.id;
  if (business.plan_tier !== "free") throw new Error("New business did not receive Free plan.");
  const durationDays = (new Date(business.plan_expires_at).getTime() - new Date(business.plan_started_at).getTime()) / 86400000;
  if (Math.abs(durationDays - 30) > 0.01) {
    throw new Error("Free plan duration is not 30 days.");
  }

  const unlimitedStart = new Date().toISOString();
  const { error: unlimitedError } = await service.from("businesses").update({
    plan_tier: "unlimited", plan_started_at: unlimitedStart, plan_expires_at: null,
  }).eq("id", ids.business);
  if (unlimitedError) throw unlimitedError;
  const { data: unlimited } = await service.from("businesses").select("plan_tier, plan_expires_at").eq("id", ids.business).single();
  if (unlimited.plan_tier !== "unlimited" || unlimited.plan_expires_at !== null) throw new Error("Unlimited plan still has an expiration.");

  const { error: invalidError } = await service.from("businesses").update({ plan_tier: "invalid" }).eq("id", ids.business);
  if (!invalidError) throw new Error("Invalid plan was accepted.");
  console.log("Business plans check passed.");
} finally {
  if (ids.business) await service.from("businesses").delete().eq("id", ids.business);
}
