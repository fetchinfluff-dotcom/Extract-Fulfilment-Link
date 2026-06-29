import type { AppEnv } from "@listingforge/config";
import type { SourcePlatform, SourceProduct } from "@listingforge/schemas";
import { SourceProductSchema } from "@listingforge/schemas";
import { detectPlatform, validateSourceUrl } from "@listingforge/security";
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
    return SourceProductSchema.parse(normalizePublicPage(input.url, input.targetCountry, this.platform, html));
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

function normalizePublicPage(url: URL, targetCountry: string, platform: SourcePlatform, html: string): SourceProduct {
  const jsonLd = extractJsonLdProduct(html);
  const offers = record(jsonLd?.offers);
  const title = text(jsonLd?.name) ?? extractTag(html, "title") ?? "Untitled public product";
  const description = text(jsonLd?.description) ?? extractMeta(html, "description") ?? null;
  const price = Number(text(offers?.price) ?? 0);
  const currency = (text(offers?.priceCurrency) ?? "USD").slice(0, 3).toUpperCase();
  const image = text(Array.isArray(jsonLd?.image) ? jsonLd.image[0] : jsonLd?.image);
  const warnings = ["Public-page extraction only. Review facts manually; dynamic variants and shipping may be incomplete."];
  if (!price) warnings.push("No public price was found.");
  return {
    platform,
    canonicalUrl: url.toString(),
    sourceProductId: text(jsonLd?.sku) ?? null,
    sourceTitle: title,
    sourceDescriptionText: description,
    currency,
    variants: [{ id: "public-default", sku: text(jsonLd?.sku) ?? null, title: "Default", options: {}, itemCost: Number.isFinite(price) ? price : 0, inventoryStatus: null, imageUrl: image ?? null }],
    shippingQuotes: [],
    media: image ? [{ url: image, type: "image", sourceType: "supplier", licenseStatus: "unknown" }] : [],
    attributes: {},
    packageContents: [],
    instructions: [],
    facts: [
      { factId: "public_title", field: "product_type", value: title, source: "public_page", sourcePath: "title/jsonld.name", confidence: 0.65 },
      ...(description ? [{ factId: "public_description", field: "description", value: description, source: "public_page", sourcePath: "meta/jsonld.description", confidence: 0.55 }] : [])
    ],
    warnings,
    confidence: 0.55
  };
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

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function decode(value: string | undefined): string | null {
  return value?.replace(/<[^>]+>/g, "").replaceAll("&amp;", "&").replaceAll("&quot;", "\"").replaceAll("&#39;", "'").trim() || null;
}
