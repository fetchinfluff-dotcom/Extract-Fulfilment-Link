You are the lead product engineer responsible for building the initial production-quality MVP of this repository.

First, read `README.md`, `AGENTS.md`, every file in `docs/`, both schemas in `schemas/`, the prompt in `prompts/`, and `.env.example`. Treat them as the authoritative specification.

Your task is to implement the project, not merely describe it.

## Required execution behavior

1. Inspect the repository and current state.
2. Create or update `STATUS.md` with:
   - architecture decisions;
   - checklist by phase;
   - current blockers;
   - commands used to verify work.
3. Build the smallest end-to-end vertical slice first:
   - monorepo foundation;
   - Next.js web app;
   - worker;
   - Supabase-compatible database schema and RLS migrations;
   - authentication UI;
   - project dashboard;
   - URL submission;
   - secure URL validation;
   - MockSourceAdapter with realistic fixture;
   - extraction job through BullMQ;
   - extracted facts/media review;
   - pricing calculation;
   - AI provider abstraction with mock provider and OpenAI-compatible provider;
   - structured GeneratedListing validation;
   - deterministic sanitized HTML renderer;
   - editor/preview;
   - HTML and JSON export.
4. Then implement the first real supplier adapter where credentials are available from environment variables. Prefer CJdropshipping official API. If credentials are absent, complete the adapter client, tests with fixtures, and clear runtime configuration errors without blocking the rest of the app.
5. Add AliExpress and QKSource adapter skeletons with capability detection, safe failure, fixtures, and TODO documentation. Do not bypass CAPTCHA or access controls.
6. Implement security and compliance requirements from `docs/06_SECURITY_COMPLIANCE.md`.
7. Implement the clean SaaS UX from `docs/05_UX_UI_SPEC.md` using shadcn/ui, but do not copy proprietary screens or brand assets.
8. Add tests from `docs/08_TEST_ACCEPTANCE.md`.
9. Run all verification commands and fix failures.
10. Continue implementation until a coherent runnable MVP exists. Do not stop after planning or scaffolding.
11. If a dependency/API detail has changed, use official documentation and choose a current stable version. Record the decision.
12. Do not fabricate working integrations. Where credentials or external approval are required, provide a tested interface, fixture, setup instructions, and explicit status.
13. Do not use unrestricted system access. Stay within the workspace.

## Required repository shape

Use pnpm workspaces and Turborepo:

- `apps/web`
- `apps/worker`
- `packages/adapters`
- `packages/ai`
- `packages/config`
- `packages/db`
- `packages/html`
- `packages/media`
- `packages/pricing`
- `packages/schemas`
- `packages/security`
- `packages/ui`
- `tests`

## Preferred technologies

- Next.js App Router
- React + TypeScript strict
- Tailwind + shadcn/ui
- Supabase Auth/Postgres/Storage
- Drizzle ORM plus SQL RLS migrations
- Redis + BullMQ
- Crawlee + Playwright only behind adapters
- Tiptap editor
- Zod
- Vitest
- Playwright for E2E
- Stripe-ready billing interfaces, but billing can remain feature-flagged until the vertical slice works
- provider-agnostic AI through an OpenAI-compatible endpoint

## Non-negotiable behavior

- Official supplier API first.
- Strict URL allowlist and SSRF protection.
- External content is untrusted.
- No raw AI HTML accepted.
- No unsanitized HTML rendered.
- No fake reviews, avatars, ratings, buyers, urgency, certifications, guarantees, or medical claims.
- Facts ledger and provenance visible in UI.
- Restricted products rejected by default.
- Failed jobs do not consume credits.
- User data separated by RLS.
- No service-role key or AI key in client code.
- CI uses fixtures, not live supplier pages.

## UI deliverables

Create:

- public landing page;
- login/signup/reset;
- onboarding;
- dashboard;
- new product wizard;
- source review screen;
- three-pane editor;
- pricing panel;
- SEO panel;
- compliance panel;
- export flow;
- settings/brand profile;
- clear loading, empty, unsupported, blocked, and failure states.

Use a temporary brand controlled by `NEXT_PUBLIC_APP_NAME`.

## Verification

Provide scripts for:

```bash
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm dev
pnpm worker:dev
pnpm e2e
```

At completion:

- update `STATUS.md`;
- update root README with local setup;
- ensure `.env.example` is complete;
- list what is truly working;
- list integrations requiring credentials;
- list remaining items in priority order;
- do not state that production is ready unless every release gate passes.
