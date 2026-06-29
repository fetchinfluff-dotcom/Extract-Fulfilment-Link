# ListingForge Status

## Architecture Decisions

- pnpm workspace + Turborepo monorepo with `apps/web`, `apps/worker`, and shared packages.
- Fixture-first MVP path: `MockSourceAdapter` -> pricing -> mock AI provider -> deterministic sanitized HTML -> editor/export.
- Supplier integrations stay behind `SourceAdapter`; CJ/AliExpress/QKSource first try safe public HTML/JSON-LD extraction and fail clearly on blocked/dynamic pages.
- Supabase-compatible schema and RLS migrations live in `packages/db/migrations`.
- Local demo web uses in-memory storage only; database persistence is the next highest-priority implementation step.
- Production is deployed on Vercel from `fetchinfluff-dotcom/Extract-Fulfilment-Link`.

## Phase Checklist

- [x] Phase 0: monorepo foundation, strict TypeScript configs, shared packages, Redis docker compose retained.
- [x] Phase 1: auth UI placeholders, onboarding, dashboard, project creation demo path.
- [x] Phase 2: URL guard, adapter interface, mock adapter fixture, safe public-page supplier adapters.
- [x] Phase 3: pricing engine and media provenance display.
- [x] Phase 4: AI provider abstraction, mock provider, structured validation, HTML renderer/sanitizer.
- [x] Phase 5: three-pane editor, server-side sanitized save, HTML/JSON/CSV export.
- [ ] Supabase Auth/session wiring for real users.
- [ ] Database-backed project lifecycle and audit logs.
- [ ] Rich supplier extraction for dynamic variants/shipping when public pages omit data.
- [ ] Full billing/Stripe implementation.
- [ ] Production monitoring and legal review.

## Current Blockers

- Public supplier extraction can work without credentials when the page exposes HTML/JSON-LD product data.
- Supplier API credentials are still useful for richer variants, shipping, rate limits, and fewer blocked pages.
- Supabase production environment variables are present on Vercel, but persistence still requires applying `packages/db/migrations` to the Supabase project. The current Supabase connector account does not have permission on project `ozfoqumrwovdawevpvbn`.
- The provided JWT decodes as `anon`, not `service_role`; keep the secret API key server-only and rotate pasted keys before real customer traffic.
- OpenAI-compatible generation is enabled in production. Invalid, wrapped, slow, or timed-out AI responses fall back to a deterministic source-fact draft with a compliance warning.

## Verification Commands

- Passed: `pnpm install`
- Passed: `pnpm lint`
- Passed: `pnpm typecheck`
- Passed: `pnpm test`
- Passed: `pnpm build`
- Passed after public-adapter/AI-provider wiring: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`
- Passed after installing Chromium with `pnpm exec playwright install chromium`: `pnpm e2e`
- Passed after production hardening: `pnpm test` (3 files, 9 tests) and `pnpm build`
- Production verify: `GET https://extract-fulfilment-link.vercel.app/new` -> 200
- Production verify: `POST /api/projects` with mock fixture -> 201, project detail page -> 200
- Production note: AliExpress `.us` links are allowed; a fake item URL hit the safe redirect limit.
- Optional local app: `pnpm dev`
- Optional worker: `pnpm worker:dev`

## Working MVP Path

Open `/new`, submit `https://mock.listingforge.local/products/collapsible-lamp`, review source facts/media warnings, pricing, SEO/compliance panels, edit sanitized HTML, and export HTML/JSON/CSV.
