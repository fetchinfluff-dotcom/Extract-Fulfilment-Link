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

function renderBlock(block: unknown): string {
  if (typeof block === "string") return `<p style="text-align: left;"><span style="font-size: 16px; color: ${blue};">${escapeHtml(block)}</span></p>`;
  if (!block || typeof block !== "object") return "";
  const record = block as Record<string, unknown>;
  if (record.type === "list" && Array.isArray(record.items)) {
    return record.items.map((item) => `<p><span style="font-size: 16px; color: ${blue};">✅ ${escapeHtml(String(item))}</span></p>`).join("");
  }
  if (record.type === "image" && typeof record.url === "string") {
    return `<p style="text-align: center;"><span style="font-size: 16px; color: ${blue};"><img style="display: block; margin: 0 auto; max-width: 100%; width: 1000px; height: auto;" src="${escapeHtml(record.url)}" alt="${escapeHtml(String(record.alt ?? ""))}" loading="lazy" /></span></p>`;
  }
  if (record.type === "quote" && typeof record.text === "string") {
    return `<p style="text-align: center;"><span style="font-size: 16px; color: ${blue};">${escapeHtml(record.text)}</span></p>`;
  }
  if (record.type === "table" && record.rows && typeof record.rows === "object") {
    return Object.entries(record.rows as Record<string, unknown>)
      .map(([key, value]) => `<p><span style="font-size: 16px; color: ${blue};">✅ <strong>${escapeHtml(key)}</strong>: ${escapeHtml(String(value))}</span></p>`)
      .join("");
  }
  return `<p style="text-align: left;"><span style="font-size: 16px; color: ${blue};">${escapeHtml(JSON.stringify(record))}</span></p>`;
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
  return sanitizeHtml(`<div class="lf-product-description"><p style="text-align: center;"><strong><span style="font-size: 18px; color: ${blue};">${escapeHtml(listing.selectedTitle)}</span></strong><br /><span style="font-size: 16px; color: ${blue};">${escapeHtml(listing.subtitle)}</span></p>${body}${faq}<p><span style="font-size: 18px; color: ${blue};"><strong>OUR GUARANTEE:</strong><br />If you do not have a positive experience for any reason, contact us any time and we will help you out.<br />✅ Safe and Secure SSL Checkout<br />✅ 100% Quality Inspection<br />✅ 24/7 Customer Service<br />✅ Real time tracking along the way<br />✅ No hidden fees</span></p></div>`);
}
