# Deployment Runtime

## Current production

- Vercel hosts the Next.js web/API project.
- Supabase Postgres stores created projects, source snapshots, and generated versions.
- AI generation uses the configured OpenAI-compatible provider when `AI_MOCK_MODE=false`.
- AliExpress extraction runs in the web API request path for the MVP repair.

## Not yet production-complete

- `apps/worker` exists, but no persistent worker container is currently verified.
- Redis/BullMQ is not verified in production.
- Long extraction/generation should move from Vercel request handlers to `apps/worker` before broader beta.
- Supabase Auth/RLS user flow is not wired into the UI yet; the repair uses a single MVP workspace and server-side service key only.

## Required env

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` or `SUPABASE_SECRET_KEY`
- `AI_MOCK_MODE=false`
- `AI_BASE_URL`
- `AI_API_KEY`
- `AI_MODEL_QUALITY`
- `FEATURE_ALIEXPRESS_ADAPTER=true`

## Verification

- `GET /new` returns 200.
- `POST /api/projects` with `https://www.aliexpress.com/item/1005008809640384.html` returns 201.
- `GET /api/projects/:id` returns persisted JSON after a new request.
- `GET /api/projects/:id/export/html|json|csv` returns exported content.
