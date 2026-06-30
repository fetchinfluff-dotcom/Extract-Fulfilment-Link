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
- [ ] Supabase Auth/session wiring for real users.
- [x] Database-backed project lifecycle for production imports and generated versions.
- [x] Stitch ListingForge SaaS interface frame applied to landing, dashboard, and import flow.
- [ ] Full audit log coverage for billing/credits and all mutable project actions.
- [x] AliExpress title, media, selected price, and shipping extraction from live product data.
- [ ] Rich supplier extraction for all dynamic variants and fallback suppliers when public pages omit data.
- [ ] Full billing/Stripe implementation.
- [ ] Production monitoring and legal review.

## Current Blockers

- Public supplier extraction can work without credentials when the page exposes HTML/JSON-LD or AliExpress mtop data.
- Supplier API credentials are still useful for richer variants, shipping, rate limits, and fewer blocked pages.
- The provided JWT decodes as `anon`, not `service_role`; production persistence uses the server-only Supabase secret API key. Rotate pasted keys before real customer traffic.
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
- Production verify: `GET https://extract-fulfilment-link.vercel.app/new` -> 200
- Production verify: `POST /api/projects` with mock fixture -> 400 `Fixture URLs are disabled in production.`
- Production verify: `POST /api/projects` with `https://www.aliexpress.com/item/1005008224752493.html` -> 201
- Production verify: `POST /api/projects` with `https://www.aliexpress.com/item/1005008809640384.html` -> 201, project `791ab5eb-0217-4bbc-86a9-b6eb1f57a269`
- Production verify: `GET /api/projects/791ab5eb-0217-4bbc-86a9-b6eb1f57a269` -> 200 with 7 supplier images, detected item cost USD 0.99, shipping USD 1.99, suggested range USD 8.99-14.99
- Production verify: `GET /projects/791ab5eb-0217-4bbc-86a9-b6eb1f57a269` -> 200
- Production verify: `GET /api/projects/791ab5eb-0217-4bbc-86a9-b6eb1f57a269/export/json` -> 200
- Production verify after compact AI prompt: `POST /api/projects` with `https://www.aliexpress.com/item/1005008809640384.html` -> 201, project `a4294a80-69d9-4cf4-9c4b-915d762a6102`, extraction/persistence OK, AI fallback due provider timeout.
- Production verify after split AI patch generation: same AliExpress URL -> 201 in about 23s, project `c2f856d8-6c18-44ce-bac3-9460c4fd1760`, section patches applied, title/FAQ patches fell back.
- Production verify after description/UI refinement: project `f4b5153d-cd8e-48f3-8f3b-83670b8c8bcd` has 5 responsive images with alt text, no hardcoded guarantee block, no technical module headings, media buttons, and compliance status log.
- Supabase verify: project `791ab5eb-0217-4bbc-86a9-b6eb1f57a269` persisted with 1 source snapshot, 1 generated version, and active version set.
- Production note: AliExpress `.us` links are allowed; a fake item URL hit the safe redirect limit.
- Optional local app: `pnpm dev`
- Optional worker: `pnpm worker:dev` after starting Redis

## Working MVP Path

Open `/new`, submit `https://www.aliexpress.com/item/1005008809640384.html`, review source facts/media warnings, pricing, SEO/compliance panels, edit sanitized HTML, and export HTML/JSON/CSV. Use the mock fixture only in local development.
