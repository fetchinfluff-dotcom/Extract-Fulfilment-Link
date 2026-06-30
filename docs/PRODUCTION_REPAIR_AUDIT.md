# Production Repair Audit

| Original requirement | Current implementation | Observed behavior | Root cause | Required repair | Verification method |
|---|---|---|---|---|---|
| Project persists and direct URLs reload | Production used `apps/web/lib/demo-store.ts` Map | `/api/projects/ff19c6bc-ccff-4c12-87df-8b9ed7df1be1` returned 404 while page shell returned 200 | In-memory data lost between Vercel lambdas | Store project, source snapshot, and generated version in Supabase | Create AliExpress project, hard reload/direct API/export |
| Real AliExpress extraction | Adapter uses public HTML plus AliExpress mtop | `1005008224752493` worked; `1005008809640384` is acceptance URL | Previous JSON-LD-only parser missed most AliExpress data | Keep mtop path, fail visibly when blocked | Production POST exact URL |
| No fixture success for real URLs | Mock adapter still available first in local adapter list | Fixture host was visible in UI and allowed by defaults | Demo UX leaked into production | Block fixture URL in production; remove fixture UI text | Production POST fixture URL should fail |
| Production AI is real | OpenAI-compatible provider exists with fallback | Invalid/slow model response fell back after timeout | No hard production guard | Throw when `AI_MOCK_MODE=true` in production | Build + production env check |
| Pricing from cost + shipping | Pricing uses selected variant and first shipping quote | Works when adapter extracts both; warns on missing shipping | Earlier extraction often had no shipping | Persist source/pricing; keep missing-shipping warning | API JSON/export inspection |
| Generated HTML safe | Deterministic renderer and sanitizer | Image blocks now render via `<img>` | Renderer originally ignored image block type | Add image rendering and sanitizer coverage | Unit tests |
| Editor save persists | PATCH updated only memory | Refresh lost manual edits | No DB write | PATCH active generated version HTML in Supabase | Save, refresh, export |
| Worker runtime | Worker package exists but not deployed | Web API still runs extraction/generation synchronously | Persistent worker host/Redis not configured | Document limitation; move to worker next | `docs/DEPLOYMENT_RUNTIME.md` |

## Root causes

1. Production was still using demo memory storage.
2. Demo fixture copy remained in public UI.
3. Supabase migrations were not applied.
4. AliExpress extraction initially relied on JSON-LD only.
5. Worker/Redis architecture exists in docs but is not deployed.

## Repair scope shipped now

- Applied Supabase schema/RLS migrations.
- Added production Supabase persistence path for current project payload.
- Blocked fixture URL use in production.
- Blocked mock AI in production.
- Kept AliExpress mtop extraction and exact acceptance URL as production test input.

## Remaining release gates

- Auth/workspace UI and RLS-backed user sessions.
- Durable BullMQ/Redis worker deployment.
- Full variants table/media storage/version diff/editor locks.
- Browser/mobile screenshot QA.
