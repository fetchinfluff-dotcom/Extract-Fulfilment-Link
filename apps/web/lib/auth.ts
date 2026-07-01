import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { loadEnv, type AppEnv } from "@listingforge/config";
import { ACCESS_COOKIE, REFRESH_COOKIE, bearerTokenFromRequest, cookieOptions } from "./auth-token";

export type RequestContext = {
  userId: string | null;
  workspaceId: string;
  authenticated: boolean;
};

export const MVP_WORKSPACE_ID = "00000000-0000-0000-0000-000000000001";

export function publicSupabaseKey(env: AppEnv): string | null {
  return env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ?? env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    ?? env.SUPABASE_ANON_KEY
    ?? env.SUPABASE_PUBLISHABLE_KEY
    ?? privateSupabaseKey(env)
    ?? null;
}

export function privateSupabaseKey(env: AppEnv): string | null {
  return env.SUPABASE_SECRET_KEY ?? env.SUPABASE_SERVICE_ROLE_KEY ?? null;
}

export function supabaseUrl(env: AppEnv): string | null {
  return (env.SUPABASE_URL ?? env.NEXT_PUBLIC_SUPABASE_URL ?? null)?.replace(/\/$/, "") ?? null;
}

export function createPublicSupabase(env = loadEnv(process.env)) {
  const url = supabaseUrl(env);
  const key = publicSupabaseKey(env);
  if (!url || !key) throw new Error("Supabase public auth key is not configured.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function setAuthCookies(accessToken: string, refreshToken?: string | null) {
  const jar = await cookies();
  jar.set(ACCESS_COOKIE, accessToken, cookieOptions(60 * 60));
  if (refreshToken) jar.set(REFRESH_COOKIE, refreshToken, cookieOptions(60 * 60 * 24 * 30));
}

export async function clearAuthCookies() {
  const jar = await cookies();
  jar.delete(ACCESS_COOKIE);
  jar.delete(REFRESH_COOKIE);
}

export async function resolveRequestContext(request: Request, env = loadEnv(process.env)): Promise<RequestContext> {
  const token = bearerTokenFromRequest(request);
  if (!token) {
    if (env.NODE_ENV === "production") throw new Error("Authentication is required.");
    return { userId: null, workspaceId: MVP_WORKSPACE_ID, authenticated: false };
  }
  const supabase = createPublicSupabase(env);
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) throw new Error("Authentication is required.");
  const workspaceId = await ensureUserWorkspace(data.user.id, data.user.email ?? "user", env);
  return { userId: data.user.id, workspaceId, authenticated: true };
}

async function ensureUserWorkspace(userId: string, email: string, env: AppEnv): Promise<string> {
  const [member] = await serviceRest<Array<{ workspace_id: string }>>(env, `workspace_members?user_id=eq.${userId}&select=workspace_id&limit=1`);
  if (member?.workspace_id) return member.workspace_id;
  const workspaceId = crypto.randomUUID();
  await serviceRest(env, "workspaces", {
    method: "POST",
    headers: { prefer: "return=minimal" },
    body: JSON.stringify({
      id: workspaceId,
      name: `${email.split("@")[0] || "User"} workspace`,
      slug: `ws-${userId.slice(0, 8)}`,
      owner_user_id: userId,
      plan_code: "trial",
      status: "active"
    })
  });
  await serviceRest(env, "workspace_members", {
    method: "POST",
    headers: { prefer: "return=minimal" },
    body: JSON.stringify({ workspace_id: workspaceId, user_id: userId, role: "owner" })
  });
  return workspaceId;
}

export async function serviceRest<T>(env: AppEnv, path: string, init: RequestInit = {}): Promise<T> {
  const url = supabaseUrl(env);
  const key = privateSupabaseKey(env);
  if (!url || !key) throw new Error("Supabase persistence is not configured.");
  const response = await fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: key,
      authorization: `Bearer ${key}`,
      "content-type": "application/json",
      ...(init.headers ?? {})
    }
  });
  if (!response.ok) throw new Error(`Supabase ${path} returned HTTP ${response.status}: ${await response.text()}`);
  const text = await response.text();
  return text ? JSON.parse(text) as T : undefined as T;
}
