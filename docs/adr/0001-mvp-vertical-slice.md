# ADR 0001: Fixture-first vertical slice

## Decision

Build the first runnable MVP around the `MockSourceAdapter`, mock AI provider, strict shared schemas, deterministic HTML rendering, and Supabase-compatible SQL migrations.

## Rationale

This ships the whole product loop without depending on live supplier pages, credentials, or AI spend. Real supplier adapters remain behind the same interface and fail safely until credentials are configured.

## Consequences

- Local CI is deterministic.
- CJ/AliExpress/QKSource are not claimed as live integrations.
- Production deployment still needs Supabase project setup, Redis, supplier credentials, legal pages review, and operational hardening.
