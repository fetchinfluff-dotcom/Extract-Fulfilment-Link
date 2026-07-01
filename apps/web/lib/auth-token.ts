export const ACCESS_COOKIE = "lf_sb_access_token";
export const REFRESH_COOKIE = "lf_sb_refresh_token";

export function bearerTokenFromRequest(request: Request): string | null {
  const auth = request.headers.get("authorization");
  if (auth?.toLowerCase().startsWith("bearer ")) return auth.slice(7).trim();
  const cookie = request.headers.get("cookie") ?? "";
  return cookie.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${ACCESS_COOKIE}=`))?.slice(ACCESS_COOKIE.length + 1) ?? null;
}

export function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge
  };
}
