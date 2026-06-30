import type { GeneratedListing } from "@listingforge/schemas";

const blue = "#236fa1";

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
  if (/detected item cost|detected shipping|suggested range|aliexpress:|add verified reviews only after import/i.test(text)) return null;
  return text;
}

function renderBlock(block: unknown): string {
  const text = cleanText(block);
  if (text) return `<p style="text-align: left;"><span style="font-size: 16px; color: ${blue};">${escapeHtml(text)}</span></p>`;
  if (!block || typeof block !== "object") return "";
  const record = block as Record<string, unknown>;
  if (record.type === "list" && Array.isArray(record.items)) {
    return record.items.flatMap((item) => {
      const itemText = cleanText(item);
      return itemText ? [`<p><span style="font-size: 16px; color: ${blue};">✅ ${escapeHtml(itemText)}</span></p>`] : [];
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
        if (!valueText || /detected item cost|detected shipping|suggested range|aliexpress/i.test(key)) return [];
        return [`<p><span style="font-size: 16px; color: ${blue};">✅ <strong>${escapeHtml(key)}</strong>: ${escapeHtml(valueText)}</span></p>`];
      })
      .join("");
  }
  return "";
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
      const heading = `<p style="text-align: center;"><strong><span style="font-size: 18px; color: ${blue};">${escapeHtml(section.heading)}</span></strong></p>`;
      return `${heading}
${section.blocks.map(renderBlock).join("\n")}`;
    })
    .join("\n");
  const faq = listing.faq?.length
    ? `<p><strong><span style="font-size: 18px; color: ${blue};">Learn More About ${escapeHtml(listing.selectedTitle)}</span></strong><br /><span style="font-size: 16px; color: ${blue};">Frequently Asked Questions</span></p>${listing.faq
        .map((item) => `<p><span style="font-size: 16px; color: ${blue};"><strong>${escapeHtml(item.question)}</strong><br />${escapeHtml(item.answer)}</span></p>`)
        .join("")}`
    : "";
  return sanitizeHtml(`<div class="lf-product-description"><p style="text-align: center;"><strong><span style="font-size: 18px; color: ${blue};">${escapeHtml(listing.selectedTitle)}</span></strong><br /><span style="font-size: 16px; color: ${blue};">${escapeHtml(listing.subtitle)}</span></p>${body}${faq}</div>`);
}
