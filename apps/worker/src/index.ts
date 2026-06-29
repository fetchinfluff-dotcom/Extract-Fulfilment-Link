import { Worker } from "bullmq";
import { createAdapters, findAdapter } from "@listingforge/adapters";
import { createAiProvider } from "@listingforge/ai";
import { loadEnv } from "@listingforge/config";
import { renderListingHtml } from "@listingforge/html";
import { calculatePricing } from "@listingforge/pricing";
import { optionsFromEnv, validateSourceUrl } from "@listingforge/security";

const env = loadEnv(process.env);
const connection = { url: env.REDIS_URL };

type ExtractJob = {
  sourceUrl: string;
  targetCountry: string;
};

new Worker<ExtractJob>(
  "source.extract",
  async (job) => {
    await job.updateProgress({ stage: "validating", message: "Validating source URL" });
    const validation = await validateSourceUrl(job.data.sourceUrl, optionsFromEnv(env));
    const adapter = findAdapter(createAdapters(env), validation.url);
    const canonicalUrl = await adapter.canonicalize(validation.url);
    await job.updateProgress({ stage: "extracting", message: "Extracting product fixture" });
    const source = await adapter.extract({ url: canonicalUrl, targetCountry: job.data.targetCountry });
    const firstVariant = source.variants[0];
    if (!firstVariant) throw new Error("No variants were extracted.");
    await job.updateProgress({ stage: "generating", message: "Generating structured listing" });
    const pricing = calculatePricing({ itemCost: firstVariant.itemCost, shippingCost: source.shippingQuotes[0]?.cost ?? 0 });
    const listing = await createAiProvider(env).generateListing({ source, pricing });
    return { source, pricing, listing, html: renderListingHtml(listing) };
  },
  { connection, concurrency: Number(process.env.JOB_CONCURRENCY_EXTRACT ?? 2) }
);

console.log("ListingForge worker listening on source.extract");
