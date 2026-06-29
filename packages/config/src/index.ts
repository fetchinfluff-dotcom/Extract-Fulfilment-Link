import { z } from "zod";

const boolString = z
  .string()
  .optional()
  .transform((value) => value === "true");

const intString = (fallback: number) =>
  z
    .string()
    .optional()
    .transform((value) => (value ? Number.parseInt(value, 10) : fallback))
    .pipe(z.number().int().positive());

export const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  NEXT_PUBLIC_APP_NAME: z.string().default("ListingForge"),
  NEXT_PUBLIC_APP_URL: z.url().default("http://localhost:3000"),
  APP_ENCRYPTION_KEY: z.string().min(32).optional(),
  DATABASE_URL: z.string().optional(),
  REDIS_URL: z.url().default("redis://localhost:6379"),
  AI_PROVIDER: z.enum(["mock", "openai-compatible"]).default("mock"),
  AI_BASE_URL: z.string().optional(),
  AI_API_KEY: z.string().optional(),
  AI_MODEL_FAST: z.string().optional(),
  AI_MODEL_QUALITY: z.string().optional(),
  AI_MOCK_MODE: boolString.default(true),
  CJ_API_BASE_URL: z.url().default("https://developers.cjdropshipping.com"),
  CJ_ACCESS_TOKEN: z.string().optional(),
  CJ_API_KEY: z.string().optional(),
  ALLOWED_SOURCE_DOMAINS: z
    .string()
    .default("mock.listingforge.local,aliexpress.com,www.aliexpress.com,cjdropshipping.com,www.cjdropshipping.com,qksource.com,www.qksource.com")
    .transform((value) => value.split(",").map((item) => item.trim().toLowerCase()).filter(Boolean)),
  MAX_URL_REDIRECTS: intString(3),
  MAX_FETCH_BYTES: intString(5_242_880),
  FETCH_TIMEOUT_MS: intString(30_000),
  FEATURE_CJ_ADAPTER: boolString.default(true),
  FEATURE_ALIEXPRESS_ADAPTER: boolString.default(true),
  FEATURE_QKSOURCE_ADAPTER: boolString.default(true),
  BILLING_ENABLED: boolString.default(false)
});

export type AppEnv = z.infer<typeof EnvSchema>;

export function loadEnv(input: NodeJS.ProcessEnv = process.env): AppEnv {
  return EnvSchema.parse(input);
}
