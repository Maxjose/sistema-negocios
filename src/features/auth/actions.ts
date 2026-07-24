"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

export type LoginState = {
  error?: string;
};

const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
});

export async function login(
  _previousState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: "Introduce un correo y una contraseña válidos." };
  }

  const supabase = await createClient();
  const { data: authData, error: authError } =
    await supabase.auth.signInWithPassword(parsed.data);

  if (authError || !authData.user) {
    return { error: "El correo o la contraseña no son correctos." };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role, status, businesses(status)")
    .eq("id", authData.user.id)
    .single();

  const business = Array.isArray(profile?.businesses)
    ? profile.businesses[0]
    : profile?.businesses;
  const businessIsAllowed =
    profile?.role === "super_admin" || business?.status === "active";

  if (
    profileError ||
    !profile ||
    profile.status !== "active" ||
    !businessIsAllowed
  ) {
    await supabase.auth.signOut();
    return { error: "Esta cuenta no está activa. Contacta al administrador." };
  }

  redirect(profile.role === "super_admin" ? "/admin" : "/dashboard");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
