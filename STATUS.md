# ListingForge Status

## Architecture Decisions

- pnpm workspace + Turborepo monorepo with `apps/web`, `apps/worker`, and shared packages.
- Production MVP path: source URL -> supplier adapter -> pricing -> OpenAI-compatible AI provider with schema fallback -> deterministic sanitized HTML -> Supabase persistence -> editor/export.
- Supplier integrations stay behind `SourceAdapter`; AliExpress now uses public page HTML plus mtop product data for title, media, price, and shipping when available.
- Supabase-compatible schema and RLS migrations live in `packages/db/migrations`.
- Local demo web uses in-memory storage; production project lifecycle is persisted to Supabase `projects`, `source_snapshots`, and `generated_versions`.
- Production is deployed on Vercel from `fetchinfluff-dotcom/Extract-Fulfilment-Link`.

## Phase Checklist

- [x] Phase 0: monorepo foundation, strict TypeScript configs, shared packages, Redis docker compose retained.
- [x] Phase 1: auth UI placeholders, onboarding, dashboard, project creation demo path.
- [x] Phase 2: URL guard, adapter interface, mock adapter fixture, safe public-page supplier adapters.
- [x] Phase 3: pricing engine and media provenance display.
- [x] Phase 4: AI provider abstraction, mock provider, structured validation, HTML renderer/sanitizer.
- [x] Phase 5: three-pane editor, server-side sanitized save, HTML/JSON/CSV export.
- [x] Supabase Auth/session wiring for real users: login/signup/reset server actions set httpOnly Supabase session cookies, and project APIs scope reads/writes by authenticated workspace with local MVP fallback.
- [x] Database-backed project lifecycle for production imports and generated versions.
- [x] Stitch ListingForge SaaS interface frame applied to landing, dashboard, and import flow.
- [x] Project editor/detail page uses the same dashboard shell and sidebar frame.
- [x] Product description fallback and renderer remove internal pricing/object noise from storefront HTML.
- [x] AI prompt and fallback now generate conversion-focused, compliant sales-page descriptions with a storefront HTML quality gate.
- [x] Import flow shows staged progress logs, and description cleanup no longer blocks project creation on internal terms.
- [x] Phase 1 sales-page fallback uses a product research brief, category-aware copy, up to 7 images, and deterministic HTML quality scoring.
- [x] Description quality guard also removes AI-patched product price and shipping-price paragraphs from storefront HTML.
- [x] Phase 2 AI generation now runs page strategy before section writing and can rewrite weak sections without sending pricing raw data to description prompts.
- [x] Phase 3 description base copy now uses richer sales-page blocks for hero, proof points, demo guidance, comparison, FAQ, and final CTA.
- [x] Phase 3+4 reference-page analyzer accepts up to 3 inspiration URLs, extracts safe layout/style signals, and feeds them into AI planning without copying reference text/media/reviews.
- [x] Reference section-map analyzer now detects per-section intent/media density and can influence deterministic layout while preserving no-copy safeguards.
- [x] Description fallback no longer uses hollow image-inspection bullets; base copy now emphasizes use cases, comfort/value outcomes, and compliant trust sections without fake reviews.
- [x] Customer-proof copy now renders real-world scenario blocks instead of fake reviews, ratings, testimonials, or hollow inspection guidance.
- [ ] Full audit log coverage for billing/credits and all mutable project actions.
- [x] Project create, HTML edit, and export actions write `audit_logs` events when Supabase persistence is enabled.
- [x] AliExpress title, media, selected price, and shipping extraction from live product data.
- [ ] Rich supplier extraction for all dynamic variants and fallback suppliers when public pages omit data.
- [ ] Full billing/Stripe implementation.
- [ ] Production monitoring and legal review.

## Current Blockers

- Public supplier extraction can work without credentials when the page exposes HTML/JSON-LD or AliExpress mtop data.
- Supplier API credentials are still useful for richer variants, shipping, rate limits, and fewer blocked pages.
- The provided JWT decodes as `anon`, not `service_role`; production persistence uses the server-only Supabase secret API key. Rotate pasted keys before real customer traffic.
- Production now requires a Supabase Auth session for project API calls; local development still uses the MVP workspace fallback.
- OpenAI-compatible generation is split into small schema patches. Latest Tramai acceptance run completed in about 23s; section patches applied, title/FAQ patches still fell back.
- `pnpm worker:dev` requires Redis on localhost:6379; it starts but cannot process jobs locally until Redis is running.

## Verification Commands

- Passed: `pnpm install`
- Passed: `pnpm lint`
- Passed: `pnpm typecheck`
- Passed: `pnpm test`
- Passed: `pnpm build`
- Passed after public-adapter/AI-provider wiring: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`
- Passed after installing Chromium with `pnpm exec playwright install chromium`: `pnpm e2e`
- Passed after production hardening: `pnpm test` (3 files, 9 tests) and `pnpm build`
- Passed after Supabase persistence repair: `pnpm lint`, `pnpm typecheck`, `pnpm test` (3 files, 10 tests), `pnpm build`, `pnpm e2e`
- Passed after AI prompt hardening: `pnpm test` (3 files, 11 tests), `pnpm typecheck`, `pnpm build`
- Passed after split AI patch generation: `pnpm test` (3 files, 11 tests), `pnpm typecheck`, `pnpm build`
- Passed after Stitch SaaS UI frame: `pnpm test` (3 files, 11 tests), `pnpm typecheck`, `pnpm build`, `pnpm e2e`
- Passed after project editor shell sync: `pnpm test` (3 files, 11 tests), `pnpm typecheck`, `pnpm build`, `pnpm e2e`, `pnpm lint`
- Passed after description noise cleanup: `pnpm test` (3 files, 12 tests), `pnpm typecheck`, `pnpm lint`, `pnpm build`, `pnpm e2e`
- Passed after sales-page generator upgrade: `pnpm test` (3 files, 13 tests), `pnpm typecheck`, `pnpm lint`, `pnpm build`, `pnpm e2e`
- Passed after progress log and non-blocking description cleanup: `pnpm test` (3 files, 13 tests), `pnpm typecheck`, `pnpm lint`, `pnpm build`, `pnpm e2e`
- Passed after Phase 1 sales-page fallback: `pnpm test` (3 files, 14 tests), `pnpm typecheck`, `pnpm lint`, `pnpm build`, `pnpm e2e`
- Passed after price/shipping description guard: `pnpm test` (3 files, 14 tests), `pnpm typecheck`, `pnpm lint`, `pnpm build`, `pnpm e2e`
- Passed after Phase 2 strategy/rewrite pipeline: `pnpm test` (3 files, 14 tests), `pnpm typecheck`, `pnpm lint`, `pnpm build`, `pnpm e2e`
- Passed after Phase 3 sales-page base copy upgrade: `pnpm test` (3 files, 14 tests), `pnpm typecheck`, `pnpm lint`, `pnpm build`, `pnpm e2e`
- Passed after Phase 3+4 reference analyzer wiring: `pnpm test` (3 files, 15 tests), `pnpm typecheck`, `pnpm lint`, `pnpm build`, `pnpm e2e`
- Passed after reference section-map hardening: `pnpm test` (3 files, 18 tests), `pnpm typecheck`, `pnpm lint`, `pnpm build`, `pnpm e2e`
- Passed after sales-copy cleanup: `pnpm test` (3 files, 18 tests), `pnpm typecheck`, `pnpm lint`, `pnpm build`, `pnpm e2e`
- Passed after real-world scenario blocks: `pnpm test` (3 files, 18 tests), `pnpm typecheck`, `pnpm lint`, `pnpm build`, `pnpm e2e`
- Passed after auth/workspace/audit wiring: `pnpm test` (4 files, 20 tests), `pnpm typecheck`, `pnpm lint`, `pnpm build`, `pnpm e2e`
- Supabase migration applied: `audit_logs`
- Production verify: `GET https://extract-fulfilment-link.vercel.app/new` -> 200
- Production verify after auth/workspace wiring: `GET /login` -> 200, `GET /new` -> 200, unauthenticated `POST /api/projects` -> 401 `UNAUTHENTICATED`.
- Production verify: `POST /api/projects` with mock fixture -> 400 `Fixture URLs are disabled in production.`
- Production verify: `POST /api/projects` with `https://www.aliexpress.com/item/1005008224752493.html` -> 201
- Production verify: `POST /api/projects` with `https://www.aliexpress.com/item/1005008809640384.html` -> 201, project `791ab5eb-0217-4bbc-86a9-b6eb1f57a269`
- Production verify: `GET /api/projects/791ab5eb-0217-4bbc-86a9-b6eb1f57a269` -> 200 with 7 supplier images, detected item cost USD 0.99, shipping USD 1.99, suggested range USD 8.99-14.99
- Production verify: `GET /projects/791ab5eb-0217-4bbc-86a9-b6eb1f57a269` -> 200
- Production verify: `GET /api/projects/791ab5eb-0217-4bbc-86a9-b6eb1f57a269/export/json` -> 200
- Production verify after compact AI prompt: `POST /api/projects` with `https://www.aliexpress.com/item/1005008809640384.html` -> 201, project `a4294a80-69d9-4cf4-9c4b-915d762a6102`, extraction/persistence OK, AI fallback due provider timeout.
- Production verify after split AI patch generation: same AliExpress URL -> 201 in about 23s, project `c2f856d8-6c18-44ce-bac3-9460c4fd1760`, section patches applied, title/FAQ patches fell back.
- Production verify after description/UI refinement: project `f4b5153d-cd8e-48f3-8f3b-83670b8c8bcd` has 5 responsive images with alt text, no hardcoded guarantee block, no technical module headings, media buttons, and compliance status log.
- Production verify after Stitch SaaS UI frame: `GET /`, `/dashboard`, and `/new` -> 200; landing and import pages include the new workspace frame content.
- Production verify after project editor shell sync: `GET /dashboard`, `/new`, and existing project detail route -> 200.
- Supabase verify: project `791ab5eb-0217-4bbc-86a9-b6eb1f57a269` persisted with 1 source snapshot, 1 generated version, and active version set.
- Production note: AliExpress `.us` links are allowed; a fake item URL hit the safe redirect limit.
- Optional local app: `pnpm dev`
- Optional worker: `pnpm worker:dev` after starting Redis

## Working MVP Path

Open `/new`, submit `https://www.aliexpress.com/item/1005008809640384.html`, review source facts/media warnings, pricing, SEO/compliance panels, edit sanitized HTML, and export HTML/JSON/CSV. Use the mock fixture only in local development.
