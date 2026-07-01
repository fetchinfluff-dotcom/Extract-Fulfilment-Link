import type { AppEnv } from "@listingforge/config";
import type { PricingResult } from "@listingforge/pricing";
import { GeneratedListingSchema, type GeneratedListing, type SourceProduct } from "@listingforge/schemas";

export type GenerateInput = {
  source: SourceProduct;
  pricing: PricingResult;
  brandProfile?: {
    storeName?: string;
    tone?: string;
    prohibitedPhrases?: string[];
  };
};

export interface AiProvider {
  generateListing(input: GenerateInput): Promise<GeneratedListing>;
}

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 70);
}

function conciseProductName(value: string): string {
  const cleaned = value
    .replace(/\s+/g, " ")
    .replace(/\b(for|with|kit|set|accessories|portable|new|hot sale)\b[\s\S]*$/i, "")
    .trim();
  return (cleaned || value).split(" ").slice(0, 5).join(" ");
}

function sourceSentence(value: string | null | undefined, fallback: string): string {
  const sentence = value?.replace(/\s+/g, " ").split(/[.!?]/).find((item) => item.trim().length > 30)?.trim();
  return sentence ? `${sentence}.` : fallback;
}

function displayFactValues(input: SourceProduct): string[] {
  const blocked = /^(price|shipping|cost|description)$/i;
  return input.facts
    .filter((fact) => !blocked.test(fact.field))
    .map((fact) => fact.value)
    .filter((value): value is string | number | boolean => ["string", "number", "boolean"].includes(typeof value))
    .map(String)
    .filter((value) => value.trim().length > 2 && !/^\d+(\.\d+)?$/.test(value))
    .slice(0, 3);
}

function displaySpecs(input: SourceProduct): Record<string, string> {
  const rows: Record<string, string> = { "Product type": conciseProductName(input.sourceTitle) };
  const variant = input.variants[0];
  if (variant?.title && variant.title !== "Default") rows["Available option"] = variant.title;
  for (const [key, value] of Object.entries(input.attributes)) {
    if (Object.keys(rows).length >= 5) break;
    if (/aliexpress|price|shipping|cost/i.test(key)) continue;
    if (!["string", "number", "boolean"].includes(typeof value)) continue;
    rows[key] = String(value);
  }
  return rows;
}

export class MockAiProvider implements AiProvider {
  async generateListing(input: GenerateInput): Promise<GeneratedListing> {
    const rawProductType = String(input.source.facts.find((fact) => fact.field === "product_type")?.value ?? input.source.sourceTitle ?? "Product");
    const productType = conciseProductName(rawProductType);
    const brandName = `${slugify(productType).split("-").filter(Boolean)[0]?.slice(0, 8) || "Nova"}Pro`;
    const selectedTitle = `${brandName} - ${productType}`;
    const factIds = input.source.facts.map((fact) => fact.factId);
    const media = input.source.media.slice(0, 5);
    const imageBlock = (index: number, alt: string) => media[index] ? { type: "image", url: media[index].url, alt } : null;
    const packageItems = input.source.packageContents?.length ? input.source.packageContents : [`${productType} product`];
    const specs = displaySpecs(input.source);
    const featureBullets = displayFactValues(input.source).concat([
      "Simple design for everyday use",
      "Clear product details for easier buying decisions",
      "Multiple product images available for review"
    ]).slice(0, 4);
    const intro = sourceSentence(input.source.sourceDescriptionText, `${productType} is designed for shoppers who want a practical product that is easy to understand, compare, and use.`);
    return GeneratedListingSchema.parse({
      category: "General merchandise",
      subcategory: null,
      riskLevel: "LOW",
      targetBuyer: "Shoppers looking for a practical product with clear everyday benefits",
      valueProposition: `${productType} positioned with clear visuals, practical benefits, and conservative claims.`,
      titleCandidates: [
        { title: selectedTitle, pattern: "[Brand/Product Name] - [Product type or main benefit]", mainKeyword: productType, riskNotes: [] },
        { title: `${brandName} ${productType} for Everyday Use`, pattern: "Brand + product type + use case", mainKeyword: productType, riskNotes: [] },
        { title: `${productType} for Everyday Use`, pattern: "Plain SEO descriptive title", mainKeyword: productType, riskNotes: [] },
        { title: `${brandName} Essential ${productType}`, pattern: "Brandable short title", mainKeyword: productType, riskNotes: [] },
        { title: `${productType} with Clear Product Details`, pattern: "Trust-first title without unsupported claims", mainKeyword: productType, riskNotes: [] }
      ],
      selectedTitle,
      subtitle: `${productType} combines practical design with straightforward everyday use.`,
      heroBenefits: featureBullets.slice(0, 4),
      sections: [
        { key: "product-hero", type: "hero", heading: `Meet ${productType}`, blocks: [imageBlock(0, `${productType} hero image`), intro], mediaAssetIds: media[0] ? ["media-1"] : [], factIds },
        { key: "trust-strip", type: "trust", heading: "What makes it easy to choose?", blocks: [{ type: "list", items: featureBullets.slice(0, 3) }], factIds },
        { key: "problem-outcome", type: "problem", heading: "Want a simpler everyday solution?", blocks: [`${productType} helps present a clear answer for shoppers who want a useful product without confusing setup or unnecessary extras.`], factIds },
        { key: "product-demo", type: "demo", heading: "See the details up close", blocks: [imageBlock(1, `${productType} detail image`), "Use the product images to show shape, finish, controls, and included details before shoppers reach the specifications."], mediaAssetIds: media[1] ? ["media-2"] : [], factIds },
        { key: "three-core-benefits", type: "benefits", heading: "Why shoppers will care", blocks: [{ type: "list", items: featureBullets.slice(0, 3) }, imageBlock(2, `${productType} feature image`)], mediaAssetIds: media[2] ? ["media-3"] : [], factIds },
        { key: "how-it-works", type: "how-it-works", heading: "How it fits into daily use", blocks: [`Keep ${productType.toLowerCase()} within reach, choose the option that matches your needs, and follow the instructions included with the product.`], factIds },
        { key: "why-choose", type: "comparison", heading: "A clear choice for practical buyers", blocks: [imageBlock(3, `${productType} lifestyle image`), { type: "list", items: ["Easy to compare from the product images", "Straightforward details before checkout", "Built around practical everyday use"] }], mediaAssetIds: media[3] ? ["media-4"] : [], factIds },
        { key: "customer-proof", type: "placeholder", heading: "Review with confidence", blocks: ["Clear product details, realistic benefits, and useful images help shoppers decide without exaggerated promises."], factIds: [], placeholder: true },
        { key: "specifications", type: "specifications", heading: "Product Details", blocks: [{ type: "table", rows: specs }], factIds },
        { key: "package-contents", type: "package", heading: "Package Includes", blocks: [{ type: "list", items: packageItems }], factIds },
        { key: "guarantee-faq", type: "faq", heading: "Before you buy", blocks: [`Check the selected option, review the product images, and confirm ${productType.toLowerCase()} matches your intended use before checkout.`], factIds },
        { key: "final-cta-reviews", type: "cta", heading: `Ready to try ${productType}?`, blocks: [imageBlock(4, `${productType} final product image`), "Choose the option that fits your needs and review the product details before ordering."], mediaAssetIds: media[4] ? ["media-5"] : [], factIds }
      ],
      faq: [
        { question: "What is this product?", answer: `${productType} is a practical product designed for everyday use.`, factIds },
        { question: "How should I choose the right option?", answer: "Review the product images, selected option, and package details before ordering.", factIds },
        { question: "What should I check before checkout?", answer: "Confirm the option, quantity, product details, and store policy information shown on the page.", factIds }
      ],
      seo: {
        metaTitle: selectedTitle.slice(0, 60),
        metaDescription: `${productType} product page with clear benefits, useful images, practical details, and an easy-to-review FAQ.`.slice(0, 155),
        handle: slugify(selectedTitle),
        imageAltTexts: input.source.media.map((media, index) => ({ assetId: `media-${index + 1}`, alt: `${productType} product image ${index + 1}` }))
      },
      productJsonLdDraft: {
        "@context": "https://schema.org",
        "@type": "Product",
        name: selectedTitle,
        description: `${productType} product page with clear benefits and practical details.`
      },
      compliance: {
        warnings: ["Confirm media usage rights before export.", "Pricing is an estimate, not a profit guarantee."],
        unsupportedClaims: [],
        humanReviewRequired: false
      },
      factReferences: [
        { claim: selectedTitle, factIds },
        { claim: "Product page uses conservative, reviewable claims.", factIds }
      ]
    });
  }
}

export class OpenAiCompatibleProvider implements AiProvider {
  constructor(private readonly env: Pick<AppEnv, "AI_BASE_URL" | "AI_API_KEY" | "AI_MODEL_QUALITY"> & Partial<Pick<AppEnv, "AI_TIMEOUT_MS">>) {}
  async generateListing(input: GenerateInput): Promise<GeneratedListing> {
    if (!this.env.AI_BASE_URL || !this.env.AI_API_KEY || !this.env.AI_MODEL_QUALITY) {
      throw new Error("OpenAI-compatible provider requires AI_BASE_URL, AI_API_KEY, and AI_MODEL_QUALITY.");
    }
    const base = await new MockAiProvider().generateListing(input);
    const warnings: string[] = [];
    const common = {
      SOURCE_PRODUCT: sourceBrief(input.source),
      PRICING_RESULT: input.pricing,
      BRAND_PROFILE: input.brandProfile ?? {},
      RULES: [
        "Return only JSON.",
        "Write storefront product-page copy for shoppers, not internal notes for merchants.",
        "Use only supplied facts. Do not invent reviews, ratings, guarantees, certifications, shipping times, urgency, or unsupported claims.",
        "Do not use these internal terms anywhere in storefront fields: detected, supplier, item cost, shipping cost, [object Object], verified reviews only after import.",
        "Never mention wholesale cost, landed cost, suggested price range, import status, source extraction, media rights, publishing, or AI.",
        "Use natural sales-page headings instead of module names."
      ].join(" ")
    };
    const sectionChunks = [
      ["product-hero", "trust-strip", "problem-outcome", "product-demo"],
      ["three-core-benefits", "how-it-works", "why-choose", "customer-proof"],
      ["specifications", "package-contents", "guarantee-faq", "final-cta-reviews"]
    ];
    const calls = await Promise.allSettled([
      this.completeJson({
        ...common,
        TASK: "Create title, buyer positioning, hero bullets, and SEO fields.",
        JSON_SHAPE: {
          selectedTitle: "BrandName - Product type or main benefit",
          subtitle: "string",
          targetBuyer: "string",
          valueProposition: "string",
          heroBenefits: ["3 to 5 short strings"],
          titleCandidates: [{ title: "string", pattern: "string", mainKeyword: "string", riskNotes: [] }],
          seo: { metaTitle: "string", metaDescription: "string", handle: "url-handle" }
        }
      }, 900),
      ...sectionChunks.map((keys) => this.completeJson({
        ...common,
        TASK: "Rewrite only these description modules as a conversion-focused but compliant product page. Follow this blueprint when relevant: hero, problem hook, outcome, detail/demo, benefits, how it works, use cases, why choose it, specifications, package contents, FAQ objection handling, final CTA. Keep claims conservative and fact-backed.",
        SECTION_KEYS: keys,
        JSON_SHAPE: { sections: [{ key: keys[0], heading: "natural shopper-facing heading", blocks: ["1 to 3 concise strings or list blocks"] }] }
      }, 1200)),
      this.completeJson({
        ...common,
        TASK: "Create factual FAQ answers only.",
        JSON_SHAPE: { faq: [{ question: "string", answer: "string", factIds: ["known fact id"] }] }
      }, 700)
    ]);

    const titlePatch = calls[0];
    if (titlePatch.status === "fulfilled") applyTitlePatch(base, titlePatch.value);
    else warnings.push("AI title patch timed out or failed.");

    for (const call of calls.slice(1, 4)) {
      if (call.status === "fulfilled") applySectionsPatch(base, call.value);
      else warnings.push("AI section patch timed out or failed.");
    }

    const faqPatch = calls.at(4);
    if (faqPatch?.status === "fulfilled") applyFaqPatch(base, faqPatch.value);
    else warnings.push("AI FAQ patch timed out or failed.");

    const parsed = GeneratedListingSchema.safeParse({
      ...base,
      compliance: { ...base.compliance, warnings: [...base.compliance.warnings, ...warnings] }
    });
    if (parsed.success) return parsed.data;
    return aiFallback(input, `AI patch merge failed schema validation: ${summarizeSchemaIssues(parsed.error.issues)}; deterministic fallback draft was used.`);
  }

  private async completeJson(payload: unknown, maxTokens: number): Promise<unknown> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), Math.min(this.env.AI_TIMEOUT_MS ?? 120_000, 35_000));
    try {
      const response = await fetch(`${this.env.AI_BASE_URL!.replace(/\/$/, "")}/chat/completions`, {
        method: "POST",
        signal: controller.signal,
        headers: {
          authorization: `Bearer ${this.env.AI_API_KEY}`,
          "content-type": "application/json"
        },
        body: JSON.stringify({
          model: this.env.AI_MODEL_QUALITY,
          temperature: 0.2,
          max_tokens: maxTokens,
          messages: [
            { role: "system", content: "Return only one JSON object matching the requested JSON_SHAPE." },
            { role: "user", content: JSON.stringify(payload) }
          ]
        })
      });
      if (!response.ok) throw new Error(`AI provider returned HTTP ${response.status}.`);
      const content = parseOpenAiResponse(await response.text()).choices?.[0]?.message?.content;
      if (!content) throw new Error("AI provider returned an empty response.");
      return parseJsonObjectContent(content);
    } finally {
      clearTimeout(timeout);
    }
  }
}

export function createAiProvider(env: AppEnv): AiProvider {
  if (env.NODE_ENV === "production" && env.AI_MOCK_MODE) throw new Error("AI_MOCK_MODE must be false in production.");
  return env.AI_MOCK_MODE ? new MockAiProvider() : new OpenAiCompatibleProvider(env);
}

function stripJsonFence(value: string): string {
  return value.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "");
}

function parseOpenAiResponse(value: string): { choices?: Array<{ message?: { content?: string } }> } {
  return parseJsonObjectContent(value) as { choices?: Array<{ message?: { content?: string } }> };
}

async function aiFallback(input: GenerateInput, warning: string): Promise<GeneratedListing> {
  const fallback = await new MockAiProvider().generateListing(input);
  return {
    ...fallback,
    compliance: {
      ...fallback.compliance,
      warnings: [...fallback.compliance.warnings, warning]
    }
  };
}

function parseJsonObjectContent(value: string): unknown {
  const text = stripJsonFence(value);
  const start = text.indexOf("{");
  if (start === -1) throw new Error("AI provider did not return a JSON object.");

  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = start; index < text.length; index += 1) {
    const char = text[index];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === "\"") {
        inString = false;
      }
      continue;
    }
    if (char === "\"") {
      inString = true;
      continue;
    }
    if (char === "{") depth += 1;
    if (char === "}") depth -= 1;
    if (depth === 0) return JSON.parse(text.slice(start, index + 1));
  }

  throw new Error("AI provider returned incomplete JSON.");
}

function sourceBrief(source: SourceProduct): unknown {
  return {
    platform: source.platform,
    canonicalUrl: source.canonicalUrl,
    sourceProductId: source.sourceProductId,
    sourceTitle: source.sourceTitle,
    sourceDescriptionText: source.sourceDescriptionText,
    currency: source.currency,
    variants: source.variants.slice(0, 5),
    shippingQuotes: source.shippingQuotes.slice(0, 3),
    media: source.media.slice(0, 8),
    packageContents: source.packageContents,
    instructions: source.instructions,
    facts: source.facts,
    warnings: source.warnings,
    confidence: source.confidence
  };
}

function applyTitlePatch(listing: GeneratedListing, value: unknown): void {
  if (!isRecord(value)) return;
  if (typeof value.selectedTitle === "string") listing.selectedTitle = value.selectedTitle.slice(0, 160);
  if (typeof value.subtitle === "string") listing.subtitle = value.subtitle.slice(0, 220);
  if (typeof value.targetBuyer === "string") listing.targetBuyer = value.targetBuyer.slice(0, 180);
  if (typeof value.valueProposition === "string") listing.valueProposition = value.valueProposition.slice(0, 300);
  if (Array.isArray(value.heroBenefits) && value.heroBenefits.length >= 3) {
    listing.heroBenefits = value.heroBenefits.map(String).slice(0, 5);
  }
  if (Array.isArray(value.titleCandidates) && value.titleCandidates.length >= 5) {
    listing.titleCandidates = value.titleCandidates.slice(0, 5).map((item) => {
      const record = isRecord(item) ? item : {};
      return {
        title: String(record.title ?? listing.selectedTitle),
        pattern: String(record.pattern ?? "[Brand/Product Name] - [Product type or main benefit]"),
        mainKeyword: typeof record.mainKeyword === "string" ? record.mainKeyword : null,
        riskNotes: Array.isArray(record.riskNotes) ? record.riskNotes.map(String) : []
      };
    });
  }
  if (isRecord(value.seo)) {
    listing.seo = {
      ...listing.seo,
      metaTitle: typeof value.seo.metaTitle === "string" ? value.seo.metaTitle.slice(0, 70) : listing.seo.metaTitle,
      metaDescription: typeof value.seo.metaDescription === "string" ? value.seo.metaDescription.slice(0, 170) : listing.seo.metaDescription,
      handle: typeof value.seo.handle === "string" ? slugify(value.seo.handle) : listing.seo.handle
    };
  }
}

function applySectionsPatch(listing: GeneratedListing, value: unknown): void {
  if (!isRecord(value) || !Array.isArray(value.sections)) return;
  for (const patch of value.sections) {
    if (!isRecord(patch) || typeof patch.key !== "string" || !Array.isArray(patch.blocks)) continue;
    const section = listing.sections.find((item) => item.key === patch.key);
    if (!section) continue;
    const fixedBlocks = section.blocks.filter((block) => isRecord(block) && (block.type === "image" || block.type === "table"));
    section.blocks = [...fixedBlocks, ...patch.blocks.map(cleanBlock).filter(Boolean)].slice(0, 4);
  }
}

function applyFaqPatch(listing: GeneratedListing, value: unknown): void {
  if (!isRecord(value) || !Array.isArray(value.faq)) return;
  const faq = value.faq.slice(0, 6).flatMap((item) => {
    if (!isRecord(item) || typeof item.question !== "string" || typeof item.answer !== "string") return [];
    return [{ question: item.question, answer: item.answer, factIds: Array.isArray(item.factIds) ? item.factIds.map(String) : [] }];
  });
  if (faq.length) listing.faq = faq;
}

function cleanBlock(block: unknown): unknown {
  if (typeof block === "string") return block.slice(0, 900);
  if (!isRecord(block)) return null;
  if (block.type === "list" && Array.isArray(block.items)) return { type: "list", items: block.items.map(String).slice(0, 6) };
  return typeof block.text === "string" ? block.text.slice(0, 900) : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function summarizeSchemaIssues(issues: Array<{ path: PropertyKey[]; message: string }>): string {
  return issues.slice(0, 3).map((issue) => `${issue.path.map(String).join(".") || "root"} ${issue.message}`).join("; ");
}
