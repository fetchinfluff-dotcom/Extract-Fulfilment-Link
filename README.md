# ListingForge — AI Product Listing & Product Page Generator

> Working title. Rename through `NEXT_PUBLIC_APP_NAME` without changing the architecture.

ListingForge is a commercial SaaS that accepts a fulfillment/source product URL (initially AliExpress, CJdropshipping, and QKSource), extracts verifiable product data and media, calculates a suggested USD selling-price range, and generates an editable SEO/AIEO-friendly product title and HTML product description.

## Core principles

1. **Facts before copy** — AI may rewrite verified product facts but may not invent specifications, certifications, reviews, customer counts, medical outcomes, inventory scarcity, shipping times, or guarantees.
2. **Adapter-first extraction** — each supported source has a dedicated adapter. Generic browser extraction is a fallback, not the default.
3. **Official API first** — use supplier APIs when credentials and permitted endpoints exist.
4. **Human review before export** — generated content is editable and labeled as a draft.
5. **Commercial-safe media** — retain provenance and usage status for every image. Do not create a scraped library of real customer avatars or testimonials.
6. **Secure URL ingestion** — prevent SSRF, prompt injection, XSS, malicious downloads, and unauthorized crawling.
7. **Provider-agnostic AI** — the user can configure any OpenAI-compatible AI endpoint.

## Documents

- `docs/01_PRD.md` — product requirements
- `docs/02_ARCHITECTURE.md` — technical architecture and repository structure
- `docs/03_DATA_MODEL_API.md` — database model and APIs
- `docs/04_AI_CONTENT_ENGINE.md` — AI pipeline, prompts, HTML layout, SEO/AIEO
- `docs/05_UX_UI_SPEC.md` — product UX and interface specification
- `docs/06_SECURITY_COMPLIANCE.md` — security, legal, media, claims, and platform compliance
- `docs/07_IMPLEMENTATION_ROADMAP.md` — implementation order
- `docs/08_TEST_ACCEPTANCE.md` — testing and acceptance criteria
- `CODEX_MASTER_PROMPT.md` — one prompt for Codex
- `AGENTS.md` — permanent repository instructions for coding agents
- `.env.example` — environment variables
- `schemas/*.json` — canonical structured data contracts
- `prompts/product-generator-system.md` — base AI system prompt

## Recommended execution

Create an empty Git repository, place this bundle at the repository root, then run:

```bash
cat CODEX_MASTER_PROMPT.md | codex exec -
```

Use Codex's default workspace-write sandbox and review the resulting changes before deployment. Do not run with unrestricted filesystem access.

## Local setup

```bash
pnpm install
pnpm dev
```

Open `http://localhost:3000/new` and use the fixture URL:

```text
https://mock.listingforge.local/products/collapsible-lamp
```

The local MVP path runs without supplier or AI credentials:

1. strict URL validation;
2. `MockSourceAdapter` fixture extraction;
3. pricing calculation;
4. mock AI structured listing generation;
5. deterministic sanitized HTML rendering;
6. three-pane review/editor;
7. HTML, JSON, and CSV export.

Run verification:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm e2e
```

Start Redis for the worker:

```bash
docker compose -f docker-compose.dev.yml up -d redis
pnpm worker:dev
```

## Integration status

- CJdropshipping, AliExpress, QKSource: safe public-page extraction is present. It parses visible HTML/JSON-LD only and stops on blocked, oversized, non-HTML, or inaccessible pages.
- Supplier API credentials are optional for MVP but still recommended for richer variants, shipping, and reliability.
- AI: mock mode is default. OpenAI-compatible provider is implemented; set `AI_MOCK_MODE=false`, `AI_BASE_URL`, `AI_API_KEY`, and `AI_MODEL_QUALITY`.
- Supabase: schema and RLS migrations are in `packages/db/migrations`; local demo persistence is still in-memory.

## MVP output

For each project, the user can:

1. Paste a supported fulfillment URL.
2. Select target country, language, currency, product category, brand style, and sales angle.
3. Review extracted facts, variants, shipping data, and images.
4. Generate title candidates, a recommended price range, SEO metadata, product-page HTML, FAQ, image alt text, Product JSON-LD, and compliance warnings.
5. Edit the content in a visual editor and raw HTML view.
6. Export HTML, JSON, CSV, or copy individual sections.
7. Save versions and regenerate selected sections without losing manual edits.

## Important scope boundary

MVP generates and exports product content. Direct publishing to Shopify, WooCommerce, ShopBase, or other stores is a later integration phase.
