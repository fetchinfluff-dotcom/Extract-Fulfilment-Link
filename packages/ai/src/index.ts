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

export class MockAiProvider implements AiProvider {
  async generateListing(input: GenerateInput): Promise<GeneratedListing> {
    const rawProductType = String(input.source.facts.find((fact) => fact.field === "product_type")?.value ?? input.source.sourceTitle ?? "Product");
    const productType = conciseProductName(rawProductType);
    const brandName = `${slugify(productType).split("-").filter(Boolean)[0]?.slice(0, 8) || "Nova"}Pro`;
    const selectedTitle = `${brandName} - ${productType}`;
    const factIds = input.source.facts.map((fact) => fact.factId);
    const media = input.source.media.slice(0, 5);
    const imageBlock = (index: number, alt: string) => media[index] ? { type: "image", url: media[index].url, alt } : `Add supplier image ${index + 1} after media rights review.`;
    const packageItems = input.source.packageContents?.length ? input.source.packageContents : ["Confirm package contents from supplier before publishing."];
    const specs = Object.keys(input.source.attributes).length ? input.source.attributes : { Source: input.source.platform, "Item cost": `${input.source.currency} ${input.source.variants[0]?.itemCost ?? 0}` };
    return GeneratedListingSchema.parse({
      category: "General merchandise",
      subcategory: null,
      riskLevel: "LOW",
      targetBuyer: "Shoppers comparing practical product upgrades",
      valueProposition: `${productType} positioned with source-backed benefits, clear visuals, and conservative claims.`,
      titleCandidates: [
        { title: selectedTitle, pattern: "[Brand/Product Name] - [Product type or main benefit]", mainKeyword: productType, riskNotes: [] },
        { title: `${brandName} ${productType} for Everyday Use`, pattern: "Brand + product type + use case", mainKeyword: productType, riskNotes: [] },
        { title: `${productType} - Source-Verified Product Draft`, pattern: "Plain SEO descriptive title", mainKeyword: productType, riskNotes: [] },
        { title: `${brandName} Essential ${productType}`, pattern: "Brandable short title", mainKeyword: productType, riskNotes: [] },
        { title: `${productType} with Supplier-Verified Details`, pattern: "Trust-first title without unsupported claims", mainKeyword: productType, riskNotes: [] }
      ],
      selectedTitle,
      subtitle: "A source-backed product page draft with editable modules, supplier media, and conservative claims.",
      heroBenefits: ["Supplier media included for review", "Price range based on detected landed cost", "Claims tied to extracted facts", "Editable HTML modules for store publishing"],
      sections: [
        { key: "product-hero", type: "hero", heading: `Meet ${productType}`, blocks: [imageBlock(0, `${productType} hero image`), `${selectedTitle} gives shoppers a clear, visual introduction to the product before they read deeper details.`], mediaAssetIds: media[0] ? ["media-1"] : [], factIds },
        { key: "trust-strip", type: "trust", heading: "What You Can Review First", blocks: [{ type: "list", items: ["Supplier facts extracted", "Media requires rights review", "No fake reviews or unsupported badges added"] }], factIds },
        { key: "problem-outcome", type: "problem", heading: "A Practical Everyday Upgrade", blocks: [`Use this section to connect the shopper's practical need to the outcome this ${productType.toLowerCase()} can support, without promising unverified results.`], factIds },
        { key: "product-demo", type: "demo", heading: "See The Details Up Close", blocks: [imageBlock(1, `${productType} detail image`), "Show the product in use with supplier media or merchant-owned demo content."], mediaAssetIds: media[1] ? ["media-2"] : [], factIds },
        { key: "three-core-benefits", type: "benefits", heading: "Why It Stands Out", blocks: [{ type: "list", items: input.source.facts.slice(0, 3).map((fact) => String(fact.value)).concat(["Clear product details"]).slice(0, 3) }, imageBlock(2, `${productType} feature image`)], mediaAssetIds: media[2] ? ["media-3"] : [], factIds },
        { key: "how-it-works", type: "how-it-works", heading: "Simple To Use", blocks: ["Explain setup, use, and care steps using only supplier-confirmed details."], factIds },
        { key: "why-choose", type: "comparison", heading: "Clear Value Before You Publish", blocks: [imageBlock(3, `${productType} lifestyle image`), { type: "table", rows: { "Detected item cost": `${input.source.currency} ${input.source.variants[0]?.itemCost ?? 0}`, "Detected shipping": `${input.source.shippingQuotes[0]?.currency ?? input.source.currency} ${input.source.shippingQuotes[0]?.cost ?? "Needs review"}`, "Suggested range": `$${input.pricing.lowPrice} - $${input.pricing.highPrice}` } }], mediaAssetIds: media[3] ? ["media-4"] : [], factIds },
        { key: "customer-proof", type: "placeholder", heading: "Customer Feedback Notes", blocks: ["Add only merchant-verified reviews, UGC, or purchase counts here. No social proof was generated because no verifiable review data was extracted."], factIds: [], placeholder: true },
        { key: "specifications", type: "specifications", heading: "Product Details", blocks: [{ type: "table", rows: specs }], factIds },
        { key: "package-contents", type: "package", heading: "Package Includes", blocks: [{ type: "list", items: packageItems }], factIds },
        { key: "guarantee-faq", type: "faq", heading: "Before You Buy", blocks: ["Add the store's real return, support, and warranty policy here before publishing."], factIds },
        { key: "final-cta-reviews", type: "cta", heading: "Ready For Your Store", blocks: [imageBlock(4, `${productType} final product image`), "Invite shoppers to choose the variant that fits their needs. Add verified reviews only after import."], mediaAssetIds: media[4] ? ["media-5"] : [], factIds }
      ],
      faq: [
        { question: "What is this product?", answer: `It is listed by the supplier as: ${productType}.`, factIds },
        { question: "Are the images ready to publish?", answer: "They are supplier media links and should be reviewed for store usage rights before publishing.", factIds },
        { question: "What price range is suggested?", answer: `The estimated suggested range is $${input.pricing.lowPrice} to $${input.pricing.highPrice}, based on landed cost inputs.`, factIds }
      ],
      seo: {
        metaTitle: selectedTitle.slice(0, 60),
        metaDescription: `${productType} product listing draft with source-backed details, supplier media, and editable store-ready sections.`.slice(0, 155),
        handle: slugify(selectedTitle),
        imageAltTexts: input.source.media.map((media, index) => ({ assetId: `media-${index + 1}`, alt: `${productType} product image ${index + 1}` }))
      },
      productJsonLdDraft: {
        "@context": "https://schema.org",
        "@type": "Product",
        name: selectedTitle,
        description: "Draft product data from verified fixture facts. Merchant must confirm final offer fields."
      },
      compliance: {
        warnings: ["Confirm media usage rights before export.", "Pricing is an estimate, not a profit guarantee."],
        unsupportedClaims: [],
        humanReviewRequired: false
      },
      factReferences: [
        { claim: selectedTitle, factIds },
        { claim: "Suggested price range is based on detected landed cost inputs.", factIds }
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
      RULES: "Return only JSON. Use only supplied facts. Do not invent reviews, ratings, guarantees, certifications, shipping times, urgency, or unsupported claims."
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
        TASK: "Rewrite only these description modules. Keep claims conservative and fact-backed.",
        SECTION_KEYS: keys,
        JSON_SHAPE: { sections: [{ key: keys[0], blocks: ["1 to 3 concise strings or list blocks"] }] }
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
