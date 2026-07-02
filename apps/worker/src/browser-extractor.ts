import type { AppEnv } from "@listingforge/config";
import type { SourceProduct } from "@listingforge/schemas";

export type BrowserProductSnapshot = {
  title: string | null;
  price: number | null;
  currency: string | null;
  images: string[];
  finalUrl: string;
};

export function needsBrowserExtraction(source: SourceProduct): boolean {
  return source.platform === "aliexpress" && ((source.variants[0]?.itemCost ?? 0) <= 0 || source.media.length < 3);
}

export function mergeBrowserSnapshot(source: SourceProduct, snapshot: BrowserProductSnapshot, targetCountry: string): SourceProduct {
  const existing = source.variants[0];
  const price = snapshot.price ?? existing?.itemCost ?? 0;
  const currency = snapshot.currency ?? source.currency;
  const images = [...new Set([...source.media.map((item) => item.url), ...snapshot.images])].slice(0, 12);
  return {
    ...source,
    sourceTitle: source.sourceTitle === "Untitled public product" && snapshot.title ? snapshot.title : source.sourceTitle,
    currency,
    variants: source.variants.map((variant, index) => ({
      ...variant,
      itemCost: index === 0 && variant.itemCost <= 0 ? price : variant.itemCost,
      imageUrl: variant.imageUrl ?? images[0] ?? null
    })),
    media: images.map((url) => source.media.find((item) => item.url === url) ?? { url, type: "image", sourceType: "supplier", licenseStatus: "unknown" }),
    facts: [
      ...source.facts,
      ...(snapshot.price == null ? [] : [{ factId: "browser_price", field: "item_cost", value: snapshot.price, source: "browser_page", sourcePath: "rendered price", confidence: 0.65 }]),
      ...(snapshot.images.length ? [{ factId: "browser_media", field: "media", value: snapshot.images.length, source: "browser_page", sourcePath: "rendered imagePathList/meta", confidence: 0.7 }] : [])
    ],
    warnings: [
      ...source.warnings,
      `Browser extraction fallback used for ${targetCountry}; check rendered price/currency manually.`,
      ...(snapshot.price == null ? ["Browser extraction did not find a rendered product price."] : [])
    ],
    confidence: Math.max(source.confidence, snapshot.price || snapshot.images.length ? 0.68 : source.confidence)
  };
}

export async function extractAliExpressBrowserSnapshot(url: URL, env: Pick<AppEnv, "BROWSER_EXTRACTOR_TIMEOUT_MS">): Promise<BrowserProductSnapshot> {
  const { chromium } = await import("@playwright/test");
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({
      locale: "en-US",
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36"
    });
    await page.goto(url.toString(), { waitUntil: "domcontentloaded", timeout: env.BROWSER_EXTRACTOR_TIMEOUT_MS });
    await page.waitForTimeout(Math.min(10_000, Math.floor(env.BROWSER_EXTRACTOR_TIMEOUT_MS / 3)));
    return await page.evaluate<BrowserProductSnapshot>(`(() => {
      const meta = (name) => document.querySelector('meta[property="' + name + '"],meta[name="' + name + '"]')?.getAttribute("content")?.trim() || null;
      const raw = document.documentElement.innerHTML.match(/"imagePathList"\\s*:\\s*(\\[[^\\]]+\\])/i)?.[1];
      let htmlImages = [];
      try {
        htmlImages = raw ? JSON.parse(raw).filter((item) => typeof item === "string") : [];
      } catch {}
      const priceText = document.querySelector('[class*="price-default--current"]')?.textContent?.trim()
        ?? document.body.innerText.match(/(?:US\\s*)?\\$\\s?[\\d,.]+|USD\\s?[\\d,.]+|\\u20ab\\s?[\\d,.]+/)?.[0]
        ?? null;
      const currency = priceText?.includes("\\u20ab") ? "VND" : /\\$|USD/i.test(priceText ?? "") ? "USD" : null;
      const price = priceText ? Number.parseFloat(priceText.replace(/[^0-9.]+/g, "")) : Number.NaN;
      return {
        title: meta("og:title") ?? (document.title.trim() || null),
        price: Number.isFinite(price) ? price : null,
        currency,
        images: [...new Set([meta("og:image"), ...htmlImages].filter(Boolean))].slice(0, 12),
        finalUrl: location.href
      };
    })()`);
  } finally {
    await browser.close();
  }
}
