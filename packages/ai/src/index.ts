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
    .replace(/\b(for|with|kit|set|accessories|portable|new|hot sale|dropship|wholesale)\b[\s\S]*$/i, "")
    .trim();
  return (cleaned || value).split(" ").slice(0, 5).join(" ");
}

function capitalize(value: string): string {
  return value ? `${value[0]?.toUpperCase() ?? ""}${value.slice(1)}` : value;
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

type ProductResearchBrief = {
  productType: string;
  brandName: string;
  selectedTitle: string;
  category: string;
  targetBuyer: string;
  subtitle: string;
  intro: string;
  problemHeading: string;
  problemBody: string;
  outcomeHeading: string;
  outcomeBody: string;
  demoBody: string;
  benefits: string[];
  useSteps: string[];
  whyChoose: string[];
  specs: Record<string, string>;
  packageItems: string[];
  faq: Array<{ question: string; answer: string }>;
  factIds: string[];
  media: SourceProduct["media"];
};

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.map((value) => value.replace(/\s+/g, " ").trim()).filter(Boolean))];
}

function safePhrase(value: string, productType: string): string | null {
  const text = value.replace(/\s+/g, " ").trim();
  if (text.length < 4 || text.length > 95 || /^\d+(\.\d+)?$/.test(text)) return null;
  if (/price|shipping|cost|aliexpress|detected|supplier|\[object Object\]/i.test(text)) return null;
  if (text.toLowerCase() === productType.toLowerCase()) return null;
  return text;
}

function inferCategory(text: string): string {
  if (/lamp|light|projector|charger|headphone|speaker|camera|gps|fan|power|electric|usb|led/i.test(text)) return "tech";
  if (/face|skin|hair|beauty|makeup|brush|shaver|cellulite|scalp|nail|lashes/i.test(text)) return "beauty";
  if (/knee|neck|back|waist|foot|ankle|massage|pillow|brace|posture|relief|glove|nasal|sleep/i.test(text)) return "wellness";
  if (/dog|cat|pet|paw|fur|litter|harness/i.test(text)) return "pet";
  if (/kitchen|knife|cleaner|steam|bottle|garden|sprinkler|home|bath|bag|storage/i.test(text)) return "home";
  if (/dress|bra|leggings|shirt|hat|glasses|holster|wear/i.test(text)) return "apparel";
  return "general";
}

function profileFor(category: string, productType: string): Pick<ProductResearchBrief, "targetBuyer" | "problemHeading" | "problemBody" | "outcomeHeading" | "outcomeBody" | "benefits" | "useSteps" | "whyChoose"> {
  const name = productType.toLowerCase();
  const profiles: Record<string, Pick<ProductResearchBrief, "targetBuyer" | "problemHeading" | "problemBody" | "outcomeHeading" | "outcomeBody" | "benefits" | "useSteps" | "whyChoose">> = {
    beauty: {
      targetBuyer: "Beauty shoppers who want a simple at-home routine",
      problemHeading: "Want a cleaner way to upgrade your routine?",
      problemBody: `${productType} helps keep your daily care routine simple, organized, and easy to repeat without adding unnecessary steps.`,
      outcomeHeading: "Designed for a smoother self-care moment",
      outcomeBody: `Bring ${name} into your routine when you want a product that feels easy to understand, easy to use, and easy to store.`,
      benefits: ["Supports a simple at-home routine", "Keeps daily care easier to organize", "Designed for straightforward everyday use", "Clear details help shoppers choose with confidence"],
      useSteps: ["Choose the option that fits your routine", "Use it as shown in the product images", "Store it cleanly after each use"],
      whyChoose: ["Simple enough for regular use", "Easy to compare from the product images", "Made for shoppers who prefer practical beauty tools"]
    },
    wellness: {
      targetBuyer: "Shoppers looking for practical comfort and daily support",
      problemHeading: "Need a more comfortable way to get through the day?",
      problemBody: `${productType} is built for shoppers who want practical support without a complicated setup or bulky routine.`,
      outcomeHeading: "Comfort-focused design for everyday use",
      outcomeBody: `Use ${name} when you want a straightforward product that fits naturally into your daily routine.`,
      benefits: ["Built around everyday comfort", "Simple setup keeps the routine easy", "Practical design for regular use", "Clear product details make choosing easier"],
      useSteps: ["Review the fit or option before use", "Use it according to the included instructions", "Keep it ready for your next routine"],
      whyChoose: ["Useful for daily routines", "Easy to review before checkout", "Designed around comfort, fit, and practical use"]
    },
    tech: {
      targetBuyer: "Shoppers comparing useful everyday gadgets",
      problemHeading: "Want a smarter tool without extra clutter?",
      problemBody: `${productType} gives shoppers a practical way to add useful function to everyday spaces without making the setup feel complicated.`,
      outcomeHeading: "Useful function, cleaner everyday use",
      outcomeBody: `The design keeps ${name} simple to understand, easy to place, and practical for regular use.`,
      benefits: ["Adds useful function without a complicated setup", "Compact details make it easier to place and use", "Clear controls or parts are easy to inspect", "Practical design for daily routines"],
      useSteps: ["Place or prepare the product where you need it", "Use the available controls or options", "Store, charge, or reset it as instructed"],
      whyChoose: ["Practical for everyday spaces", "Product images make the details easy to inspect", "Built for shoppers who prefer useful, simple gadgets"]
    },
    pet: {
      targetBuyer: "Pet owners looking for practical daily-care products",
      problemHeading: "Looking for an easier way to care for your pet?",
      problemBody: `${productType} helps pet owners add a practical tool to their care routine without making the process feel harder than it needs to be.`,
      outcomeHeading: "Made for simple pet-care routines",
      outcomeBody: `Use ${name} when you want a product that is easy to review, easy to compare, and simple to bring into daily care.`,
      benefits: ["Designed for everyday pet-care routines", "Simple details make it easier to compare options", "Practical structure for regular use", "Clear images help shoppers inspect the product"],
      useSteps: ["Choose the option that fits your pet", "Use it as shown in the product details", "Clean or store it according to the instructions"],
      whyChoose: ["Made for routine care", "Easy to compare before checkout", "Practical for pet owners who want simple tools"]
    },
    home: {
      targetBuyer: "Home shoppers looking for practical everyday upgrades",
      problemHeading: "Want a simpler way to handle everyday tasks?",
      problemBody: `${productType} helps shoppers bring a more organized, practical tool into the home without unnecessary complexity.`,
      outcomeHeading: "A cleaner way to keep daily tasks moving",
      outcomeBody: `The product is easy to compare visually and simple to add to a kitchen, cleaning, storage, or home routine.`,
      benefits: ["Helps simplify common home tasks", "Practical design for regular use", "Easy to store or keep nearby", "Product images make the details easy to inspect"],
      useSteps: ["Prepare the product where you need it", "Use it for the intended home task", "Clean or store it after use"],
      whyChoose: ["Straightforward enough for everyday use", "Useful in common home routines", "Easy to review from the product details"]
    },
    apparel: {
      targetBuyer: "Shoppers comparing fit, comfort, and everyday wear",
      problemHeading: "Looking for an easier everyday fit?",
      problemBody: `${productType} helps shoppers compare style, fit, and practical details before choosing the option that works best for them.`,
      outcomeHeading: "Made to feel easy to choose",
      outcomeBody: `Review the images, sizing details, and available options to decide whether ${name} fits your wardrobe or routine.`,
      benefits: ["Designed around everyday wear", "Visual details make fit easier to compare", "Simple option review before checkout", "Practical style for regular use"],
      useSteps: ["Review size and option details", "Compare the product images", "Choose the option that matches your use case"],
      whyChoose: ["Easy to compare visually", "Focused on practical everyday wear", "Clear details before checkout"]
    },
    general: {
      targetBuyer: "Shoppers comparing practical product upgrades",
      problemHeading: "Want a smarter way to make everyday use easier?",
      problemBody: `${productType} combines practical design with a simple user experience, helping shoppers solve common small frustrations without extra complexity.`,
      outcomeHeading: "Need convenient results without extra effort?",
      outcomeBody: `This product is designed to be easy to understand, easy to compare, and simple to bring into daily life.`,
      benefits: ["Practical design for everyday use", "Simple details make it easier to compare", "Easy to bring into a routine", "Clear product images support confident buying decisions"],
      useSteps: ["Choose the option that fits your needs", "Use the product as shown in the details", "Store or care for it according to the instructions"],
      whyChoose: ["Practical design", "Focused everyday use", "Clear product details before checkout"]
    }
  };
  return profiles[category] ?? profiles.general!;
}

function buildResearchBrief(input: GenerateInput): ProductResearchBrief {
  const rawProductType = String(input.source.facts.find((fact) => fact.field === "product_type")?.value ?? input.source.sourceTitle ?? "Product");
  const productType = conciseProductName(rawProductType);
  const brandSeed = slugify(productType).split("-").find((part) => part.length > 2)?.slice(0, 8) || "nova";
  const brandName = `${capitalize(brandSeed)}Pro`;
  const selectedTitle = `${brandName} - ${productType}`;
  const category = inferCategory(`${input.source.sourceTitle} ${input.source.sourceDescriptionText ?? ""}`);
  const profile = profileFor(category, productType);
  const factIds = input.source.facts.map((fact) => fact.factId);
  const media = input.source.media.filter((item) => item.type === "image" && item.licenseStatus !== "rejected").slice(0, 7);
  const factBenefits = displayFactValues(input.source).flatMap((value) => safePhrase(value, productType) ?? []);
  const benefits = uniqueStrings([...factBenefits, ...profile.benefits]).slice(0, 4);
  const useSteps = input.source.instructions?.length
    ? input.source.instructions.flatMap((step) => safePhrase(step, productType) ?? []).slice(0, 3)
    : profile.useSteps;
  const packageItems = input.source.packageContents?.length
    ? input.source.packageContents.flatMap((item) => safePhrase(item, productType) ?? []).slice(0, 6)
    : [`${productType} product`];
  return {
    ...profile,
    productType,
    brandName,
    selectedTitle,
    category,
    subtitle: `${productType} combines practical design with reliable everyday use.`,
    intro: sourceSentence(input.source.sourceDescriptionText, `${productType} is made for shoppers who want a useful product that is easy to understand, compare, and bring into daily life.`),
    demoBody: `Use the product images to inspect the shape, parts, finish, and available options before you decide.`,
    benefits,
    useSteps: useSteps.length ? useSteps : profile.useSteps,
    whyChoose: profile.whyChoose,
    specs: displaySpecs(input.source),
    packageItems,
    faq: [
      { question: `What is ${productType}?`, answer: `${productType} is a practical product designed for everyday use in its category.` },
      { question: "How should I choose the right option?", answer: "Review the product images, available option, package details, and specifications before ordering." },
      { question: "What should I check before checkout?", answer: "Confirm the selected option, quantity, included items, and store policy information shown on the page." }
    ],
    factIds,
    media
  };
}

export class MockAiProvider implements AiProvider {
  async generateListing(input: GenerateInput): Promise<GeneratedListing> {
    const brief = buildResearchBrief(input);
    const imageBlock = (index: number, role: string) => brief.media[index] ? { type: "image", url: brief.media[index].url, alt: `${brief.productType} ${role} image`, role } : null;
    return GeneratedListingSchema.parse({
      category: brief.category,
      subcategory: null,
      riskLevel: "LOW",
      targetBuyer: brief.targetBuyer,
      valueProposition: `${brief.productType} is positioned as a practical, easy-to-review product page with clear benefits and useful images.`,
      titleCandidates: [
        { title: brief.selectedTitle, pattern: "[Brand/Product Name] - [Product type or main benefit]", mainKeyword: brief.productType, riskNotes: [] },
        { title: `${brief.brandName} ${brief.productType} for Everyday Use`, pattern: "Brand + product type + use case", mainKeyword: brief.productType, riskNotes: [] },
        { title: `${brief.productType} for Everyday Use`, pattern: "Plain SEO descriptive title", mainKeyword: brief.productType, riskNotes: [] },
        { title: `${brief.brandName} Essential ${brief.productType}`, pattern: "Brandable short title", mainKeyword: brief.productType, riskNotes: [] },
        { title: `${brief.productType} with Clear Product Details`, pattern: "Trust-first title without unsupported claims", mainKeyword: brief.productType, riskNotes: [] }
      ],
      selectedTitle: brief.selectedTitle,
      subtitle: brief.subtitle,
      heroBenefits: brief.benefits.slice(0, 4),
      sections: [
        { key: "product-hero", type: "hero", heading: `Meet ${brief.productType}`, blocks: [imageBlock(0, "hero"), brief.intro, { type: "list", items: brief.benefits.slice(0, 3) }], mediaAssetIds: brief.media[0] ? ["media-1"] : [], factIds: brief.factIds },
        { key: "trust-strip", type: "package", heading: "What comes in the box?", blocks: [{ type: "list", items: brief.packageItems.slice(0, 4) }], factIds: brief.factIds },
        { key: "problem-outcome", type: "problem", heading: brief.problemHeading, blocks: [brief.problemBody, imageBlock(1, "detail")], mediaAssetIds: brief.media[1] ? ["media-2"] : [], factIds: brief.factIds },
        { key: "product-demo", type: "demo", heading: brief.outcomeHeading, blocks: [brief.outcomeBody, imageBlock(2, "demo"), brief.demoBody], mediaAssetIds: brief.media[2] ? ["media-3"] : [], factIds: brief.factIds },
        { key: "three-core-benefits", type: "benefits", heading: `Why shoppers choose ${brief.productType}`, blocks: [{ type: "list", items: brief.benefits.slice(0, 4) }, imageBlock(3, "benefit")], mediaAssetIds: brief.media[3] ? ["media-4"] : [], factIds: brief.factIds },
        { key: "how-it-works", type: "how-it-works", heading: "How it works in daily use", blocks: [{ type: "list", items: brief.useSteps.slice(0, 3) }], factIds: brief.factIds },
        { key: "why-choose", type: "comparison", heading: `Why choose ${brief.productType}?`, blocks: [imageBlock(4, "lifestyle"), { type: "list", items: brief.whyChoose.slice(0, 4) }], mediaAssetIds: brief.media[4] ? ["media-5"] : [], factIds: brief.factIds },
        { key: "customer-proof", type: "trust", heading: "Clear details before you buy", blocks: ["The page focuses on practical product details, useful images, and realistic benefits so shoppers can compare the item without exaggerated promises."], factIds: brief.factIds },
        { key: "specifications", type: "specifications", heading: "Product details", blocks: [{ type: "table", rows: brief.specs }, imageBlock(5, "specification")], mediaAssetIds: brief.media[5] ? ["media-6"] : [], factIds: brief.factIds },
        { key: "package-contents", type: "package", heading: "Package includes", blocks: [{ type: "list", items: brief.packageItems }], factIds: brief.factIds },
        { key: "guarantee-faq", type: "faq", heading: "Before you buy", blocks: [`Review the selected option, package details, and product images to make sure ${brief.productType.toLowerCase()} matches your intended use.`], factIds: brief.factIds },
        { key: "final-cta-reviews", type: "cta", heading: `Ready to try ${brief.productType}?`, blocks: [imageBlock(6, "final"), "Choose the option that fits your needs and review the product details before ordering."], mediaAssetIds: brief.media[6] ? ["media-7"] : [], factIds: brief.factIds }
      ],
      faq: brief.faq.map((item) => ({ ...item, factIds: brief.factIds })),
      seo: {
        metaTitle: brief.selectedTitle.slice(0, 60),
        metaDescription: `${brief.productType} product page with clear benefits, useful images, practical details, and an easy-to-review FAQ.`.slice(0, 155),
        handle: slugify(brief.selectedTitle),
        imageAltTexts: input.source.media.map((media, index) => ({ assetId: `media-${index + 1}`, alt: `${brief.productType} product image ${index + 1}` }))
      },
      productJsonLdDraft: {
        "@context": "https://schema.org",
        "@type": "Product",
        name: brief.selectedTitle,
        description: `${brief.productType} product page with clear benefits and practical details.`
      },
      compliance: {
        warnings: ["Confirm media usage rights before export.", "Pricing is an estimate, not a profit guarantee."],
        unsupportedClaims: [],
        humanReviewRequired: false
      },
      factReferences: [
        { claim: brief.selectedTitle, factIds: brief.factIds },
        { claim: "Product page uses conservative, reviewable claims.", factIds: brief.factIds }
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
        "Never mention product price, shipping price, wholesale cost, landed cost, suggested price range, import status, source extraction, media rights, publishing, or AI.",
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
