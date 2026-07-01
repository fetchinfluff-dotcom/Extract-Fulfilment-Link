import { createHash } from "node:crypto";
import { analyzeReferencePages, createAdapters, findAdapter } from "@listingforge/adapters";
import { createAiProvider } from "@listingforge/ai";
import { loadEnv } from "@listingforge/config";
import { renderListingHtml, sanitizeHtml } from "@listingforge/html";
import { calculatePricing, type PricingResult } from "@listingforge/pricing";
import type { GeneratedListing, ProjectRequest, SourceProduct } from "@listingforge/schemas";
import type { ReferencePageAnalysis } from "@listingforge/adapters";
import { ProjectRequestSchema } from "@listingforge/schemas";
import { optionsFromEnv, scanRestrictedProductText, validateSourceUrl } from "@listingforge/security";
import { MVP_WORKSPACE_ID, serviceRest, type RequestContext } from "./auth";

export type DemoProject = {
  id: string;
  request: ProjectRequest;
  source: SourceProduct;
  pricing: PricingResult;
  referencePages: ReferencePageAnalysis[];
  listing: GeneratedListing;
  html: string;
  createdAt: string;
  workspaceId: string;
  userId: string | null;
};

const projects = new Map<string, DemoProject>();

export async function createDemoProject(body: unknown, context: RequestContext = { userId: null, workspaceId: MVP_WORKSPACE_ID, authenticated: false }): Promise<DemoProject> {
  const request = ProjectRequestSchema.parse(body);
  const env = loadEnv(process.env);
  const validation = await validateSourceUrl(request.sourceUrl, optionsFromEnv(env));
  if (env.NODE_ENV === "production" && validation.url.hostname === "mock.listingforge.local") {
    throw new Error("Fixture URLs are disabled in production.");
  }
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
  const referencePages = await analyzeReferencePages(request.referenceUrls, env).catch((error: unknown) => [{
    url: "reference-analysis",
    title: null,
    metaDescription: null,
    headings: [],
    sections: [],
    imageCount: 0,
    videoCount: 0,
    sectionPatterns: [],
    styleSignals: [],
    warnings: [error instanceof Error ? error.message : "Reference analysis failed."]
  }]);
  const listing = await createAiProvider(env).generateListing({ source, pricing, referencePages });
  const html = renderListingHtml(listing);
  const project: DemoProject = {
    id: crypto.randomUUID(),
    request,
    source,
    pricing,
    referencePages,
    listing,
    html,
    createdAt: new Date().toISOString(),
    workspaceId: context.workspaceId,
    userId: context.userId
  };
  projects.set(project.id, project);
  await saveProject(project, env);
  await audit(env, context, "project.create", "project", project.id, { platform: source.platform });
  return project;
}

export async function getDemoProject(id: string, context: RequestContext = { userId: null, workspaceId: MVP_WORKSPACE_ID, authenticated: false }): Promise<DemoProject | undefined> {
  const local = projects.get(id);
  if (local && local.workspaceId === context.workspaceId) return local;
  return await loadProject(id, context.workspaceId, loadEnv(process.env));
}

export async function updateDemoHtml(id: string, html: string, context: RequestContext = { userId: null, workspaceId: MVP_WORKSPACE_ID, authenticated: false }): Promise<DemoProject | undefined> {
  const project = await getDemoProject(id, context);
  if (!project) return undefined;
  const updated = { ...project, html: sanitizeHtml(html) };
  projects.set(id, updated);
  await updateProjectHtml(updated, loadEnv(process.env));
  await audit(loadEnv(process.env), context, "project.update_html", "project", id, {});
  return updated;
}

export async function listDemoProjects(context: RequestContext = { userId: null, workspaceId: MVP_WORKSPACE_ID, authenticated: false }): Promise<Array<Pick<DemoProject, "id" | "createdAt" | "source" | "listing" | "workspaceId">>> {
  const env = loadEnv(process.env);
  if (!supabase(env)) {
    return [...projects.values()]
      .filter((project) => project.workspaceId === context.workspaceId)
      .map(({ id, createdAt, source, listing, workspaceId }) => ({ id, createdAt, source, listing, workspaceId }));
  }
  const rows = await rest<Array<Record<string, unknown>>>(env, `projects?workspace_id=eq.${context.workspaceId}&deleted_at=is.null&order=created_at.desc&limit=25`);
  return rows.map((row) => ({
    id: String(row.id),
    createdAt: String(row.created_at),
    source: {
      platform: sourcePlatform(String(row.source_platform ?? "manual")),
      canonicalUrl: String(row.canonical_source_url ?? row.source_url),
      sourceTitle: String(row.name),
      currency: String(row.currency ?? "USD"),
      variants: [],
      shippingQuotes: [],
      media: [],
      attributes: {},
      facts: [],
      warnings: [],
      confidence: 0
    },
    listing: {
      selectedTitle: String(row.name),
      category: "general",
      subcategory: null,
      riskLevel: "LOW",
      titleCandidates: [],
      subtitle: "",
      heroBenefits: [],
      sections: [],
      seo: { metaTitle: String(row.name), metaDescription: "", handle: "", imageAltTexts: [] },
      compliance: { warnings: [], unsupportedClaims: [], humanReviewRequired: false },
      factReferences: []
    },
    workspaceId: context.workspaceId
  }));
}

function sourcePlatform(value: string): SourceProduct["platform"] {
  return value === "aliexpress" || value === "cjdropshipping" || value === "qksource" ? value : "manual";
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
  return JSON.stringify({ source: project.source, pricing: project.pricing, referencePages: project.referencePages, listing: project.listing, html: project.html }, null, 2);
}

function supabase(env: ReturnType<typeof loadEnv>): { url: string; key: string } | null {
  const url = env.SUPABASE_URL ?? env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SECRET_KEY ?? env.SUPABASE_SERVICE_ROLE_KEY;
  if (env.NODE_ENV !== "production") return null;
  if (!url || !key) throw new Error("Supabase persistence is not configured.");
  return { url: url.replace(/\/$/, ""), key };
}

async function rest<T>(env: ReturnType<typeof loadEnv>, path: string, init: RequestInit = {}): Promise<T> {
  const db = supabase(env);
  if (!db) throw new Error("Supabase persistence is not enabled outside production.");
  return serviceRest<T>(env, path, init);
}

async function saveProject(project: DemoProject, env: ReturnType<typeof loadEnv>): Promise<void> {
  if (!supabase(env)) return;
  await rest(env, "projects", {
    method: "POST",
    headers: { prefer: "return=minimal" },
    body: JSON.stringify({
      id: project.id,
      workspace_id: project.workspaceId,
      name: project.listing.selectedTitle,
      source_url: project.request.sourceUrl,
      canonical_source_url: project.source.canonicalUrl,
      source_platform: project.source.platform,
      target_country: project.request.targetCountry,
      target_language: project.request.targetLanguage,
      currency: project.request.currency,
      status: "ready"
    })
  });
  await rest(env, "source_snapshots", {
    method: "POST",
    headers: { prefer: "return=minimal" },
    body: JSON.stringify({
      project_id: project.id,
      adapter_version: "listingforge-adapters@0.1",
      method: project.source.platform === "aliexpress" ? "http+mtop" : "http",
      content_hash: createHash("sha256").update(JSON.stringify(project.source)).digest("hex"),
      redacted_payload: { request: project.request, source: project.source, pricing: project.pricing, referencePages: project.referencePages },
      warnings: project.source.warnings,
      confidence_score: project.source.confidence
    })
  });
  const [version] = await rest<Array<{ id: string }>>(env, "generated_versions", {
    method: "POST",
    headers: { prefer: "return=representation" },
    body: JSON.stringify({
      project_id: project.id,
      version_number: 1,
      structured_content_json: project.listing,
      sanitized_html: project.html,
      seo_json: project.listing.seo,
      compliance_report_json: project.listing.compliance,
      manually_edited: false,
      created_by_user_id: project.userId
    })
  });
  await rest(env, `projects?id=eq.${project.id}`, {
    method: "PATCH",
    headers: { prefer: "return=minimal" },
    body: JSON.stringify({ active_version_id: version?.id, updated_at: new Date().toISOString() })
  });
}

async function loadProject(id: string, workspaceId: string, env: ReturnType<typeof loadEnv>): Promise<DemoProject | undefined> {
  if (!supabase(env)) return undefined;
  const [project] = await rest<Array<Record<string, unknown>>>(env, `projects?id=eq.${id}&workspace_id=eq.${workspaceId}&limit=1`);
  if (!project) return undefined;
  const [snapshot] = await rest<Array<{ redacted_payload: { request: ProjectRequest; source: SourceProduct; pricing: PricingResult; referencePages?: ReferencePageAnalysis[] } }>>(env, `source_snapshots?project_id=eq.${id}&order=extracted_at.desc&limit=1`);
  const versionId = typeof project.active_version_id === "string" ? project.active_version_id : "";
  const versionQuery = versionId ? `id=eq.${versionId}` : `project_id=eq.${id}&order=created_at.desc&limit=1`;
  const [version] = await rest<Array<{ structured_content_json: GeneratedListing; sanitized_html: string }>>(env, `generated_versions?${versionQuery}`);
  if (!snapshot || !version) return undefined;
  const loaded = {
    id,
    request: snapshot.redacted_payload.request,
    source: snapshot.redacted_payload.source,
    pricing: snapshot.redacted_payload.pricing,
    referencePages: snapshot.redacted_payload.referencePages ?? [],
    listing: version.structured_content_json,
    html: version.sanitized_html,
    createdAt: String(project.created_at ?? new Date().toISOString()),
    workspaceId,
    userId: null
  };
  projects.set(id, loaded);
  return loaded;
}

async function updateProjectHtml(project: DemoProject, env: ReturnType<typeof loadEnv>): Promise<void> {
  if (!supabase(env)) return;
  const [row] = await rest<Array<{ active_version_id: string | null }>>(env, `projects?id=eq.${project.id}&workspace_id=eq.${project.workspaceId}&select=active_version_id&limit=1`);
  if (!row?.active_version_id) return;
  await rest(env, `generated_versions?id=eq.${row.active_version_id}`, {
    method: "PATCH",
    headers: { prefer: "return=minimal" },
    body: JSON.stringify({ sanitized_html: project.html, manually_edited: true })
  });
}

export async function auditExport(project: DemoProject, format: "html" | "json" | "csv", context: RequestContext): Promise<void> {
  await audit(loadEnv(process.env), context, "project.export", "project", project.id, { format });
}

async function audit(env: ReturnType<typeof loadEnv>, context: RequestContext, action: string, resourceType: string, resourceId: string, metadata: Record<string, unknown>): Promise<void> {
  if (!supabase(env)) return;
  await rest(env, "audit_logs", {
    method: "POST",
    headers: { prefer: "return=minimal" },
    body: JSON.stringify({
      workspace_id: context.workspaceId,
      actor_user_id: context.userId,
      action,
      resource_type: resourceType,
      resource_id: resourceId,
      metadata_json: metadata
    })
  }).catch(() => undefined);
}
