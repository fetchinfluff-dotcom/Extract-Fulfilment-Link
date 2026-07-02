import { describe, expect, it } from "vitest";
import { mergeBrowserSnapshot, needsBrowserExtraction } from "../apps/worker/src/browser-extractor";
import type { SourceProduct } from "@listingforge/schemas";

const source: SourceProduct = {
  platform: "aliexpress",
  canonicalUrl: "https://www.aliexpress.com/item/1.html",
  sourceProductId: "1",
  sourceTitle: "Untitled public product",
  sourceDescriptionText: null,
  currency: "USD",
  variants: [{ id: "default", sku: null, title: "Default", options: {}, itemCost: 0, inventoryStatus: null, imageUrl: null }],
  shippingQuotes: [],
  media: [],
  attributes: {},
  packageContents: [],
  instructions: [],
  facts: [],
  warnings: [],
  confidence: 0.55
};

describe("worker browser extraction fallback", () => {
  it("runs only when AliExpress public extraction is missing price or media", () => {
    expect(needsBrowserExtraction(source)).toBe(true);
    expect(needsBrowserExtraction({ ...source, variants: [{ ...source.variants[0]!, itemCost: 12 }], media: Array.from({ length: 3 }, (_, index) => ({ url: `https://example.com/${index}.jpg`, type: "image", sourceType: "supplier", licenseStatus: "unknown" })) })).toBe(false);
  });

  it("merges rendered price and images without adding review proof", () => {
    const merged = mergeBrowserSnapshot(source, {
      title: "Portable Steam Cleaner",
      price: 969158,
      currency: "VND",
      images: ["https://ae01.alicdn.com/kf/main.jpg", "https://ae01.alicdn.com/kf/detail.jpg"],
      finalUrl: "https://vi.aliexpress.com/item/1.html"
    }, "US");

    expect(merged.sourceTitle).toBe("Portable Steam Cleaner");
    expect(merged.currency).toBe("VND");
    expect(merged.variants[0]?.itemCost).toBe(969158);
    expect(merged.media).toHaveLength(2);
    expect(merged.facts.map((fact) => fact.field)).toEqual(["item_cost", "media"]);
    expect(JSON.stringify(merged)).not.toMatch(/review|rating|sold/i);
  });
});
