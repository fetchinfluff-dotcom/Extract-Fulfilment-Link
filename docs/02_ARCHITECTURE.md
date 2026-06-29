# 02 — Technical Architecture

## 1. Architecture decision

Use a TypeScript-first monorepo for MVP.

Why:

- One language across web, background worker, adapters, schemas, pricing, and AI orchestration.
- Easier for Codex to maintain.
- Shared Zod contracts prevent drift.
- Crawlee and Playwright handle both static and JavaScript-rendered pages.
- A separate Python/Scrapy service is unnecessary for one-URL-at-a-time MVP.

Add Scrapy only when batch crawling volume, distributed spider scheduling, or large historical datasets justify a second runtime.

## 2. Recommended stack

### Web application

- Next.js App Router
- React
- TypeScript strict mode
- Tailwind CSS
- shadcn/ui
- Lucide icons
- TanStack Query where client caching is useful
- React Hook Form + Zod
- Tiptap for visual HTML editing

### Data and authentication

- Supabase Auth
- Supabase Postgres
- Supabase Storage
- Row Level Security
- Drizzle ORM for typed server queries and migrations
- SQL migrations for RLS policies

### Background execution

Preferred self-managed MVP:

- Redis
- BullMQ
- Separate worker process

Managed alternative:

- Trigger.dev for durable, long-running tasks and retries

Do not execute scraping or full AI generation inside a request/response serverless function.

### Crawling and extraction

Priority order:

1. Official supplier API adapter.
2. Static HTTP fetch and structured data parser.
3. Platform-specific embedded JSON parser.
4. Crawlee + Playwright browser adapter.
5. Optional Firecrawl fallback.
6. Manual-input fallback.

Optional Browserless can host remote Chromium. Confirm the commercial license/plan before production use.

### AI

- Vercel AI SDK or a small internal provider abstraction.
- OpenAI-compatible base URL support.
- Structured output validated by Zod.
- Separate fast and quality models.
- Prompt versioning.
- Token/cost metering.
- Retry with repair prompt only on schema-validation failure.

### Billing and operations

- Stripe subscriptions and webhooks.
- Resend or equivalent transactional email.
- Sentry for errors.
- PostHog or privacy-conscious product analytics.
- OpenTelemetry-compatible logs and traces.
- Vercel for web UI is optional.
- Worker should run on a persistent container host.

## 3. Repository structure

```text
.
├── apps/
│   ├── web/                    # Next.js UI and API/BFF routes
│   └── worker/                 # BullMQ workers
├── packages/
│   ├── adapters/               # supplier adapter interface and implementations
│   ├── ai/                     # provider, prompts, schemas, evals
│   ├── config/                 # typed environment configuration
│   ├── db/                     # Drizzle schema, migrations, RLS SQL
│   ├── html/                   # deterministic renderers and sanitizer
│   ├── media/                  # download, validation, hashing, storage
│   ├── pricing/                # pricing formulas and tests
│   ├── schemas/                # Zod contracts
│   ├── security/               # URL guard, rate limits, policy checks
│   ├── ui/                     # shared components and design tokens
│   └── utils/
├── docs/
├── prompts/
├── schemas/
├── tests/
│   ├── fixtures/
│   ├── integration/
│   └── e2e/
├── AGENTS.md
├── CODEX_MASTER_PROMPT.md
├── turbo.json
└── pnpm-workspace.yaml
```

## 4. Service boundaries

### Web service responsibilities

- Authentication and session.
- Dashboard and editor UI.
- Project CRUD.
- Input validation.
- Start jobs and read job state.
- Billing webhooks.
- Signed media URLs.
- Export endpoints.
- Never expose supplier tokens, AI API keys, or service-role keys.

### Worker responsibilities

- URL safety validation.
- Source adapter selection.
- API/browser extraction.
- Media metadata checks.
- Data normalization.
- Shipping quote retrieval.
- Pricing.
- AI generation.
- HTML rendering and sanitation.
- Compliance scan.
- Generation usage ledger.
- Retry and dead-letter behavior.

### Database responsibilities

- Source of truth for projects, facts, versions, usage, and audit.
- RLS separates users/workspaces.
- Idempotency keys prevent duplicate jobs and duplicate billing.

## 5. Adapter architecture

```ts
interface SourceAdapter {
  platform: SourcePlatform;
  canHandle(url: URL): boolean;
  canonicalize(url: URL): Promise<URL>;
  extract(input: ExtractInput): Promise<SourceProduct>;
  refreshShipping?(
    product: SourceProduct,
    destination: ShippingDestination
  ): Promise<ShippingQuote[]>;
}
```

Implement:

- `AliExpressAdapter`
- `CJDropShippingAdapter`
- `QKSourceAdapter`
- `GenericManualAdapter`

Each adapter can internally use:

- official API client;
- HTML/JSON-LD parser;
- embedded application state parser;
- browser fallback.

Never couple the canonical product schema to one supplier's field names.

## 6. Extraction pipeline

```text
URL submitted
→ syntactic validation
→ domain allowlist
→ DNS/private-network safety check
→ canonicalization
→ adapter detection
→ extraction method selection
→ source response stored as redacted snapshot
→ parse structured fields
→ media metadata probe
→ normalize variants and prices
→ fetch shipping for selected target
→ facts ledger
→ completeness/confidence scoring
→ ready for generation
```

## 7. AI generation pipeline

```text
Canonical source product
+ user configuration
+ brand profile
+ pricing result
→ category classifier
→ claim-risk classifier
→ content planner
→ structured generation
→ schema validation
→ factual consistency validator
→ deterministic HTML renderer
→ sanitizer
→ SEO/AIEO checks
→ compliance report
→ saved version
```

The model does not receive secrets, cookies, full raw HTML, scripts, or unrelated page content.

## 8. Job model

Queues:

- `source.extract`
- `source.shipping`
- `media.inspect`
- `content.generate`
- `content.regenerate-section`
- `content.export`
- `maintenance.cleanup`

Job requirements:

- idempotency key;
- user/workspace ID;
- project ID;
- correlation ID;
- retry policy;
- timeout;
- progress events;
- cost reservation;
- success/failure finalization;
- dead-letter queue.

Suggested retry behavior:

- network transient: exponential backoff;
- invalid URL/unsupported page: no automatic retry;
- schema-invalid AI output: one repair attempt, then quality-model retry;
- blocked/CAPTCHA: stop and offer official API/manual input;
- insufficient credits: do not enqueue.

## 9. Source integration strategy

### CJdropshipping

Use official API where possible for product, variant, logistics, and shipping data. Token management stays server-side. Implement rate limiting and token refresh.

### AliExpress

Prefer official Open Platform/Dropshipping API credentials when available. If unavailable, use permitted public-page extraction only. Stop on CAPTCHA or access restriction. Do not bypass controls.

### QKSource

Treat as an adapter with capability detection. If no public API is available, parse only publicly accessible product data permitted by its terms. Provide manual correction for missing shipping and variants.

## 10. Firecrawl, Scrapy, Browserless, CodeGraph

| Tool | MVP role | Recommendation |
|---|---|---|
| Crawlee + Playwright | Primary browser extraction | Use |
| Firecrawl | Optional fallback to cleaned/structured extraction | Feature flag; review AGPL/API terms |
| Scrapy | High-volume spidering | Defer |
| scrapy-playwright | Python dynamic-page path | Defer unless Python service is introduced |
| Browserless | Remote Chromium hosting | Optional; verify commercial licensing |
| CodeGraph | Coding-agent codebase context | Optional development tool, never a production dependency |
| Trigger.dev | Durable managed jobs | Alternative to BullMQ |
| BullMQ | Self-managed job queue | Recommended default |

## 11. Deployment profiles

### Local development

- Next.js web.
- Node worker.
- Redis container.
- Supabase local CLI or hosted development project.
- Mock source adapter and recorded fixtures.
- Optional Browserless container.
- AI provider mock mode.

### Production

- Web frontend/API.
- Persistent worker containers with autoscaling.
- Managed Postgres/Supabase.
- Managed Redis.
- Private object storage.
- Separate secrets per environment.
- Web Application Firewall.
- Domain allowlist.
- Monitoring and alerting.

## 12. Scalability path

MVP:

- one extraction per user at a time;
- concurrency limited by plan;
- browser pool capped;
- cache source data by canonical URL and snapshot hash.

Growth:

- per-platform queues;
- worker pools by workload;
- distributed browser service;
- supplier API quota manager;
- media processing workers;
- prompt/model routing by cost;
- organization workspaces;
- regional storage and privacy controls.

## 13. Technology constraints

- No `any` in application code without justification.
- Strict TypeScript.
- No secrets in client bundles.
- No generated HTML stored or rendered unsanitized.
- No arbitrary URL fetch from the browser.
- No direct database access that bypasses RLS for user-facing reads.
- No AI output accepted without schema and policy validation.
