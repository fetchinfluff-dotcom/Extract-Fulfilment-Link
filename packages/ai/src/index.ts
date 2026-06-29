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
    const materialFact = input.source.facts.find((fact) => fact.field === "material");
    const selectedTitle = `Foldable ${productType} for Focused Workspaces`;
    const factIds = input.source.facts.map((fact) => fact.factId);
    return GeneratedListingSchema.parse({
      category: "Home office",
      subcategory: "Lighting",
      riskLevel: "LOW",
      targetBuyer: "Home office shoppers",
      valueProposition: `Light a desk or bedside area with a compact ${productType.toLowerCase()} that folds away when not in use.`,
      titleCandidates: [
        { title: selectedTitle, pattern: "Benefit-oriented title", mainKeyword: productType, riskNotes: [] },
        { title: `Compact USB ${productType}`, pattern: "Clear descriptive SEO title", mainKeyword: productType, riskNotes: [] },
        { title: `DeskReady ${productType}`, pattern: "Brandable name + product category", mainKeyword: productType, riskNotes: [] },
        { title: `Touch-Control ${productType}`, pattern: "Mechanism + product type", mainKeyword: productType, riskNotes: [] },
        { title: `Policy-Safe Rechargeable ${productType}`, pattern: "Conservative policy-safe title", mainKeyword: productType, riskNotes: [] }
      ],
      selectedTitle,
      subtitle: "A compact, rechargeable desk light with touch control and adjustable brightness.",
      heroBenefits: ["Folds down for compact storage", "Three brightness modes for different tasks", "USB rechargeable design", "Touch control keeps operation simple"],
      sections: [
        {
          key: "summary",
          type: "summary",
          heading: "A Practical Light for Small Workspaces",
          blocks: [`This ${productType.toLowerCase()} is built for desks, bedside tables, and study corners where space matters.`],
          factIds: ["title_1"]
        },
        {
          key: "benefits",
          type: "benefits",
          heading: "Why It Fits Your Routine",
          blocks: [{ type: "list", items: ["Foldable body for storage", "Three brightness modes", "USB charging cable included"] }],
          factIds: ["mode_1", "package_1"]
        },
        {
          key: "specifications",
          type: "specifications",
          heading: "Product Details",
          blocks: [{ type: "table", rows: { Material: String(materialFact?.value ?? "Needs review"), Power: "USB rechargeable", Control: "Touch control" } }],
          factIds: ["material_1"]
        },
        {
          key: "package",
          type: "package",
          heading: "What's Included",
          blocks: [{ type: "list", items: input.source.packageContents ?? [] }],
          factIds: ["package_1"]
        },
        {
          key: "customer-proof",
          type: "placeholder",
          heading: "Add Verified Customer Proof",
          blocks: ["Add merchant-approved reviews, customer media, or UGC here. ListingForge does not create fake reviews."],
          factIds: [],
          placeholder: true
        }
      ],
      faq: [
        { question: "What is this product?", answer: `It is a ${productType.toLowerCase()} for desk or bedside lighting.`, factIds: ["title_1"] },
        { question: "How is it powered?", answer: "The supplier fixture lists USB rechargeable power and includes a USB charging cable.", factIds: ["package_1"] },
        { question: "What price range is suggested?", answer: `The estimated suggested range is $${input.pricing.lowPrice} to $${input.pricing.highPrice}, based on landed cost inputs.`, factIds }
      ],
      seo: {
        metaTitle: selectedTitle.slice(0, 60),
        metaDescription: "Compact foldable LED desk lamp with USB charging, touch control, and adjustable brightness for home office or bedside use.",
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
        { claim: selectedTitle, factIds: ["title_1"] },
        { claim: "Three brightness modes", factIds: ["mode_1"] }
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
    const response = await fetch(`${this.env.AI_BASE_URL.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
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
              REQUIRED_TOP_LEVEL_KEYS: ["category", "riskLevel", "titleCandidates", "selectedTitle", "subtitle", "heroBenefits", "sections", "seo", "compliance", "factReferences"]
            })
          }
        ]
      })
    });
    if (!response.ok) throw new Error(`AI provider returned HTTP ${response.status}.`);
    const payload = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const content = payload.choices?.[0]?.message?.content;
    if (!content) throw new Error("AI provider returned an empty response.");
    return GeneratedListingSchema.parse(parseJsonObjectContent(content));
  }
}

export function createAiProvider(env: AppEnv): AiProvider {
  return env.AI_MOCK_MODE ? new MockAiProvider() : new OpenAiCompatibleProvider(env);
}

function stripJsonFence(value: string): string {
  return value.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "");
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
