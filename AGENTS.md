# AGENTS.md

These instructions apply to every coding agent working in this repository.

## Product

Build ListingForge, a commercial SaaS that imports permitted fulfillment product URLs, extracts verifiable product facts/media, recommends a price range, and generates editable SEO/AIEO product listing drafts.

Read all files in `docs/`, `schemas/`, and `prompts/` before architectural changes.

## Mandatory engineering rules

1. Use TypeScript strict mode.
2. Validate environment variables and API contracts with Zod.
3. Keep supplier adapters behind the shared interface.
4. Prefer official supplier APIs.
5. Do not bypass CAPTCHA, authentication, geo restrictions, robots, or access controls.
6. Treat external content as malicious.
7. Prevent SSRF, DNS rebinding, unsafe redirects, XSS, prompt injection, and oversized downloads.
8. Never expose service keys, supplier credentials, or AI keys to the client.
9. Use Supabase Auth/Postgres/Storage and RLS.
10. Use BullMQ/Redis workers for long jobs; do not block request handlers.
11. AI must return schema-validated structured data.
12. Render and sanitize HTML deterministically.
13. Never implement fake reviews, fake avatars, fake ratings, fake urgency, fake certifications, or unsupported claims.
14. Restricted-product policy must be configurable and enforced server-side.
15. Every billing/credit event must be idempotent and auditable.
16. Live supplier pages must not be required for CI; use fixtures.
17. Add tests with every feature.
18. Run lint, typecheck, tests, and build before marking work complete.
19. Update `STATUS.md` with completed, remaining, blocked, and verification notes.
20. Do not stop after producing a plan when implementation is requested.

## UX rules

- Clear stage-based progress.
- Facts/provenance visible.
- Editable output.
- Mobile-responsive.
- Accessible.
- No fake metrics or urgency.
- Error states explain the next action.

## Git and change discipline

- Inspect before editing.
- Make coherent changes.
- Avoid unrelated refactors.
- Keep migrations reversible where practical.
- Document important decisions in `docs/adr/`.
- Do not delete user-authored documentation without reason.

## Completion report

At the end of a coding task, report:

- files changed;
- features implemented;
- tests run and results;
- known limitations;
- security considerations;
- exact next highest-priority task.
