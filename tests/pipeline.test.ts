import { describe, expect, it } from "vitest";
import { AliExpressAdapter, MockSourceAdapter } from "@listingforge/adapters";
import { MockAiProvider, OpenAiCompatibleProvider } from "@listingforge/ai";
import { renderListingHtml, sanitizeHtml } from "@listingforge/html";
import { calculatePricing } from "@listingforge/pricing";
import { GeneratedListingSchema, SourceProductSchema } from "@listingforge/schemas";

describe("fixture pipeline", () => {
  it("extracts, prices, generates, and sanitizes", async () => {
    const source = await new MockSourceAdapter().extract({
      url: new URL("https://mock.listingforge.local/products/collapsible-lamp"),
      targetCountry: "US"
    });
    expect(SourceProductSchema.safeParse(source).success).toBe(true);
    const pricing = calculatePricing({ itemCost: source.variants[0]?.itemCost ?? 0, shippingCost: source.shippingQuotes[0]?.cost ?? 0 });
    const listing = await new MockAiProvider().generateListing({ source, pricing });
    expect(GeneratedListingSchema.safeParse(listing).success).toBe(true);
    const html = renderListingHtml(listing);
    expect(html).toContain("lf-product-description");
    expect(sanitizeHtml('<section onclick="x"><script>alert(1)</script><h2>Ok</h2></section>')).toBe("<section><h2>Ok</h2></section>");
  });

  it("extracts public JSON-LD product pages without credentials", async () => {
    const oldFetch = globalThis.fetch;
    globalThis.fetch = async () =>
      new Response(
        '<html><head><script type="application/ld+json">{"@type":"Product","name":"Public Test Lamp","description":"Desk lamp","image":"https://example.com/lamp.jpg","sku":"SKU1","offers":{"price":"12.50","priceCurrency":"USD"}}</script></head></html>',
        { status: 200, headers: { "content-type": "text/html" } }
      );
    try {
      const source = await new AliExpressAdapter({
        FEATURE_ALIEXPRESS_ADAPTER: true,
        ALLOWED_SOURCE_DOMAINS: ["aliexpress.com", "aliexpress.us"],
        FETCH_TIMEOUT_MS: 1000,
        MAX_FETCH_BYTES: 10_000,
        MAX_URL_REDIRECTS: 1,
        FEATURE_CJ_ADAPTER: true,
        FEATURE_QKSOURCE_ADAPTER: true
      }).extract({ url: new URL("https://www.aliexpress.us/item/1.html"), targetCountry: "US" });
      expect(source.sourceTitle).toBe("Public Test Lamp");
      expect(source.variants[0]?.itemCost).toBe(12.5);
    } finally {
      globalThis.fetch = oldFetch;
    }
  });

  it("extracts AliExpress mtop title, images, price, and shipping", async () => {
    const oldFetch = globalThis.fetch;
    const mtop = {
      ret: ["SUCCESS::调用成功"],
      data: {
        result: {
          PRODUCT_TITLE: { text: "Rolling Knife Sharpener" },
          HEADER_IMAGE_PC: { imagePathList: ["https://ae01.alicdn.com/kf/test.jpg"] },
          PRICE: { targetSkuPriceInfo: { salePriceString: "$4.50", originalPrice: { currency: "USD" } } },
          SHIPPING: { deliveryLayoutInfo: [{ bizData: { shippingFee: "charge", displayAmount: 1.99, displayCurrency: "USD", deliveryProviderName: "AliExpress Standard", utParams: "{\"deliveryDayMax\":12}" } }] },
          SKU: { selectedSkuIdStr: "sku-1" }
        }
      }
    };
    let calls = 0;
    globalThis.fetch = async () => {
      calls += 1;
      if (calls === 1) return new Response("<html><title>Fallback</title></html>", { status: 200, headers: { "content-type": "text/html" } });
      if (calls === 2) return new Response(JSON.stringify({ ret: ["FAIL_SYS_TOKEN_EMPTY::token empty"] }), { status: 200, headers: { "set-cookie": "_m_h5_tk=token_1; _m_h5_tk_enc=enc" } });
      return new Response(JSON.stringify(mtop), { status: 200 });
    };
    try {
      const source = await new AliExpressAdapter({
        FEATURE_ALIEXPRESS_ADAPTER: true,
        ALLOWED_SOURCE_DOMAINS: ["aliexpress.com"],
        FETCH_TIMEOUT_MS: 1000,
        MAX_FETCH_BYTES: 10_000,
        MAX_URL_REDIRECTS: 1,
        FEATURE_CJ_ADAPTER: true,
        FEATURE_QKSOURCE_ADAPTER: true
      }).extract({ url: new URL("https://www.aliexpress.com/item/1005008224752493.html"), targetCountry: "US" });
      expect(source.sourceTitle).toBe("Rolling Knife Sharpener");
      expect(source.media[0]?.url).toBe("https://ae01.alicdn.com/kf/test.jpg");
      expect(source.variants[0]?.itemCost).toBe(4.5);
      expect(source.shippingQuotes[0]?.cost).toBe(1.99);
    } finally {
      globalThis.fetch = oldFetch;
    }
  });

  it("validates OpenAI-compatible JSON responses", async () => {
    const source = await new MockSourceAdapter().extract({
      url: new URL("https://mock.listingforge.local/products/collapsible-lamp"),
      targetCountry: "US"
    });
    const pricing = calculatePricing({ itemCost: source.variants[0]?.itemCost ?? 0, shippingCost: source.shippingQuotes[0]?.cost ?? 0 });
    const expected = await new MockAiProvider().generateListing({ source, pricing });
    const oldFetch = globalThis.fetch;
    globalThis.fetch = async () =>
      new Response(`${JSON.stringify({ choices: [{ message: { content: `Here is the draft:\n\`\`\`json\n${JSON.stringify(expected)}\n\`\`\`\n{"ignored":true}` } }] })}\n{"event":"done"}`, { status: 200 });
    try {
      const listing = await new OpenAiCompatibleProvider({ AI_BASE_URL: "https://example.com/v1", AI_API_KEY: "test", AI_MODEL_QUALITY: "model" }).generateListing({ source, pricing });
      expect(listing.selectedTitle).toBe(expected.selectedTitle);
    } finally {
      globalThis.fetch = oldFetch;
    }
  });

  it("accepts OpenAI-compatible responses wrapped in a listing key", async () => {
    const source = await new MockSourceAdapter().extract({
      url: new URL("https://mock.listingforge.local/products/collapsible-lamp"),
      targetCountry: "US"
    });
    const pricing = calculatePricing({ itemCost: source.variants[0]?.itemCost ?? 0, shippingCost: source.shippingQuotes[0]?.cost ?? 0 });
    const expected = await new MockAiProvider().generateListing({ source, pricing });
    const oldFetch = globalThis.fetch;
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ listing: expected }) } }] }), { status: 200 });
    try {
      const listing = await new OpenAiCompatibleProvider({ AI_BASE_URL: "https://example.com/v1", AI_API_KEY: "test", AI_MODEL_QUALITY: "model" }).generateListing({ source, pricing });
      expect(listing.selectedTitle).toBe(expected.selectedTitle);
    } finally {
      globalThis.fetch = oldFetch;
    }
  });

  it("falls back when OpenAI-compatible responses fail schema validation", async () => {
    const source = await new MockSourceAdapter().extract({
      url: new URL("https://mock.listingforge.local/products/collapsible-lamp"),
      targetCountry: "US"
    });
    const pricing = calculatePricing({ itemCost: source.variants[0]?.itemCost ?? 0, shippingCost: source.shippingQuotes[0]?.cost ?? 0 });
    const oldFetch = globalThis.fetch;
    globalThis.fetch = async () => new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ riskLevel: "low", titleCandidates: ["bad"] }) } }] }), { status: 200 });
    try {
      const listing = await new OpenAiCompatibleProvider({ AI_BASE_URL: "https://example.com/v1", AI_API_KEY: "test", AI_MODEL_QUALITY: "model" }).generateListing({ source, pricing });
      expect(listing.compliance.warnings.some((warning) => warning.startsWith("AI provider response did not match the required schema:"))).toBe(true);
    } finally {
      globalThis.fetch = oldFetch;
    }
  });
});
