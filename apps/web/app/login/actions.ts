"use server";

import { redirect } from "next/navigation";
import { clearAuthCookies, createPublicSupabase, setAuthCookies } from "../../lib/auth";

export async function signInAction(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const { data, error } = await createPublicSupabase().auth.signInWithPassword({ email, password });
  if (error || !data.session) redirect(`/login?error=${encodeURIComponent(error?.message ?? "Login failed.")}`);
  await setAuthCookies(data.session.access_token, data.session.refresh_token);
  redirect("/dashboard");
}

export async function signUpAction(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const { data, error } = await createPublicSupabase().auth.signUp({ email, password });
  if (error) redirect(`/login?error=${encodeURIComponent(error.message)}`);
  if (data.session) await setAuthCookies(data.session.access_token, data.session.refresh_token);
  if (!data.session) redirect("/login?notice=Check your email to confirm the account.");
  redirect("/dashboard");
}

export async function signOutAction() {
  await clearAuthCookies();
  redirect("/login");
}
