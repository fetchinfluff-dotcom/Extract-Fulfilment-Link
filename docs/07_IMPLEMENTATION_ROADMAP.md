# 07 — Implementation Roadmap

## Guiding rule

Build a narrow, end-to-end vertical slice first:

```text
Login → paste URL → mock/one adapter extraction → review facts
→ price → generate structured draft → edit → export HTML
```

Do not begin with every supplier, direct Shopify publishing, bulk import, or a complex multi-agent framework.

## Phase 0 — Repository foundation

Deliver:

- pnpm/Turborepo monorepo;
- Next.js app;
- worker app;
- shared packages;
- strict TypeScript;
- lint/format/typecheck/test scripts;
- environment validation;
- CI;
- Docker Redis for local development;
- Supabase setup/migrations;
- `AGENTS.md`;
- architecture decision records;
- seed/demo data.

Exit criteria:

- clean install;
- app and worker start;
- health endpoints;
- CI passes;
- no committed secrets.

## Phase 1 — Auth, workspace, projects

Deliver:

- signup/login/logout/reset;
- profile and workspace;
- RLS;
- dashboard;
- create/edit/archive project;
- plan/credit placeholder;
- audit events.

Exit criteria:

- users cannot access each other's data;
- RLS tests pass;
- dashboard responsive.

## Phase 2 — Extraction framework

Deliver:

- URL security guard;
- adapter interface;
- `MockSourceAdapter`;
- `CJDropShippingAdapter` API path;
- AliExpress and QKSource adapter skeletons;
- Crawlee/Playwright fallback framework;
- recorded fixtures;
- extraction progress;
- source review UI;
- user corrections.

Implementation order:

1. Mock adapter.
2. One real API-first adapter.
3. One browser-rendered adapter.
4. Third source.
5. Generic manual fallback.

Exit criteria:

- canonical schema returned;
- variants/media normalized;
- blocked pages fail safely;
- fixtures make tests deterministic.

## Phase 3 — Media and pricing

Deliver:

- media inspection;
- duplicate detection;
- source/provenance labels;
- selection/reorder;
- upload;
- signed storage URLs;
- pricing engine;
- variant scenarios;
- target-country shipping input;
- break-even ROAS and margin display.

Exit criteria:

- formulas unit-tested;
- unknown shipping clearly handled;
- unsafe media rejected;
- no arbitrary hotlink export.

## Phase 4 — AI engine

Deliver:

- provider abstraction;
- structured output schema;
- prompt versioning;
- category/risk classifier;
- title generator;
- content planner;
- full structured generation;
- factuality validator;
- SEO/AIEO checks;
- deterministic HTML renderer;
- sanitizer;
- model/cost logging;
- AI mock mode.

Exit criteria:

- no free-form model HTML accepted;
- all outputs schema-valid;
- fixture eval suite passes;
- unsupported claims flagged.

## Phase 5 — Editor and export

Deliver:

- three-pane workspace;
- visual editor;
- raw sanitized HTML;
- preview;
- section lock/regeneration;
- autosave;
- versions and diff;
- HTML/JSON/CSV export;
- content quality and compliance panels.

Exit criteria:

- manual edits persist;
- regeneration does not overwrite locked sections;
- exported HTML contains no unsafe markup.

## Phase 6 — Billing and commercial readiness

Deliver:

- plans;
- Stripe checkout/portal;
- webhook verification;
- credit ledger;
- usage enforcement;
- failed-job refund;
- admin view;
- transactional email;
- legal pages;
- onboarding;
- monitoring and alerts.

Exit criteria:

- client cannot forge credits;
- billing events idempotent;
- failed generation is not charged;
- delete-account flow works.

## Phase 7 — Beta hardening

Deliver:

- production adapter fixtures;
- load/concurrency tests;
- browser isolation;
- rate-limit tuning;
- observability;
- support tooling;
- error recovery;
- analytics funnels;
- accessibility review;
- security review;
- backup/restore drill.

## Post-MVP priority

1. Shopify direct publishing.
2. Bulk URL import.
3. Team roles.
4. Custom template builder.
5. Multi-language and localization memory.
6. WooCommerce/ShopBase integrations.
7. Image enhancement/generation.
8. Supplier price/stock monitoring.
9. API and browser extension.
10. Conversion feedback loop.

## Development workflow for Codex

For every phase:

1. Read all relevant docs.
2. Inspect existing code.
3. Write/update a short implementation plan.
4. Implement the smallest coherent slice.
5. Add unit/integration/e2e tests.
6. Run lint, typecheck, tests, and build.
7. Fix failures.
8. Update `STATUS.md`.
9. Commit logically if Git operations are available.
10. Do not claim completion when acceptance criteria fail.

## Definition of done

A feature is done only when:

- UI and server path exist;
- validation exists;
- authorization exists;
- error/loading/empty states exist;
- tests exist;
- docs/env changes exist;
- telemetry exists where needed;
- security implications addressed;
- no placeholder pretending to be production behavior.
