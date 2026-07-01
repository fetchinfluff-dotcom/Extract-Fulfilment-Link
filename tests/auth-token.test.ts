import { describe, expect, it } from "vitest";
import { ACCESS_COOKIE, bearerTokenFromRequest } from "../apps/web/lib/auth-token";

describe("web auth token parsing", () => {
  it("reads bearer tokens before auth cookies", () => {
    const request = new Request("https://listingforge.local/api/projects", {
      headers: {
        authorization: "Bearer header-token",
        cookie: `${ACCESS_COOKIE}=cookie-token`
      }
    });

    expect(bearerTokenFromRequest(request)).toBe("header-token");
  });

  it("reads access token from cookies", () => {
    const request = new Request("https://listingforge.local/api/projects", {
      headers: { cookie: `theme=light; ${ACCESS_COOKIE}=cookie-token; other=value` }
    });

    expect(bearerTokenFromRequest(request)).toBe("cookie-token");
  });
});
