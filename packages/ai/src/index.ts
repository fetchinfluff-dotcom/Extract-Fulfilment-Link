import type { AppEnv } from "@listingforge/config";
import type { PricingResult } from "@listingforge/pricing";
import { GeneratedListingSchema, ListingBlockSchema, type GeneratedListing, type ListingBlock, type SourceProduct } from "@listingforge/schemas";

export type ReferencePageBlueprint = {
  url: string;
  title: string | null;
  metaDescription: string | null;
  headings: string[];
  sections?: Array<{
    key: string;
    heading: string;
    intent: string;
    mediaCount: number;
  }>;
  imageCount: number;
  videoCount: number;
  sectionPatterns: string[];
  styleSignals: string[];
  warnings: string[];
};

export type GenerateInput = {
  source: SourceProduct;
  pricing: PricingResult;
  brandProfile?: {
    storeName?: string;
    tone?: string;
    prohibitedPhrases?: string[];
  };
  referencePages?: ReferencePageBlueprint[];
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

function titleCase(value: string): string {
  return value.replace(/\b\w/g, (char) => char.toUpperCase());
}

function buildReferenceBlueprint(pages: ReferencePageBlueprint[] = []): ProductResearchBrief["referenceBlueprint"] {
  const sectionPatterns = uniqueStrings(pages.flatMap((page) => page.sectionPatterns)).slice(0, 6);
  const styleSignals = uniqueStrings(pages.flatMap((page) => page.styleSignals)).slice(0, 6);
  const headings = pages.flatMap((page) => page.headings);
  const sectionMap = pages.flatMap((page) => page.sections ?? []).map(({ key, intent, mediaCount }) => ({ key, intent, mediaCount })).slice(0, 10);
  const avgHeadingWords = headings.length ? headings.reduce((total, heading) => total + heading.split(/\s+/).length, 0) / headings.length : 6;
  const avgImages = pages.length ? pages.reduce((total, page) => total + page.imageCount, 0) / pages.length : 0;
  return {
    headingStyle: avgHeadingWords <= 5 ? "short benefit-led headings" : "answer-first editorial headings",
    sectionPatterns,
    styleSignals,
    mediaDensity: avgImages >= 8 ? "image-rich" : avgImages >= 4 ? "balanced media" : "text-led",
    sectionMap
  };
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
  referenceBlueprint: {
    headingStyle: string;
    sectionPatterns: string[];
    styleSignals: string[];
    mediaDensity: string;
    sectionMap: Array<{
      key: string;
      intent: string;
      mediaCount: number;
    }>;
  };
};

type PageStrategy = {
  angle: string;
  tone: string;
  sectionGuidance: Record<string, string>;
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
      useSteps: ["Set it up where your routine already happens", "Use a short session first to find a comfortable pace", "Clean or store it after use so it is ready next time"],
      whyChoose: ["Simple enough for regular use", "Designed for a cleaner at-home routine", "Made for shoppers who prefer practical beauty tools"]
    },
    wellness: {
      targetBuyer: "Shoppers looking for practical comfort and daily support",
      problemHeading: "Need a more comfortable way to get through the day?",
      problemBody: `${productType} is built for shoppers who want practical support without a complicated setup or bulky routine.`,
      outcomeHeading: "Comfort-focused design for everyday use",
      outcomeBody: `Use ${name} when you want a straightforward product that fits naturally into your daily routine.`,
      benefits: ["Built around everyday comfort", "Simple setup keeps the routine easy", "Practical design for regular use", "Clear product details make choosing easier"],
      useSteps: ["Start with a short comfort session", "Adjust the fit or setting until it feels natural", "Keep it nearby for your next screen break, rest period, or evening routine"],
      whyChoose: ["Useful for daily routines", "Built around comfort and repeatable use", "Designed around comfort, fit, and practical use"]
    },
    tech: {
      targetBuyer: "Shoppers comparing useful everyday gadgets",
      problemHeading: "Want a smarter tool without extra clutter?",
      problemBody: `${productType} gives shoppers a practical way to add useful function to everyday spaces without making the setup feel complicated.`,
      outcomeHeading: "Useful function, cleaner everyday use",
      outcomeBody: `The design keeps ${name} simple to understand, easy to place, and practical for regular use.`,
      benefits: ["Adds useful function without a complicated setup", "Compact details make it easier to place and use", "Clear controls help shoppers understand the routine before checkout", "Practical design for daily routines"],
      useSteps: ["Place or prepare the product where you need it", "Use the available controls or options", "Store, charge, or reset it as instructed"],
      whyChoose: ["Practical for everyday spaces", "Designed to reduce setup friction", "Built for shoppers who prefer useful, simple gadgets"]
    },
    pet: {
      targetBuyer: "Pet owners looking for practical daily-care products",
      problemHeading: "Looking for an easier way to care for your pet?",
      problemBody: `${productType} helps pet owners add a practical tool to their care routine without making the process feel harder than it needs to be.`,
      outcomeHeading: "Made for simple pet-care routines",
      outcomeBody: `Use ${name} when you want a product that is simple to bring into daily care.`,
      benefits: ["Designed for everyday pet-care routines", "Simple details make it easier to compare options", "Practical structure for regular use", "Helps owners understand where the product fits in daily care"],
      useSteps: ["Choose the option that fits your pet", "Use it as shown in the product details", "Clean or store it according to the instructions"],
      whyChoose: ["Made for routine care", "Easy to compare before checkout", "Practical for pet owners who want simple tools"]
    },
    home: {
      targetBuyer: "Home shoppers looking for practical everyday upgrades",
      problemHeading: "Want a simpler way to handle everyday tasks?",
      problemBody: `${productType} helps shoppers bring a more organized, practical tool into the home without unnecessary complexity.`,
      outcomeHeading: "A cleaner way to keep daily tasks moving",
      outcomeBody: `The product is easy to compare visually and simple to add to a kitchen, cleaning, storage, or home routine.`,
      benefits: ["Helps simplify common home tasks", "Practical design for regular use", "Easy to store or keep nearby", "Helps shoppers see how the product fits into the repeated task"],
      useSteps: ["Prepare the product where you need it", "Use it for the intended home task", "Clean or store it after use"],
      whyChoose: ["Straightforward enough for everyday use", "Useful in common home routines", "Designed to make a repeated task feel easier"]
    },
    apparel: {
      targetBuyer: "Shoppers comparing fit, comfort, and everyday wear",
      problemHeading: "Looking for an easier everyday fit?",
      problemBody: `${productType} helps shoppers compare style, fit, and practical details before choosing the option that works best for them.`,
      outcomeHeading: "Made to feel easy to choose",
      outcomeBody: `Review the images, sizing details, and available options to decide whether ${name} fits your wardrobe or routine.`,
      benefits: ["Designed around everyday wear", "Made to support a more comfortable fit", "Simple option choice before checkout", "Practical style for regular use"],
      useSteps: ["Choose the size or option that matches your routine", "Pair it with the outfit or activity it is meant for", "Follow the care details so it stays ready for regular wear"],
      whyChoose: ["Made for practical everyday wear", "Focused on comfort and fit", "Clear details before checkout"]
    },
    general: {
      targetBuyer: "Shoppers comparing practical product upgrades",
      problemHeading: "Want a smarter way to make everyday use easier?",
      problemBody: `${productType} combines practical design with a simple user experience, helping shoppers solve common small frustrations without extra complexity.`,
      outcomeHeading: "Need convenient results without extra effort?",
      outcomeBody: `This product is designed to be easy to understand, easy to compare, and simple to bring into daily life.`,
      benefits: ["Practical design for everyday use", "Simple details make it easier to compare", "Easy to bring into a routine", "Answers the basic buying questions before checkout"],
      useSteps: ["Choose the option that fits your needs", "Use the product as shown in the details", "Store or care for it according to the instructions"],
      whyChoose: ["Practical design", "Focused everyday use", "Clear product details before checkout"]
    }
  };
  return profiles[category] ?? profiles.general!;
}

function shopperMoment(category: string): string {
  return ({
    beauty: "your self-care routine",
    wellness: "your comfort routine",
    tech: "your everyday setup",
    pet: "your pet-care routine",
    home: "your home routine",
    apparel: "your everyday fit"
  } as Record<string, string>)[category] ?? "daily use";
}

function hasReferenceSection(brief: ProductResearchBrief, key: string): boolean {
  return brief.referenceBlueprint.sectionMap.some((section) => section.key === key);
}

function productSignals(productType: string): string[] {
  const text = productType.toLowerCase();
  return [
    /massage|massager/.test(text) ? "massage" : "",
    /vibration|vibrat/.test(text) ? "vibration" : "",
    /foldable|folding|portable|compact/.test(text) ? "portable" : "",
    /heat|warm|thermal/.test(text) ? "heat" : "",
    /cool|cold/.test(text) ? "cooling" : "",
    /usb|charge|recharge|battery|cordless/.test(text) ? "rechargeable" : "",
    /led|light|red light/.test(text) ? "light" : "",
    /eye|neck|back|knee|foot|ankle|waist/.test(text) ? "targeted-comfort" : ""
  ].filter(Boolean);
}

function valueBullets(brief: ProductResearchBrief): string[] {
  const signals = productSignals(brief.productType);
  const moment = shopperMoment(brief.category);
  const bySignal = [
    signals.includes("massage") ? `Creates a focused relaxation moment for ${moment}` : "",
    signals.includes("vibration") ? "Vibration mode adds a gentle, active comfort sensation instead of a plain passive accessory" : "",
    signals.includes("portable") ? "Foldable, compact design makes it easier to keep nearby, store, or pack for travel" : "",
    signals.includes("heat") ? "Warming function adds a cozy feel for short rest sessions" : "",
    signals.includes("cooling") ? "Cooling design supports a fresher, more comfortable use experience" : "",
    signals.includes("rechargeable") ? "Rechargeable or cable-powered setup helps avoid a cluttered routine" : "",
    signals.includes("light") ? "Light-based design gives the product a more guided, modern routine feel" : "",
    signals.includes("targeted-comfort") ? "Targeted shape focuses the product on the area shoppers actually want to support" : ""
  ].filter(Boolean);
  const byCategory: Record<string, string[]> = {
    wellness: ["Useful for screen-heavy days, travel downtime, or a short evening reset", "Designed to make comfort feel easier to repeat, not harder to start"],
    beauty: ["Fits neatly into an at-home self-care routine", "Helps make the routine feel more organized and intentional"],
    tech: ["Adds a useful function without making the setup feel complicated", "Works as a practical upgrade for everyday spaces"],
    home: ["Helps simplify a repeated home task", "Keeps the routine cleaner, quicker, or easier to manage"],
    pet: ["Built around simple daily care for pet owners", "Helps make a repeated care moment easier to handle"],
    apparel: ["Made for regular wear where comfort and fit matter", "Easy to style into a daily outfit or routine"]
  };
  return uniqueStrings([...bySignal, ...(byCategory[brief.category] ?? byCategory.wellness!), ...brief.benefits]).slice(0, 5);
}

function useCaseBullets(brief: ProductResearchBrief): string[] {
  const signals = productSignals(brief.productType);
  const bullets = [
    brief.category === "wellness" ? "Use it during a short break when you want to slow down and reset your routine." : "",
    brief.category === "beauty" ? "Keep it ready where you normally do your daily care routine." : "",
    brief.category === "home" ? "Keep it within reach for the repeated task it is meant to simplify." : "",
    signals.includes("portable") ? "Fold it or store it after use so it does not take over your desk, drawer, or travel bag." : "",
    signals.includes("vibration") ? "Start with a short session so the vibration sensation feels comfortable for your preference." : "",
    signals.includes("rechargeable") ? "Charge or connect it before use so the routine is ready when you need it." : "",
    "Choose the variant that matches how and where you plan to use it."
  ].filter(Boolean);
  return uniqueStrings(bullets).slice(0, 4);
}

function trustBullets(brief: ProductResearchBrief): string[] {
  const signals = productSignals(brief.productType);
  return uniqueStrings([
    brief.category === "wellness" ? "Good fit for short breaks, travel downtime, or an evening wind-down routine" : "",
    brief.category === "beauty" ? "Useful when shoppers want a cleaner, easier at-home care moment" : "",
    brief.category === "home" ? "Useful when shoppers want a repeated home task to feel easier" : "",
    signals.includes("portable") ? "Compact enough to keep close instead of storing away and forgetting" : "",
    signals.includes("vibration") ? "Active vibration feature gives shoppers a clear reason to choose it over a basic accessory" : "",
    signals.includes("targeted-comfort") ? "Targeted design makes the benefit easier to understand at a glance" : "",
    "Straightforward routine fit keeps the product easy to explain and easy to gift"
  ].filter(Boolean)).slice(0, 5);
}

function scenarioBlocks(brief: ProductResearchBrief): string[] {
  const signals = productSignals(brief.productType);
  const noun = brief.productType.toLowerCase();
  const categoryLead: Record<string, string> = {
    wellness: `After a long screen session, ${noun} gives shoppers a simple way to create a short comfort break without turning it into a complicated routine.`,
    beauty: `Before the day starts or after it slows down, ${noun} fits into a small self-care moment that feels easy to repeat at home.`,
    tech: `On a desk, shelf, nightstand, or travel setup, ${noun} works best when shoppers want one useful function without extra clutter.`,
    home: `During the repeated home task it was made for, ${noun} helps keep the process more organized and easier to start.`,
    pet: `For everyday pet-care moments, ${noun} gives owners a practical tool they can keep nearby instead of improvising each time.`,
    apparel: `On busy mornings or regular outings, ${noun} helps shoppers choose a fit that feels easier to wear and easier to pair.`
  };
  const signalLine = [
    signals.includes("vibration") ? "The vibration feature makes the experience feel active and intentional, especially for short reset sessions." : "",
    signals.includes("portable") ? "Because it is compact or foldable, it can stay close by for work breaks, travel bags, drawers, or bedside storage." : "",
    signals.includes("heat") ? "The warming function adds a cozier feel when shoppers want a slower wind-down moment." : "",
    signals.includes("cooling") ? "The cooling detail helps the routine feel fresher when comfort and refreshment matter most." : "",
    signals.includes("targeted-comfort") ? "The targeted shape makes the use case clear at a glance, so shoppers immediately understand where it fits." : ""
  ].find(Boolean);
  return uniqueStrings([
    categoryLead[brief.category] ?? `In daily use, ${noun} works best when shoppers want a practical product that solves one clear routine problem.`,
    signalLine ?? `The value is in how easily ${noun} fits into a real routine: choose the option, keep it accessible, and use it for the moment it was designed to improve.`,
    `This makes ${brief.selectedTitle} easier to understand because the page connects the situation, the benefit, and the product details shoppers can verify before checkout.`
  ]).slice(0, 3);
}

function salesBlueprint(brief: ProductResearchBrief): {
  heroLead: string;
  heroBullets: string[];
  demoBullets: string[];
  proofBullets: string[];
  scenarios: string[];
  comparisonRows: Record<string, string>;
  finalCta: string;
} {
  const noun = brief.productType.toLowerCase();
  const moment = shopperMoment(brief.category);
  const referenceStyle = brief.referenceBlueprint.mediaDensity === "image-rich" ? "Pair each major benefit with a useful visual check." : "Keep each section direct and easy to scan.";
  const visibleSpecs = Object.entries(brief.specs)
    .filter(([key]) => key !== "Product type")
    .map(([key, value]) => `${key}: ${value}`)
    .slice(0, 3);
  const value = valueBullets(brief);
  const useCases = useCaseBullets(brief);
  const trust = trustBullets(brief);
  return {
    heroLead: `${brief.brandName} brings ${brief.productType} into ${moment} with a more useful, repeatable way to handle the moment shoppers are already trying to improve.`,
    heroBullets: value.slice(0, 4),
    demoBullets: useCases,
    proofBullets: uniqueStrings([...trust, ...visibleSpecs, `${referenceStyle} Each section answers when to use it, what to expect, and what to confirm before checkout.`]).slice(0, 5),
    scenarios: scenarioBlocks(brief),
    comparisonRows: {
      "Basic option": "Looks similar at first glance, but may not explain when, why, or how shoppers should use it.",
      [brief.selectedTitle]: `Connects the product type to practical use cases, comfort points, and buying questions.`,
      "Best for": brief.targetBuyer
    },
    finalCta: `Choose the option that matches your routine and bring ${noun} into the moments where a simpler, more comfortable setup can make the biggest difference.`
  };
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
    : ["User guide or setup details when provided by the merchant"];
  return {
    ...profile,
    productType,
    brandName,
    selectedTitle,
    category,
    subtitle: `${productType} combines practical design with reliable everyday use.`,
    intro: sourceSentence(input.source.sourceDescriptionText, `${productType} is made for shoppers who want one practical upgrade they can place into a real routine without extra setup friction.`),
    demoBody: `${productType} should be shown in the moment it is used, then supported with close-up visuals for controls, fit, parts, or included items when those details are available.`,
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
    media,
    referenceBlueprint: buildReferenceBlueprint(input.referencePages)
  };
}

function fallbackStrategy(brief: ProductResearchBrief): PageStrategy {
  return {
    angle: `${brief.productType} as a practical ${brief.category} product with clear daily-use benefits and ${brief.referenceBlueprint.mediaDensity} sales-page pacing`,
    tone: `clear, specific, conversion-focused, compliant, ${brief.referenceBlueprint.headingStyle}`,
    sectionGuidance: {
      "product-hero": "Open with what the product is and why shoppers should care.",
      "trust-strip": "Show included items or quick confidence details without fake proof.",
      "problem-outcome": "Name the practical frustration and the realistic outcome.",
      "product-demo": "Explain what shoppers can inspect in the images.",
      "three-core-benefits": "Turn verified features into buyer-relevant benefits.",
      "how-it-works": hasReferenceSection(brief, "how-it-works") ? "Use a reference-inspired step flow, but write original product-specific steps." : "Use three simple steps based on instructions or visible use.",
      "why-choose": hasReferenceSection(brief, "comparison") ? "Include a simple comparison-style reason-to-choose section without copying the reference." : "Explain why the product is easy to compare and choose.",
      specifications: "List verified product details only.",
      "package-contents": "Show included items only.",
      "guarantee-faq": hasReferenceSection(brief, "faq") ? "Use a reference-inspired objection-answer flow, with factual answers only." : "Answer pre-purchase objections without inventing policies.",
      "final-cta-reviews": "Close with a conservative CTA."
    },
  };
}

function aiProductBrief(brief: ProductResearchBrief): unknown {
  return {
    productType: brief.productType,
    category: brief.category,
    targetBuyer: brief.targetBuyer,
    intro: brief.intro,
    problem: { heading: brief.problemHeading, body: brief.problemBody },
    outcome: { heading: brief.outcomeHeading, body: brief.outcomeBody },
    benefits: brief.benefits,
    useSteps: brief.useSteps,
    whyChoose: brief.whyChoose,
    specs: brief.specs,
    packageItems: brief.packageItems,
    mediaCount: brief.media.length,
    referenceBlueprint: brief.referenceBlueprint
  };
}

export class MockAiProvider implements AiProvider {
  async generateListing(input: GenerateInput): Promise<GeneratedListing> {
    const brief = buildResearchBrief(input);
    const copy = salesBlueprint(brief);
    const imageBlock = (index: number, role: string): ListingBlock | null => brief.media[index] ? { type: "image", url: brief.media[index].url, alt: `${brief.productType} ${role} image`, role } : null;
    const blocks = (...items: Array<ListingBlock | null>): ListingBlock[] => items.filter((item): item is ListingBlock => item !== null);
    return GeneratedListingSchema.parse({
      category: brief.category,
      subcategory: null,
      riskLevel: "LOW",
      targetBuyer: brief.targetBuyer,
      valueProposition: copy.heroLead,
      titleCandidates: [
        { title: brief.selectedTitle, pattern: "[Brand/Product Name] - [Product type or main benefit]", mainKeyword: brief.productType, riskNotes: [] },
        { title: `${brief.brandName} ${brief.productType} for Everyday Use`, pattern: "Brand + product type + use case", mainKeyword: brief.productType, riskNotes: [] },
        { title: `${brief.productType} for Everyday Use`, pattern: "Plain SEO descriptive title", mainKeyword: brief.productType, riskNotes: [] },
        { title: `${brief.brandName} Essential ${brief.productType}`, pattern: "Brandable short title", mainKeyword: brief.productType, riskNotes: [] },
        { title: `${brief.productType} with Clear Product Details`, pattern: "Trust-first title without unsupported claims", mainKeyword: brief.productType, riskNotes: [] }
      ],
      selectedTitle: brief.selectedTitle,
      subtitle: `${brief.productType} with practical benefits, real-use guidance, and reviewable product details.`,
      heroBenefits: copy.heroBullets.slice(0, 4),
      sections: [
        { key: "product-hero", type: "hero", heading: `${brief.brandName} Makes ${titleCase(shopperMoment(brief.category))} Easier`, blocks: blocks(imageBlock(0, "hero"), copy.heroLead, { type: "list", items: copy.heroBullets }), mediaAssetIds: brief.media[0] ? ["media-1"] : [], factIds: brief.factIds },
        { key: "trust-strip", type: "package", heading: "Built For The Moments You Actually Use It", blocks: blocks({ type: "list", items: copy.proofBullets }), factIds: brief.factIds },
        { key: "problem-outcome", type: "problem", heading: brief.problemHeading, blocks: blocks(brief.problemBody, `${brief.productType} is positioned around a simple outcome: make the routine feel easier to start, easier to repeat, and more comfortable to keep using.`, imageBlock(1, "detail")), mediaAssetIds: brief.media[1] ? ["media-2"] : [], factIds: brief.factIds },
        { key: "product-demo", type: "demo", heading: "How It Helps In Real Use", blocks: blocks(brief.outcomeBody, imageBlock(2, "demo"), { type: "list", items: copy.demoBullets }), mediaAssetIds: brief.media[2] ? ["media-3"] : [], factIds: brief.factIds },
        { key: "three-core-benefits", type: "benefits", heading: `Why ${brief.productType} Feels Easy To Choose`, blocks: blocks({ type: "list", items: copy.heroBullets.slice(0, 4) }, imageBlock(3, "benefit")), mediaAssetIds: brief.media[3] ? ["media-4"] : [], factIds: brief.factIds },
        { key: "how-it-works", type: "how-it-works", heading: hasReferenceSection(brief, "how-it-works") ? "A Simple Way To Use It" : "How It Fits Into Daily Use", blocks: blocks(`Use it in short, repeatable moments so ${brief.productType.toLowerCase()} feels easy to keep in ${shopperMoment(brief.category)}.`, { type: "list", items: brief.useSteps.slice(0, 3) }, imageBlock(4, "usage")), mediaAssetIds: brief.media[4] ? ["media-5"] : [], factIds: brief.factIds },
        { key: "why-choose", type: "comparison", heading: hasReferenceSection(brief, "comparison") ? `${brief.selectedTitle} vs. A Basic Option` : `Why Choose ${brief.selectedTitle}?`, blocks: blocks({ type: "table", rows: copy.comparisonRows }, { type: "list", items: brief.whyChoose.slice(0, 4) }), factIds: brief.factIds },
        { key: "customer-proof", type: "trust", heading: "Real-World Ways To Use It", blocks: blocks(...copy.scenarios, { type: "list", items: copy.proofBullets.slice(0, 4) }), factIds: brief.factIds },
        { key: "specifications", type: "specifications", heading: "Product details", blocks: blocks({ type: "table", rows: brief.specs }, imageBlock(5, "specification")), mediaAssetIds: brief.media[5] ? ["media-6"] : [], factIds: brief.factIds },
        { key: "package-contents", type: "package", heading: "Package Includes", blocks: blocks(`Your selected option includes the core items needed to start using ${brief.productType.toLowerCase()} as part of the intended routine.`, { type: "list", items: brief.packageItems }), factIds: brief.factIds },
        { key: "guarantee-faq", type: "faq", heading: "Questions To Review Before Checkout", blocks: blocks(`Before checkout, confirm the variant, included items, and care or setup details match where you plan to use ${brief.productType.toLowerCase()}.`), factIds: brief.factIds },
        { key: "final-cta-reviews", type: "cta", heading: `Ready To Make ${shopperMoment(brief.category)} Simpler?`, blocks: blocks(imageBlock(6, "final"), copy.finalCta), mediaAssetIds: brief.media[6] ? ["media-7"] : [], factIds: brief.factIds }
      ],
      faq: brief.faq.map((item) => ({ ...item, factIds: brief.factIds })),
      seo: {
        metaTitle: brief.selectedTitle.slice(0, 60),
        metaDescription: `${brief.productType} page with practical benefits, real-use scenarios, product details, and factual FAQ answers.`.slice(0, 155),
        handle: slugify(brief.selectedTitle),
        imageAltTexts: input.source.media.map((media, index) => ({ assetId: `media-${index + 1}`, alt: `${brief.productType} product image ${index + 1}` }))
      },
      productJsonLdDraft: {
        "@context": "https://schema.org",
        "@type": "Product",
        name: brief.selectedTitle,
        description: `${brief.productType} page with practical benefits and real-use scenarios.`
      },
      compliance: {
        warnings: [
          "Confirm media usage rights before export.",
          "Pricing is an estimate, not a profit guarantee.",
          ...(input.referencePages?.length ? ["Reference pages were used for layout/style signals only; no reference reviews, ratings, claims, text, or media should be copied."] : [])
        ],
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
    const brief = buildResearchBrief(input);
    const base = await new MockAiProvider().generateListing(input);
    const warnings: string[] = [];
    let strategy = fallbackStrategy(brief);
    const rules = [
      "Return only JSON.",
      "Write storefront product-page copy for shoppers, not internal notes for merchants.",
      "Use only supplied facts. Do not invent reviews, ratings, guarantees, certifications, shipping times, urgency, or unsupported claims.",
      "Do not use these internal terms anywhere in storefront fields: detected, supplier, item cost, shipping cost, [object Object], verified reviews only after import.",
      "Never mention product price, shipping price, wholesale cost, landed cost, suggested price range, import status, source extraction, media rights, publishing, or AI.",
      "Reference pages are style/layout inspiration only. Do not copy their text, reviews, ratings, claims, brand names, or media.",
      "Use natural sales-page headings instead of module names.",
      "For customer-proof sections, write real-world usage scenarios, not testimonials or review-style copy."
    ].join(" ");

    const strategyPatch = await this.completeJson({
      PRODUCT_RESEARCH_BRIEF: aiProductBrief(brief),
      BRAND_PROFILE: input.brandProfile ?? {},
      RULES: rules,
      TASK: "Create a conversion-focused but compliant page strategy. Do not write final copy yet.",
      JSON_SHAPE: {
        angle: "one concise sales angle",
        tone: "tone description",
        sectionGuidance: { "product-hero": "guidance", "problem-outcome": "guidance", "three-core-benefits": "guidance" }
      }
    }, 700).then((value) => applyStrategyPatch(base, value)).catch(() => {
      warnings.push("AI page strategy timed out or failed.");
      return null;
    });
    if (strategyPatch) strategy = strategyPatch;

    const common = {
      PRODUCT_RESEARCH_BRIEF: aiProductBrief(brief),
      PAGE_STRATEGY: strategy,
      BRAND_PROFILE: input.brandProfile ?? {},
      RULES: rules
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
        TASK: "Rewrite only these description modules as a conversion-focused but compliant product page. Follow PAGE_STRATEGY and the supplied module blueprint. Keep claims conservative, visual, specific, and fact-backed. If customer-proof is included, make it real-world scenario copy rather than reviews.",
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

    const quality = listingQuality(base);
    if (quality.score < 85 && quality.weakSectionKeys.length) {
      const rewrite = await this.completeJson({
        ...common,
        TASK: "Rewrite only the weak sections. Add concrete shopper-facing copy and useful bullets. Keep existing images/tables in place.",
        WEAK_SECTION_KEYS: quality.weakSectionKeys,
        JSON_SHAPE: { sections: [{ key: quality.weakSectionKeys[0], heading: "natural shopper-facing heading", blocks: ["2 to 3 concise strings or list blocks"] }] }
      }, 900).catch(() => null);
      if (rewrite) applySectionsPatch(base, rewrite);
      else warnings.push("AI weak-section rewrite timed out or failed.");
    }

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

function applyStrategyPatch(listing: GeneratedListing, value: unknown): PageStrategy | null {
  if (!isRecord(value)) return null;
  const strategy: PageStrategy = {
    angle: typeof value.angle === "string" ? value.angle.slice(0, 220) : "",
    tone: typeof value.tone === "string" ? value.tone.slice(0, 120) : "",
    sectionGuidance: {}
  };
  if (isRecord(value.sectionGuidance)) {
    strategy.sectionGuidance = Object.fromEntries(
      Object.entries(value.sectionGuidance).flatMap(([key, item]) => typeof item === "string" ? [[key, item.slice(0, 220)]] : [])
    );
  }
  if (strategy.angle) listing.valueProposition = strategy.angle;
  return strategy.angle || Object.keys(strategy.sectionGuidance).length ? strategy : null;
}

function applySectionsPatch(listing: GeneratedListing, value: unknown): void {
  if (!isRecord(value) || !Array.isArray(value.sections)) return;
  for (const patch of value.sections) {
    if (!isRecord(patch) || typeof patch.key !== "string" || !Array.isArray(patch.blocks)) continue;
    const section = listing.sections.find((item) => item.key === patch.key);
    if (!section) continue;
    if (typeof patch.heading === "string" && !hasInternalNoise(patch.heading)) section.heading = patch.heading.slice(0, 110);
    const fixedBlocks = section.blocks.filter((block) => isRecord(block) && (block.type === "image" || block.type === "table"));
    const patchedBlocks = patch.blocks.map(cleanBlock).filter(isListingBlock);
    if (patchedBlocks.length) section.blocks = [...fixedBlocks, ...patchedBlocks].slice(0, 4);
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
  if (typeof block === "string") {
    const text = block.replace(/\s+/g, " ").trim();
    return hasInternalNoise(text) || hasHollowCopy(text) || text.length < 24 ? null : text.slice(0, 900);
  }
  if (!isRecord(block)) return null;
  if (block.type === "list" && Array.isArray(block.items)) {
    const items = block.items
      .map((item) => String(item).replace(/\s+/g, " ").trim())
      .filter((item) => item.length >= 16 && !hasInternalNoise(item) && !hasHollowCopy(item))
      .slice(0, 6);
    const parsed = ListingBlockSchema.safeParse({ type: "list", items });
    return parsed.success ? parsed.data : null;
  }
  if (block.type === "table" && isRecord(block.rows)) {
    const rows = Object.fromEntries(Object.entries(block.rows).flatMap(([key, value]) => {
      if (!["string", "number", "boolean"].includes(typeof value) || hasInternalNoise(key) || hasHollowCopy(key)) return [];
      return [[key, value]];
    }));
    const parsed = ListingBlockSchema.safeParse({ type: "table", rows });
    return parsed.success ? parsed.data : null;
  }
  return typeof block.text === "string" && !hasInternalNoise(block.text) && !hasHollowCopy(block.text) ? block.text.slice(0, 900) : null;
}

function isListingBlock(block: unknown): block is ListingBlock {
  return ListingBlockSchema.safeParse(block).success;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function hasInternalNoise(value: string): boolean {
  return /\b(?:detected|supplier|item cost|shipping cost)\b|\b(?:price|shipping)\s*:|\$\d|\[object Object\]|verified reviews only after import/i.test(value);
}

function hasHollowCopy(value: string): boolean {
  return /\b(?:visible product details|product images to inspect|easy to inspect|clear product details|useful visuals|explained in clear|shopper-friendly language|matches your intended use|practical product designed for everyday use in its category|buying questions easy to scan)\b/i.test(value);
}

function listingQuality(listing: GeneratedListing): { score: number; weakSectionKeys: string[] } {
  const imageCount = listing.sections.flatMap((section) => section.blocks).filter((block) => isRecord(block) && block.type === "image").length;
  const bulletCount = listing.sections.flatMap((section) => section.blocks).reduce<number>((total, block) => (
    total + (isRecord(block) && block.type === "list" && Array.isArray(block.items) ? block.items.length : 0)
  ), 0);
  const allCopy = JSON.stringify(listing.sections);
  const weakSectionKeys = listing.sections
    .filter((section) => {
      if (["specifications", "package-contents", "guarantee-faq"].includes(section.key)) return false;
      const copy = section.blocks.flatMap((block) => {
        if (typeof block === "string") return [block];
        if (isRecord(block) && block.type === "list" && Array.isArray(block.items)) return block.items.map(String);
        if (isRecord(block) && block.type === "table" && isRecord(block.rows)) return Object.values(block.rows).map(String);
        return [];
      });
      const normalized = copy.map((item) => item.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()).filter(Boolean);
      return section.blocks.filter(Boolean).length < 2 || copy.some(hasHollowCopy) || new Set(normalized).size < normalized.length;
    })
    .map((section) => section.key)
    .slice(0, 4);
  const checks = [
    imageCount >= 4,
    bulletCount >= 8,
    listing.sections.length >= 10,
    (listing.faq?.length ?? 0) >= 3,
    weakSectionKeys.length === 0,
    !hasInternalNoise(allCopy),
    !hasHollowCopy(allCopy)
  ];
  return { score: Math.round((checks.filter(Boolean).length / checks.length) * 100), weakSectionKeys };
}

function summarizeSchemaIssues(issues: Array<{ path: PropertyKey[]; message: string }>): string {
  return issues.slice(0, 3).map((issue) => `${issue.path.map(String).join(".") || "root"} ${issue.message}`).join("; ");
}
