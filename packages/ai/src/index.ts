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

export class MockAiProvider implements AiProvider {
  async generateListing(input: GenerateInput): Promise<GeneratedListing> {
    const productType = String(input.source.facts.find((fact) => fact.field === "product_type")?.value ?? "Product");
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
        { key: "product-hero", type: "hero", heading: "Product Hero", blocks: [imageBlock(0, `${productType} hero image`), `${selectedTitle} gives shoppers a clear, visual introduction to the product before they read deeper details.`], mediaAssetIds: media[0] ? ["media-1"] : [], factIds },
        { key: "trust-strip", type: "trust", heading: "Trust Strip", blocks: [{ type: "list", items: ["Supplier facts extracted", "Media requires rights review", "No fake reviews or unsupported badges added"] }], factIds },
        { key: "problem-outcome", type: "problem", heading: "Problem / Outcome", blocks: [`Use this section to connect the shopper's practical need to the outcome this ${productType.toLowerCase()} can support, without promising unverified results.`], factIds },
        { key: "product-demo", type: "demo", heading: "Product Demo", blocks: [imageBlock(1, `${productType} detail image`), "Show the product in use with supplier media or merchant-owned demo content."], mediaAssetIds: media[1] ? ["media-2"] : [], factIds },
        { key: "three-core-benefits", type: "benefits", heading: "Three Core Benefits", blocks: [{ type: "list", items: input.source.facts.slice(0, 3).map((fact) => String(fact.value)).concat(["Clear product details"]).slice(0, 3) }], factIds },
        { key: "how-it-works", type: "how-it-works", heading: "How It Works", blocks: ["Explain setup, use, and care steps using only supplier-confirmed details."], factIds },
        { key: "why-choose", type: "comparison", heading: "Why Choose This Product", blocks: [{ type: "table", rows: { "Detected item cost": `${input.source.currency} ${input.source.variants[0]?.itemCost ?? 0}`, "Detected shipping": `${input.source.shippingQuotes[0]?.currency ?? input.source.currency} ${input.source.shippingQuotes[0]?.cost ?? "Needs review"}`, "Suggested range": `$${input.pricing.lowPrice} - $${input.pricing.highPrice}` } }], factIds },
        { key: "customer-proof", type: "placeholder", heading: "Customer Proof", blocks: ["Add only merchant-verified reviews, UGC, or purchase counts here. No social proof was generated because no verifiable review data was extracted."], factIds: [], placeholder: true },
        { key: "specifications", type: "specifications", heading: "Specifications", blocks: [{ type: "table", rows: specs }], factIds },
        { key: "package-contents", type: "package", heading: "Package Contents", blocks: [{ type: "list", items: packageItems }], factIds },
        { key: "guarantee-faq", type: "faq", heading: "Guarantee + FAQ", blocks: ["Add the store's real guarantee, return, and warranty policy here. Do not publish supplier or platform guarantees unless your store honors them."], factIds },
        { key: "final-cta-reviews", type: "cta", heading: "Final CTA + Reviews", blocks: [imageBlock(2, `${productType} final product image`), "Invite shoppers to choose the variant that fits their needs. Add verified reviews only after import."], mediaAssetIds: media[2] ? ["media-3"] : [], factIds }
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
  constructor(private readonly env: Pick<AppEnv, "AI_BASE_URL" | "AI_API_KEY" | "AI_MODEL_QUALITY">) {}
  async generateListing(input: GenerateInput): Promise<GeneratedListing> {
    if (!this.env.AI_BASE_URL || !this.env.AI_API_KEY || !this.env.AI_MODEL_QUALITY) {
      throw new Error("OpenAI-compatible provider requires AI_BASE_URL, AI_API_KEY, and AI_MODEL_QUALITY.");
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20_000);
    try {
      const response = await fetch(`${this.env.AI_BASE_URL.replace(/\/$/, "")}/chat/completions`, {
        method: "POST",
        signal: controller.signal,
        headers: {
          authorization: `Bearer ${this.env.AI_API_KEY}`,
          "content-type": "application/json"
        },
        body: JSON.stringify({
          model: this.env.AI_MODEL_QUALITY,
          temperature: 0.2,
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content:
                "You are ListingForge's product listing generator. Return only JSON matching the GeneratedListing schema. Do not invent reviews, ratings, guarantees, certifications, shipping times, or unsupported claims."
            },
            {
              role: "user",
              content: JSON.stringify({
                SOURCE_PRODUCT: input.source,
                PRICING_RESULT: input.pricing,
                BRAND_PROFILE: input.brandProfile ?? {},
              REQUIRED_TOP_LEVEL_KEYS: ["category", "riskLevel", "titleCandidates", "selectedTitle", "subtitle", "heroBenefits", "sections", "faq", "seo", "compliance", "factReferences"],
              REQUIRED_DESCRIPTION_MODULES: ["Product Hero", "Trust Strip", "Problem/Outcome", "Product Demo", "Three Core Benefits", "How It Works", "Why Choose This Product", "Customer Proof", "Specifications", "Package Contents", "Guarantee + FAQ", "Final CTA + Reviews"],
              TITLE_FORMULA: "[Brand/Product Name] - [Product type or main benefit]",
              SOCIAL_PROOF_RULE: "Only include ratings, review counts, purchases, guarantees, certifications, or urgency when SOURCE_PRODUCT facts prove them.",
              JSON_SHAPE: {
                category: "string",
                subcategory: null,
                riskLevel: "LOW",
                targetBuyer: "string",
                valueProposition: "string",
                titleCandidates: [{ title: "string", pattern: "string", mainKeyword: "string", riskNotes: [] }],
                selectedTitle: "string",
                subtitle: "string",
                heroBenefits: ["string", "string", "string"],
                sections: [{ key: "product-hero", type: "hero", heading: "Product Hero", blocks: ["string"], mediaAssetIds: ["media-1"], factIds: ["fact-id"], placeholder: false }],
                faq: [{ question: "string", answer: "string", factIds: ["fact-id"] }],
                seo: { metaTitle: "string", metaDescription: "string", handle: "string", imageAltTexts: [{ assetId: "media-1", alt: "string" }] },
                productJsonLdDraft: null,
                compliance: { warnings: [], unsupportedClaims: [], humanReviewRequired: false },
                factReferences: [{ claim: "string", factIds: ["fact-id"] }]
              }
            })
          }
        ]
      })
      });
      if (!response.ok) return aiFallback(input, `AI provider returned HTTP ${response.status}; deterministic fallback draft was used.`);
      const payload = parseOpenAiResponse(await response.text());
      const content = payload.choices?.[0]?.message?.content;
      if (!content) return aiFallback(input, "AI provider returned an empty response; deterministic fallback draft was used.");
      const parsed = GeneratedListingSchema.safeParse(unwrapGeneratedListing(parseJsonObjectContent(content)));
      if (parsed.success) return parsed.data;
      return aiFallback(input, "AI provider response did not match the required schema; deterministic fallback draft was used.");
    } catch {
      return aiFallback(input, "AI provider request failed or timed out; deterministic fallback draft was used.");
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

function unwrapGeneratedListing(value: unknown): unknown {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  const record = value as Record<string, unknown>;
  for (const key of ["listing", "generatedListing", "productListing", "data"]) {
    if (record[key]) return record[key];
  }
  return value;
}
