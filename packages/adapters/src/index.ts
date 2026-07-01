import { createHash } from "node:crypto";
import type { AppEnv } from "@listingforge/config";
import type { SourcePlatform, SourceProduct } from "@listingforge/schemas";
import { SourceProductSchema } from "@listingforge/schemas";
import { detectPlatform, validatePublicUrl, validateSourceUrl } from "@listingforge/security";
import mockProduct from "./mock-product.json" with { type: "json" };

export type ExtractInput = {
  url: URL;
  targetCountry: string;
};

export interface SourceAdapter {
  platform: SourcePlatform;
  canHandle(url: URL): boolean;
  canonicalize(url: URL): Promise<URL>;
  extract(input: ExtractInput): Promise<SourceProduct>;
}

type PublicAdapterEnv = Pick<AppEnv, "ALLOWED_SOURCE_DOMAINS" | "FETCH_TIMEOUT_MS" | "MAX_FETCH_BYTES" | "MAX_URL_REDIRECTS">;
type AdapterEnv = PublicAdapterEnv & Pick<AppEnv, "FEATURE_CJ_ADAPTER" | "FEATURE_ALIEXPRESS_ADAPTER" | "FEATURE_QKSOURCE_ADAPTER">;

export type ReferencePageAnalysis = {
  url: string;
  title: string | null;
  metaDescription: string | null;
  headings: string[];
  imageCount: number;
  videoCount: number;
  sectionPatterns: string[];
  styleSignals: string[];
  warnings: string[];
};

abstract class PublicPageAdapter implements SourceAdapter {
  abstract platform: SourcePlatform;
  constructor(private readonly enabled: boolean, private readonly env: PublicAdapterEnv) {}
  canHandle(url: URL): boolean {
    return detectPlatform(url.hostname) === this.platform;
  }
  async canonicalize(url: URL): Promise<URL> {
    url.hash = "";
    return url;
  }
  async extract(input: ExtractInput): Promise<SourceProduct> {
    if (!this.enabled) throw new Error(`${this.platform} public-page adapter is disabled by feature flag.`);
    const html = await fetchPublicHtml(input.url, this.env);
    const liveData = this.platform === "aliexpress" ? await fetchAliExpressMtop(input.url, input.targetCountry, this.env).catch(() => null) : null;
    return SourceProductSchema.parse(normalizePublicPage(input.url, input.targetCountry, this.platform, html, liveData));
  }
}

export class MockSourceAdapter implements SourceAdapter {
  platform = "manual" as const;
  canHandle(url: URL): boolean {
    return url.hostname === "mock.listingforge.local";
  }
  async canonicalize(url: URL): Promise<URL> {
    url.hash = "";
    return url;
  }
  async extract(input: ExtractInput): Promise<SourceProduct> {
    return SourceProductSchema.parse({
      ...mockProduct,
      canonicalUrl: input.url.toString(),
      shippingQuotes: [
        {
          variantId: "lamp-small",
          destinationCountry: input.targetCountry,
          methodName: "Fixture Standard",
          cost: 4,
          currency: "USD",
          estimatedMinDays: 8,
          estimatedMaxDays: 14,
          tracked: true,
          quotedAt: new Date("2026-01-01T00:00:00.000Z").toISOString()
        }
      ]
    });
  }
}

export class CJDropShippingAdapter extends PublicPageAdapter {
  platform = "cjdropshipping" as const;
  constructor(env: AdapterEnv) {
    super(Boolean(env.FEATURE_CJ_ADAPTER), env);
  }
}

export class AliExpressAdapter extends PublicPageAdapter {
  platform = "aliexpress" as const;
  constructor(env: AdapterEnv) {
    super(env.FEATURE_ALIEXPRESS_ADAPTER, env);
  }
}

export class QKSourceAdapter extends PublicPageAdapter {
  platform = "qksource" as const;
  constructor(env: AdapterEnv) {
    super(env.FEATURE_QKSOURCE_ADAPTER, env);
  }
}

export function createAdapters(env: AppEnv): SourceAdapter[] {
  return [
    new MockSourceAdapter(),
    new CJDropShippingAdapter(env),
    new AliExpressAdapter(env),
    new QKSourceAdapter(env)
  ];
}

export function findAdapter(adapters: SourceAdapter[], url: URL): SourceAdapter {
  const adapter = adapters.find((candidate) => candidate.canHandle(url));
  if (!adapter) throw new Error("No adapter can handle this URL.");
  return adapter;
}

export async function analyzeReferencePages(urls: string[], env: PublicAdapterEnv & Pick<AppEnv, "NODE_ENV">): Promise<ReferencePageAnalysis[]> {
  const uniqueUrls = [...new Set(urls.map((url) => url.trim()).filter(Boolean))].slice(0, 3);
  const results = await Promise.all(uniqueUrls.map(async (rawUrl) => {
    const url = await validatePublicUrl(rawUrl, { skipDns: env.NODE_ENV !== "production", allowHttpLocalhost: env.NODE_ENV !== "production" });
    const html = await fetchReferenceHtml(url, env);
    return analyzeReferenceHtml(url, html);
  }));
  return results;
}

async function fetchReferenceHtml(startUrl: URL, env: PublicAdapterEnv & Pick<AppEnv, "NODE_ENV">): Promise<string> {
  let url = new URL(startUrl);
  for (let redirects = 0; redirects <= env.MAX_URL_REDIRECTS; redirects += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), env.FETCH_TIMEOUT_MS);
    const response = await fetch(url, { redirect: "manual", signal: controller.signal, headers: { "user-agent": "ListingForgeBot/0.1 (+https://listingforge.local)" } });
    clearTimeout(timeout);
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location");
      if (!location) throw new Error("Reference page redirected without a Location header.");
      url = await validatePublicUrl(new URL(location, url).toString(), { skipDns: env.NODE_ENV !== "production", allowHttpLocalhost: env.NODE_ENV !== "production" });
      continue;
    }
    if (!response.ok) throw new Error(`Reference page returned HTTP ${response.status}.`);
    if (!response.headers.get("content-type")?.toLowerCase().includes("text/html")) throw new Error("Reference page did not return HTML.");
    return readLimitedText(response, env.MAX_FETCH_BYTES);
  }
  throw new Error("Reference page exceeded the redirect limit.");
}

function analyzeReferenceHtml(url: URL, html: string): ReferencePageAnalysis {
  const clean = html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ");
  const headings = unique([...clean.matchAll(/<h[1-4][^>]*>([\s\S]*?)<\/h[1-4]>/gi)]
    .map((match) => decode(match[1]) ?? "")
    .filter((heading) => heading.length >= 6 && heading.length <= 90)
    .filter((heading) => !/cart|checkout|login|menu|shipping|refund|privacy|terms/i.test(heading)))
    .slice(0, 12);
  const text = decode(clean)?.toLowerCase() ?? "";
  const patterns = [
    /faq|question/.test(text) ? "FAQ near the end" : "",
    /comparison|compare|versus|vs\./.test(text) ? "comparison section" : "",
    /how it works|how to use|instructions/.test(text) ? "how-it-works section" : "",
    /benefit|why choose|why .* works/.test(text) ? "benefit-led section" : "",
    /specification|details|material|size/.test(text) ? "specification block" : ""
  ].filter(Boolean);
  const styleSignals = [
    /premium|luxury|advanced|precision/.test(text) ? "premium positioning" : "",
    /comfort|relief|support|routine/.test(text) ? "comfort-led angle" : "",
    /simple|easy|portable|compact/.test(text) ? "simplicity angle" : "",
    /dark|black|gold/.test(text) ? "premium visual tone" : "",
    /clinical|therapy|medical|pain/.test(text) ? "high-claim caution" : ""
  ].filter(Boolean);
  return {
    url: url.toString(),
    title: extractTag(clean, "title"),
    metaDescription: extractMeta(clean, "description"),
    headings,
    imageCount: (clean.match(/<img\b/gi) ?? []).length,
    videoCount: (clean.match(/<video\b|<source\b[^>]+video\//gi) ?? []).length,
    sectionPatterns: unique(patterns),
    styleSignals: unique(styleSignals),
    warnings: ["Reference page analyzed for layout/style only. Text, reviews, ratings, claims, and media are not copied."]
  };
}

async function fetchPublicHtml(startUrl: URL, env: PublicAdapterEnv): Promise<string> {
  let url = new URL(startUrl);
  for (let redirects = 0; redirects <= env.MAX_URL_REDIRECTS; redirects += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), env.FETCH_TIMEOUT_MS);
    const response = await fetch(url, { redirect: "manual", signal: controller.signal, headers: { "user-agent": "ListingForgeBot/0.1 (+https://listingforge.local)" } });
    clearTimeout(timeout);

    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location");
      if (!location) throw new Error("Source page redirected without a Location header.");
      const nextUrl = new URL(location, url);
      await validateSourceUrl(nextUrl.toString(), { allowedDomains: env.ALLOWED_SOURCE_DOMAINS, skipDns: process.env.NODE_ENV !== "production" });
      url = nextUrl;
      continue;
    }
    if (!response.ok) throw new Error(`Source page returned HTTP ${response.status}.`);
    if (!response.headers.get("content-type")?.toLowerCase().includes("text/html")) throw new Error("Source page did not return HTML.");
    return readLimitedText(response, env.MAX_FETCH_BYTES);
  }
  throw new Error("Source page exceeded the redirect limit.");
}

async function readLimitedText(response: Response, maxBytes: number): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) return "";
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    bytes += value.byteLength;
    if (bytes > maxBytes) throw new Error("Source page is larger than the configured download limit.");
    chunks.push(value);
  }
  return new TextDecoder().decode(Uint8Array.from(chunks.flatMap((chunk) => [...chunk])));
}

function normalizePublicPage(url: URL, targetCountry: string, platform: SourcePlatform, html: string, liveData: Record<string, unknown> | null = null): SourceProduct {
  const jsonLd = extractJsonLdProduct(html);
  const ali = record(record(record(liveData?.data)?.result));
  const aliPrice = record(record(ali?.PRICE)?.targetSkuPriceInfo) ?? Object.values(record(record(ali?.PRICE)?.skuPriceInfoMap) ?? {}).map(record).find(Boolean) ?? null;
  const aliShipping = record((array(record(ali?.SHIPPING)?.deliveryLayoutInfo)[0] ?? array(record(ali?.SHIPPING)?.originalLayoutResultList)[0]) as unknown)?.bizData;
  const offers = record(jsonLd?.offers);
  const title = text(record(ali?.PRODUCT_TITLE)?.text) ?? text(jsonLd?.name) ?? extractTag(html, "title") ?? "Untitled public product";
  const description = text(jsonLd?.description) ?? extractMeta(html, "description") ?? null;
  const price = money(record(aliPrice?.salePrice)?.value) ?? money(aliPrice?.salePriceString) ?? money(offers?.price) ?? 0;
  const currency = (text(record(aliPrice?.salePrice)?.currency) ?? text(record(aliPrice?.originalPrice)?.currency) ?? text(offers?.priceCurrency) ?? "USD").slice(0, 3).toUpperCase();
  const shippingCost = text(record(aliShipping)?.shippingFee) === "free" ? 0 : money(record(aliShipping)?.displayAmount) ?? money(record(aliShipping)?.formattedAmount);
  const imageUrls = unique([
    ...array(record(ali?.HEADER_IMAGE_PC)?.imagePathList).map(text),
    ...array(record(ali?.HEADER_IMAGE_PC)?.currentSkuImages).map(text),
    text(Array.isArray(jsonLd?.image) ? jsonLd.image[0] : jsonLd?.image)
  ].filter((item): item is string => Boolean(item)));
  const warnings = ["Public-page extraction only. Review facts manually; dynamic variants and shipping may be incomplete."];
  if (!price) warnings.push("No public price was found.");
  if (platform === "aliexpress" && !liveData) warnings.push("AliExpress live product API was unavailable; fell back to HTML-only extraction.");
  if (platform === "aliexpress" && shippingCost == null) warnings.push("AliExpress shipping cost was not found.");
  return {
    platform,
    canonicalUrl: url.toString(),
    sourceProductId: extractAliExpressProductId(url) ?? text(jsonLd?.sku) ?? null,
    sourceTitle: title,
    sourceDescriptionText: description,
    currency,
    variants: [{ id: text(record(ali?.SKU)?.selectedSkuIdStr) ?? "public-default", sku: text(record(ali?.SKU)?.selectedSkuIdStr) ?? text(jsonLd?.sku) ?? null, title: "Default", options: {}, itemCost: Number.isFinite(price) ? price : 0, inventoryStatus: null, imageUrl: imageUrls[0] ?? null }],
    shippingQuotes: shippingCost == null ? [] : [{
      variantId: text(record(ali?.SKU)?.selectedSkuIdStr) ?? null,
      destinationCountry: targetCountry,
      methodName: text(record(aliShipping)?.deliveryProviderName) ?? "AliExpress shipping",
      cost: shippingCost,
      currency: (text(record(aliShipping)?.displayCurrency) ?? currency).slice(0, 3).toUpperCase(),
      estimatedMinDays: null,
      estimatedMaxDays: number(record(parseJson(text(record(aliShipping)?.utParams)))?.deliveryDayMax),
      tracked: null,
      quotedAt: new Date().toISOString()
    }],
    media: imageUrls.map((image) => ({ url: image, type: "image" as const, sourceType: "supplier" as const, licenseStatus: "unknown" as const })),
    attributes: { aliexpress: ali ? { price: ali.PRICE, shipping: ali.SHIPPING, sku: ali.SKU, productProps: ali.PRODUCT_PROP_PC } : null },
    packageContents: [],
    instructions: [],
    facts: [
      { factId: "public_title", field: "product_type", value: title, source: "public_page", sourcePath: ali ? "mtop.PRODUCT_TITLE.text" : "title/jsonld.name", confidence: ali ? 0.85 : 0.65 },
      { factId: "public_price", field: "item_cost", value: price, source: "public_page", sourcePath: ali ? "mtop.PRICE.targetSkuPriceInfo" : "jsonld.offers.price", confidence: price ? 0.8 : 0.1 },
      ...(shippingCost == null ? [] : [{ factId: "public_shipping", field: "shipping_cost", value: shippingCost, source: "public_page", sourcePath: "mtop.SHIPPING", confidence: 0.75 }]),
      ...(description ? [{ factId: "public_description", field: "description", value: description, source: "public_page", sourcePath: "meta/jsonld.description", confidence: 0.55 }] : [])
    ],
    warnings,
    confidence: ali ? 0.78 : 0.55
  };
}

async function fetchAliExpressMtop(url: URL, targetCountry: string, env: PublicAdapterEnv): Promise<Record<string, unknown> | null> {
  const productId = extractAliExpressProductId(url);
  if (!productId) return null;
  let cookie = "";
  let text = "";
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const response = await fetchLimited(mtopUrl(productId, targetCountry, cookie), env, {
      cookie,
      referer: url.toString(),
      "user-agent": "Mozilla/5.0 (compatible; ListingForgeBot/0.1)"
    });
    cookie = cookieHeader(response.headers.get("set-cookie") ?? "") || cookie;
    text = await readLimitedText(response, env.MAX_FETCH_BYTES);
  }
  const payload = JSON.parse(text) as Record<string, unknown>;
  return array(payload.ret).some((item) => String(item).includes("SUCCESS")) ? payload : null;
}

async function fetchLimited(url: URL, env: PublicAdapterEnv, headers: Record<string, string>): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), env.FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, { signal: controller.signal, headers });
    if (!response.ok) throw new Error(`Source API returned HTTP ${response.status}.`);
    return response;
  } finally {
    clearTimeout(timeout);
  }
}

function mtopUrl(productId: string, targetCountry: string, cookie: string): URL {
  const appKey = "12574478";
  const data = JSON.stringify({
    productId,
    _lang: `en_${targetCountry.toUpperCase()}`,
    _currency: "USD",
    country: targetCountry.toUpperCase(),
    province: "",
    city: "",
    channel: "",
    pdp_ext_f: "",
    pdpNPI: "",
    sourceType: "",
    clientType: "pc",
    ext: JSON.stringify({ site: "glo", crawler: false, signedIn: false, host: "www.aliexpress.com" })
  });
  const token = cookie.match(/_m_h5_tk=([^_;]+)/)?.[1] ?? "";
  const t = Date.now().toString();
  const sign = createHash("md5").update(`${token}&${t}&${appKey}&${data}`).digest("hex");
  const url = new URL("https://acs.aliexpress.com/h5/mtop.aliexpress.pdp.pc.query/1.0/");
  url.search = new URLSearchParams({ jsv: "2.5.1", appKey, t, sign, api: "mtop.aliexpress.pdp.pc.query", v: "1.0", type: "originaljson", dataType: "json", data }).toString();
  return url;
}

function cookieHeader(setCookie: string): string {
  return ["_m_h5_tk", "_m_h5_tk_enc"]
    .map((key) => setCookie.match(new RegExp(`${key}=([^;,]+)`))?.[0])
    .filter(Boolean)
    .join("; ");
}

function extractAliExpressProductId(url: URL): string | null {
  return url.pathname.match(/\/(?:item|i)\/(\d+)\.html?$/)?.[1] ?? null;
}

function extractJsonLdProduct(html: string): Record<string, unknown> | null {
  const scripts = html.match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) ?? [];
  for (const script of scripts) {
    const body = script.replace(/^[\s\S]*?>/, "").replace(/<\/script>$/i, "");
    try {
      const parsed = JSON.parse(body) as unknown;
      const items = Array.isArray(parsed) ? parsed : [parsed];
      const product = items.flatMap((item) => Array.isArray((item as Record<string, unknown>)["@graph"]) ? (item as Record<string, unknown>)["@graph"] as unknown[] : [item])
        .find((item) => text((item as Record<string, unknown>)["@type"])?.toLowerCase().includes("product"));
      if (product && typeof product === "object") return product as Record<string, unknown>;
    } catch {
      continue;
    }
  }
  return null;
}

function extractTag(html: string, tag: string): string | null {
  return decode(html.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"))?.[1]);
}

function extractMeta(html: string, name: string): string | null {
  return decode(html.match(new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']+)["'][^>]*>`, "i"))?.[1]);
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function number(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function money(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const parsed = Number.parseFloat(String(value ?? "").replace(/[^0-9.]+/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function array(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function parseJson(value: string | null): unknown {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function decode(value: string | undefined): string | null {
  return value?.replace(/<[^>]+>/g, "").replaceAll("&amp;", "&").replaceAll("&quot;", "\"").replaceAll("&#39;", "'").trim() || null;
}
