import type { GeneratedListing } from "@listingforge/schemas";

const blue = "#236fa1";
const internalNoisePattern = /\b(?:detected|supplier|item cost|shipping cost)\b|\b(?:price|shipping)\s*:|\$\d|\[object Object\]|verified reviews only after import/i;
const fakeProofPattern = /\bverified (?:buyer|purchase|customer)\b|\brated\s+\d+(?:\.\d+)?\b|\b\d+(?:\.\d+)?\s*(?:out of 5|stars?)\b|\b\d[\d,]*\s+(?:happy\s+)?customers\b|\bcustomers?\s+(?:love|say|rave|agree)\b|\btestimonial\b|\u2605{3,}/i;

export type DescriptionQualityScore = {
  score: number;
  checks: {
    noInternalNoise: boolean;
    enoughImages: boolean;
    hasAltText: boolean;
    enoughBullets: boolean;
    enoughSections: boolean;
    hasFaq: boolean;
    enoughLength: boolean;
    noFakeProof: boolean;
  };
  notes: string[];
};

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function cleanText(value: unknown): string | null {
  if (typeof value !== "string" && typeof value !== "number" && typeof value !== "boolean") return null;
  const text = String(value).replace(/\s+/g, " ").trim();
  if (!text || text === "[object Object]" || /^\d+(\.\d+)?$/.test(text)) return null;
  if (internalNoisePattern.test(text) || fakeProofPattern.test(text) || /suggested range|aliexpress:/i.test(text)) return null;
  return text;
}

function cleanVisibleText(value: string, fallback: string): string {
  return cleanText(value) ?? fallback;
}

function renderBlock(block: unknown): string {
  const text = cleanText(block);
  if (text) return `<p style="text-align: left;"><span style="font-size: 16px; color: ${blue};">${escapeHtml(text)}</span></p>`;
  if (!block || typeof block !== "object") return "";
  const record = block as Record<string, unknown>;
  if (record.type === "list" && Array.isArray(record.items)) {
    return record.items.flatMap((item) => {
      const itemText = cleanText(item);
      return itemText ? [`<p><span style="font-size: 16px; color: ${blue};">&#9989; ${escapeHtml(itemText)}</span></p>`] : [];
    }).join("");
  }
  if (record.type === "image" && typeof record.url === "string") {
    return `<p style="text-align: center;"><span style="font-size: 16px; color: ${blue};"><img style="display: block; margin: 0 auto; max-width: 100%; width: 1000px; height: auto;" src="${escapeHtml(record.url)}" alt="${escapeHtml(String(record.alt ?? ""))}" loading="lazy" /></span></p>`;
  }
  if (record.type === "quote" && typeof record.text === "string") {
    const quote = cleanText(record.text);
    return quote ? `<p style="text-align: center;"><span style="font-size: 16px; color: ${blue};">${escapeHtml(quote)}</span></p>` : "";
  }
  if (record.type === "table" && record.rows && typeof record.rows === "object") {
    return Object.entries(record.rows as Record<string, unknown>)
      .flatMap(([key, value]) => {
        const valueText = cleanText(value);
        if (!valueText || internalNoisePattern.test(key) || /suggested range|aliexpress/i.test(key)) return [];
        return [`<p><span style="font-size: 16px; color: ${blue};">&#9989; <strong>${escapeHtml(key)}</strong>: ${escapeHtml(valueText)}</span></p>`];
      })
      .join("");
  }
  return "";
}

function assertDescriptionQuality(html: string): string {
  return internalNoisePattern.test(html) ? html.replace(internalNoisePattern, "").replace(/\s{2,}/g, " ") : html;
}

export function scoreDescriptionHtmlQuality(html: string): DescriptionQualityScore {
  const imageCount = (html.match(/<img\b/gi) ?? []).length;
  const altCount = (html.match(/\salt="/gi) ?? []).length;
  const bulletCount = (html.match(/&#9989;/g) ?? []).length;
  const headingCount = (html.match(/font-size: 18px/g) ?? []).length;
  const checks = {
    noInternalNoise: !internalNoisePattern.test(html),
    enoughImages: imageCount >= 4,
    hasAltText: imageCount > 0 && altCount >= imageCount,
    enoughBullets: bulletCount >= 8,
    enoughSections: headingCount >= 9,
    hasFaq: /Frequently Asked Questions/i.test(html),
    enoughLength: html.length >= 5000,
    noFakeProof: !fakeProofPattern.test(html)
  };
  const notes = Object.entries(checks).flatMap(([key, passed]) => passed ? [] : [key]);
  const passed = Object.values(checks).filter(Boolean).length;
  return { score: Math.round((passed / Object.keys(checks).length) * 100), checks, notes };
}

export function sanitizeHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/\s+style\s*=\s*(['"])(?=[\s\S]*?(?:javascript:|expression\s*\(|behavior\s*:))[\s\S]*?\1/gi, "")
    .replace(/\s+(href|src)\s*=\s*(['"])\s*javascript:[\s\S]*?\2/gi, "");
}

export function renderListingHtml(listing: GeneratedListing): string {
  const body = listing.sections
    .map((section) => {
      const heading = `<p style="text-align: center;"><strong><span style="font-size: 18px; color: ${blue};">${escapeHtml(cleanVisibleText(section.heading, "Product details"))}</span></strong></p>`;
      return `${heading}
${section.blocks.map(renderBlock).join("\n")}`;
    })
    .join("\n");
  const faq = listing.faq?.length
    ? `<p><strong><span style="font-size: 18px; color: ${blue};">Learn More About ${escapeHtml(listing.selectedTitle)}</span></strong><br /><span style="font-size: 16px; color: ${blue};">Frequently Asked Questions</span></p>${listing.faq
        .map((item) => `<p><span style="font-size: 16px; color: ${blue};"><strong>${escapeHtml(cleanVisibleText(item.question, "Common question"))}</strong><br />${escapeHtml(cleanVisibleText(item.answer, "Review the product details before ordering."))}</span></p>`)
        .join("")}`
    : "";
  const html = sanitizeHtml(`<div class="lf-product-description"><p style="text-align: center;"><strong><span style="font-size: 18px; color: ${blue};">${escapeHtml(cleanVisibleText(listing.selectedTitle, "Product details"))}</span></strong><br /><span style="font-size: 16px; color: ${blue};">${escapeHtml(cleanVisibleText(listing.subtitle, "A practical product with clear everyday benefits."))}</span></p>${body}${faq}</div>`);
  return assertDescriptionQuality(html);
}
