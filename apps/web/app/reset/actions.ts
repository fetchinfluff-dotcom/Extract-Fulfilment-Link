"use server";

import { redirect } from "next/navigation";
import { loadEnv } from "@listingforge/config";
import { createPublicSupabase } from "../../lib/auth";

export async function resetPasswordAction(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const env = loadEnv(process.env);
  const { error } = await createPublicSupabase(env).auth.resetPasswordForEmail(email, {
    redirectTo: `${env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "")}/login`
  });
  if (error) redirect(`/reset?error=${encodeURIComponent(error.message)}`);
  redirect("/login?notice=Check your email for the reset link.");
}
