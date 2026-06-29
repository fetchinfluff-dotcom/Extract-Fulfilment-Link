import { createAdapters, findAdapter } from "@listingforge/adapters";
import { createAiProvider } from "@listingforge/ai";
import { loadEnv } from "@listingforge/config";
import { renderListingHtml, sanitizeHtml } from "@listingforge/html";
import { calculatePricing, type PricingResult } from "@listingforge/pricing";
import type { GeneratedListing, ProjectRequest, SourceProduct } from "@listingforge/schemas";
import { ProjectRequestSchema } from "@listingforge/schemas";
import { optionsFromEnv, scanRestrictedProductText, validateSourceUrl } from "@listingforge/security";

export type DemoProject = {
  id: string;
  request: ProjectRequest;
  source: SourceProduct;
  pricing: PricingResult;
  listing: GeneratedListing;
  html: string;
  createdAt: string;
};

const projects = new Map<string, DemoProject>();

export async function createDemoProject(body: unknown): Promise<DemoProject> {
  const request = ProjectRequestSchema.parse(body);
  const env = loadEnv(process.env);
  const validation = await validateSourceUrl(request.sourceUrl, optionsFromEnv(env));
  const adapters = createAdapters(env);
  const adapter = findAdapter(adapters, validation.url);
  const canonicalUrl = await adapter.canonicalize(validation.url);
  const source = await adapter.extract({ url: canonicalUrl, targetCountry: request.targetCountry });
  const restricted = scanRestrictedProductText(`${source.sourceTitle} ${source.sourceDescriptionText ?? ""}`);
  if (restricted.length) throw new Error(restricted.join(" "));
  const variant = source.variants[0];
  if (!variant) throw new Error("Source product has no variants.");
  const shippingCost = source.shippingQuotes[0]?.cost ?? 0;
  const pricing = calculatePricing({ itemCost: variant.itemCost, shippingCost, roundingStyle: "up_99" });
  const listing = await createAiProvider(env).generateListing({ source, pricing });
  const html = renderListingHtml(listing);
  const project: DemoProject = {
    id: crypto.randomUUID(),
    request,
    source,
    pricing,
    listing,
    html,
    createdAt: new Date().toISOString()
  };
  projects.set(project.id, project);
  return project;
}

export function getDemoProject(id: string): DemoProject | undefined {
  return projects.get(id);
}

export function updateDemoHtml(id: string, html: string): DemoProject | undefined {
  const project = projects.get(id);
  if (!project) return undefined;
  const updated = { ...project, html: sanitizeHtml(html) };
  projects.set(id, updated);
  return updated;
}

export function exportProject(project: DemoProject, format: "html" | "json" | "csv"): string {
  if (format === "html") return project.html;
  if (format === "csv") {
    return [
      "field,value",
      `title,"${project.listing.selectedTitle.replaceAll('"', '""')}"`,
      `recommended_price,"${project.pricing.recommendedPrice}"`,
      `source_url,"${project.request.sourceUrl}"`
    ].join("\n");
  }
  return JSON.stringify({ source: project.source, pricing: project.pricing, listing: project.listing, html: project.html }, null, 2);
}
