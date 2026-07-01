import { z } from "zod";

export const SourcePlatformSchema = z.enum(["aliexpress", "cjdropshipping", "qksource", "manual"]);
export type SourcePlatform = z.infer<typeof SourcePlatformSchema>;

export const FactSchema = z.object({
  factId: z.string().min(1),
  field: z.string().min(1),
  value: z.unknown(),
  source: z.string().min(1),
  sourcePath: z.string().nullable().optional(),
  confidence: z.number().min(0).max(1)
});
export type Fact = z.infer<typeof FactSchema>;

export const SourceProductSchema = z.object({
  platform: SourcePlatformSchema,
  canonicalUrl: z.url(),
  sourceProductId: z.string().nullable().optional(),
  sourceTitle: z.string().min(1),
  sourceDescriptionText: z.string().nullable().optional(),
  currency: z.string().length(3),
  variants: z.array(
    z.object({
      id: z.string().min(1),
      sku: z.string().nullable().optional(),
      title: z.string(),
      options: z.record(z.string(), z.unknown()),
      itemCost: z.number().min(0),
      inventoryStatus: z.string().nullable().optional(),
      imageUrl: z.url().nullable().optional()
    })
  ),
  shippingQuotes: z.array(
    z.object({
      variantId: z.string().nullable().optional(),
      destinationCountry: z.string().min(2),
      methodName: z.string().min(1),
      cost: z.number().min(0),
      currency: z.string().length(3),
      estimatedMinDays: z.number().int().min(0).nullable().optional(),
      estimatedMaxDays: z.number().int().min(0).nullable().optional(),
      tracked: z.boolean().nullable().optional(),
      quotedAt: z.iso.datetime()
    })
  ),
  media: z.array(
    z.object({
      url: z.url(),
      type: z.enum(["image", "video"]),
      sourceType: z.enum(["supplier", "user", "generated", "licensed"]),
      variantId: z.string().nullable().optional(),
      width: z.number().int().positive().nullable().optional(),
      height: z.number().int().positive().nullable().optional(),
      licenseStatus: z.enum(["supplier-authorized", "user-owned", "licensed-stock", "generated", "unknown", "rejected"])
    })
  ),
  attributes: z.record(z.string(), z.unknown()),
  packageContents: z.array(z.string()).optional(),
  instructions: z.array(z.string()).optional(),
  facts: z.array(FactSchema),
  warnings: z.array(z.string()),
  confidence: z.number().min(0).max(1)
});
export type SourceProduct = z.infer<typeof SourceProductSchema>;

export const GeneratedListingSchema = z.object({
  category: z.string(),
  subcategory: z.string().nullable().optional(),
  riskLevel: z.enum(["LOW", "MEDIUM", "HIGH", "RESTRICTED"]),
  targetBuyer: z.string().optional(),
  valueProposition: z.string().optional(),
  titleCandidates: z.array(
    z.object({
      title: z.string(),
      pattern: z.string(),
      mainKeyword: z.string().nullable().optional(),
      riskNotes: z.array(z.string())
    })
  ).min(5),
  selectedTitle: z.string(),
  subtitle: z.string(),
  heroBenefits: z.array(z.string()).min(3).max(5),
  sections: z.array(
    z.object({
      key: z.string(),
      type: z.string(),
      heading: z.string(),
      blocks: z.array(z.unknown()),
      mediaAssetIds: z.array(z.string()).optional(),
      factIds: z.array(z.string()),
      placeholder: z.boolean().optional()
    })
  ),
  faq: z.array(
    z.object({
      question: z.string(),
      answer: z.string(),
      factIds: z.array(z.string())
    })
  ).optional(),
  seo: z.object({
    metaTitle: z.string(),
    metaDescription: z.string(),
    handle: z.string(),
    imageAltTexts: z.array(z.object({ assetId: z.string(), alt: z.string() }))
  }),
  productJsonLdDraft: z.record(z.string(), z.unknown()).nullable().optional(),
  compliance: z.object({
    warnings: z.array(z.string()),
    unsupportedClaims: z.array(z.string()),
    humanReviewRequired: z.boolean()
  }),
  factReferences: z.array(z.object({ claim: z.string(), factIds: z.array(z.string()) }))
});
export type GeneratedListing = z.infer<typeof GeneratedListingSchema>;

export const ProjectRequestSchema = z.object({
  sourceUrl: z.url(),
  referenceUrls: z.array(z.url()).max(3).default([]),
  targetCountry: z.string().min(2).default("US"),
  targetLanguage: z.string().min(2).default("en"),
  currency: z.string().length(3).default("USD"),
  category: z.string().optional()
});

export type ProjectRequest = z.infer<typeof ProjectRequestSchema>;
