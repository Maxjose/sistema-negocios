import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publicKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !publicKey || !serviceKey) {
  throw new Error("Supabase environment variables are required.");
}

const admin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const suffix = randomUUID();
const password = `Qa!${randomUUID()}aA1`;
const created = { businesses: [], users: [], categories: [] };

async function createTenant(label) {
  const { data: business, error: businessError } = await admin
    .from("businesses")
    .insert({ name: `RLS ${label} ${suffix}`, status: "active" })
    .select("id")
    .single();
  if (businessError) throw businessError;
  created.businesses.push(business.id);

  const email = `rls-${label}-${suffix}@example.invalid`;
  const { data: authData, error: authError } =
    await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
  if (authError) throw authError;
  created.users.push(authData.user.id);

  const { error: profileError } = await admin.from("profiles").insert({
    id: authData.user.id,
    business_id: business.id,
    full_name: `RLS Owner ${label}`,
    role: "owner",
    status: "active",
  });
  if (profileError) throw profileError;

  const client = createClient(url, publicKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error: signInError } = await client.auth.signInWithPassword({
    email,
    password,
  });
  if (signInError) throw signInError;

  return { businessId: business.id, client };
}

try {
  const tenantA = await createTenant("a");
  const tenantB = await createTenant("b");

  const { data: category, error: categoryError } = await tenantA.client
    .from("categories")
    .insert({ business_id: tenantA.businessId, name: `Private ${suffix}` })
    .select("id")
    .single();
  if (categoryError) throw categoryError;
  created.categories.push(category.id);

  const { data: visibleToB, error: readError } = await tenantB.client
    .from("categories")
    .select("id")
    .eq("id", category.id);
  if (readError) throw readError;
  if (visibleToB.length !== 0) {
    throw new Error("Tenant B could read Tenant A data.");
  }

  const { error: crossWriteError } = await tenantB.client
    .from("categories")
    .insert({ business_id: tenantA.businessId, name: "Forbidden" });
  if (!crossWriteError) {
    throw new Error("Tenant B could write into Tenant A.");
  }

  console.log("RLS isolation check passed.");
} finally {
  if (created.categories.length) {
    await admin.from("categories").delete().in("id", created.categories);
  }
  if (created.users.length) {
    await admin.from("profiles").delete().in("id", created.users);
    for (const userId of created.users) {
      await admin.auth.admin.deleteUser(userId);
    }
  }
  if (created.businesses.length) {
    await admin.from("businesses").delete().in("id", created.businesses);
  }
}
