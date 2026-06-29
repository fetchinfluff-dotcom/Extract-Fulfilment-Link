import { describe, expect, it } from "vitest";
import { isPrivateAddress, validateSourceUrl } from "@listingforge/security";

describe("source URL security", () => {
  it("rejects private IP literals", async () => {
    await expect(validateSourceUrl("https://127.0.0.1/products/1", { allowedDomains: ["127.0.0.1"], skipDns: true })).rejects.toThrow("Private");
  });

  it("accepts allowed fixture host without DNS in local tests", async () => {
    const result = await validateSourceUrl("https://mock.listingforge.local/products/a#x", { allowedDomains: ["mock.listingforge.local"], skipDns: true });
    expect(result.url.toString()).toBe("https://mock.listingforge.local/products/a");
  });

  it("detects private ranges", () => {
    expect(isPrivateAddress("10.0.0.1")).toBe(true);
    expect(isPrivateAddress("8.8.8.8")).toBe(false);
  });
});
