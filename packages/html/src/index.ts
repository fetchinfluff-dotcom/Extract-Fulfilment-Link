import { JSDOM } from "jsdom";
import createDOMPurify from "dompurify";
import type { GeneratedListing } from "@listingforge/schemas";

const window = new JSDOM("").window;
const purifier = createDOMPurify(window);

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderBlock(block: unknown): string {
  if (typeof block === "string") return `<p>${escapeHtml(block)}</p>`;
  if (!block || typeof block !== "object") return "";
  const record = block as Record<string, unknown>;
  if (record.type === "list" && Array.isArray(record.items)) {
    return `<ul>${record.items.map((item) => `<li>${escapeHtml(String(item))}</li>`).join("")}</ul>`;
  }
  if (record.type === "table" && record.rows && typeof record.rows === "object") {
    return `<table><tbody>${Object.entries(record.rows as Record<string, unknown>)
      .map(([key, value]) => `<tr><th>${escapeHtml(key)}</th><td>${escapeHtml(String(value))}</td></tr>`)
      .join("")}</tbody></table>`;
  }
  return `<p>${escapeHtml(JSON.stringify(record))}</p>`;
}

export function sanitizeHtml(html: string): string {
  return purifier.sanitize(html, {
    ALLOWED_TAGS: ["article", "section", "div", "h2", "h3", "p", "ul", "ol", "li", "strong", "em", "figure", "figcaption", "img", "table", "thead", "tbody", "tr", "th", "td", "details", "summary", "a", "br", "span"],
    ALLOWED_ATTR: ["class", "href", "src", "alt", "width", "height", "loading", "data-section-key"],
    ALLOW_DATA_ATTR: true
  });
}

export function renderListingHtml(listing: GeneratedListing): string {
  const body = listing.sections
    .map((section) => {
      const placeholder = section.placeholder ? " lf-placeholder" : "";
      return `<section data-section-key="${escapeHtml(section.key)}" class="lf-section${placeholder}">
<h2>${escapeHtml(section.heading)}</h2>
${section.blocks.map(renderBlock).join("\n")}
</section>`;
    })
    .join("\n");
  const faq = listing.faq?.length
    ? `<section data-section-key="faq" class="lf-section"><h2>Frequently Asked Questions</h2>${listing.faq
        .map((item) => `<details><summary>${escapeHtml(item.question)}</summary><p>${escapeHtml(item.answer)}</p></details>`)
        .join("")}</section>`
    : "";
  return sanitizeHtml(`<article class="lf-product-description">${body}${faq}</article>`);
}
