# 08 — Testing and Acceptance Criteria

## 1. Test layers

### Unit

- URL canonicalization.
- private-IP/SSRF detection.
- adapter field normalization.
- currency/unit normalization.
- pricing formulas.
- psychological rounding.
- title/meta length.
- HTML rendering.
- sanitizer.
- claim rules.
- credit ledger math.

### Contract

- canonical `SourceProduct`.
- `GeneratedListing`.
- job events.
- API error shape.
- adapter fixtures.
- AI provider mock.

### Integration

- Supabase Auth + RLS.
- project lifecycle.
- queue enqueue/worker result.
- source extraction fixture.
- storage upload and signed URL.
- generation and version save.
- Stripe webhook idempotency.

### End-to-end

- sign up;
- create project;
- import fixture URL;
- review source;
- calculate price;
- generate;
- edit;
- regenerate section;
- export HTML;
- verify no unsafe markup.

### AI evaluations

Use deterministic fixture inputs and score:

- schema pass;
- fact support;
- claim risk;
- title clarity;
- layout selection;
- SEO fields;
- repetition;
- prohibited wording;
- HTML sanitation.

## 2. Required source fixtures

- CJ product with variants and shipping.
- AliExpress-like static fixture.
- JavaScript-rendered product fixture.
- QKSource-like fixture.
- missing price.
- missing shipping.
- conflicting variant price.
- no package contents.
- duplicate images.
- tiny/broken image.
- malicious script in description.
- prompt injection in source text.
- CAPTCHA/blocked response.
- unsupported domain.
- redirect to private IP.
- restricted product.

Do not make CI depend on live supplier pages.

## 3. Pricing acceptance examples

Given:

```text
item = 8.00
shipping = 4.00
handling = 0
landed = 12.00
```

Default:

```text
low = 36.00 before rounding
recommended = 48.00 before rounding
high = 60.00 before rounding
```

With `.99` rounding, implementation must use one documented policy consistently, for example:

- round upward to next `.99`;
- never round below the unrounded target.

Tests must cover decimal precision and currency rounding.

## 4. Extraction acceptance

- Supported domain detected.
- Canonical URL stored.
- Source product ID extracted if available.
- At least title or manual fallback.
- Variant costs retain source currency.
- Shipping quote tied to destination and timestamp.
- Media source/provenance retained.
- No source script executed outside isolated browser.
- Blocked page stops safely.
- No CAPTCHA bypass.
- Every warning visible to user.

## 5. Generation acceptance

- JSON validates against schema.
- Default title contains clear product type.
- Description uses only supported facts.
- Missing specifications are omitted or marked.
- No fabricated rating/review/customer count.
- No fabricated guarantee/shipping time.
- High-risk claims flagged.
- Restricted product rejected.
- HTML sanitizer removes unsafe content.
- One H1 is handled by the product page outside description; generated description starts at H2.
- FAQ answers are self-contained and factual.
- meta title and description warnings appear when limits are exceeded.
- selected media references approved asset IDs.

## 6. Editor acceptance

- Autosave after manual edit.
- Reload restores edits.
- Undo/redo works.
- Section reorder persists.
- Locked section survives regeneration.
- Version diff works.
- Mobile preview works.
- Raw HTML cannot save forbidden tags.
- Export matches active version.
- Accessibility keyboard flow covers primary actions.

## 7. Security acceptance

- Direct request to private IP rejected.
- Redirect to private IP rejected.
- alternate IP notation rejected.
- unauthorized project access returns 404/403 without leaking existence.
- RLS prevents cross-workspace reads/writes.
- service key absent from client bundle.
- AI keys absent from logs.
- Stripe webhook without valid signature rejected.
- duplicate webhook does not duplicate credits.
- malicious HTML is sanitized.
- malicious image MIME mismatch rejected.
- rate limits enforced.
- account deletion removes/anonymizes data per policy.

## 8. Performance targets for MVP

Treat as targets, not promises:

- dashboard interactive on a normal broadband connection;
- project CRUD request usually sub-second excluding cold start;
- extraction and generation run asynchronously;
- progress visible within a few seconds;
- editor remains responsive with a long product page;
- media thumbnails optimized and lazy-loaded;
- browser concurrency capped.

## 9. Release gate

Production release is blocked if:

- any critical/high security issue open;
- cross-user data access possible;
- raw AI HTML can execute;
- billing can double-charge credits;
- fake review generation exists;
- SSRF tests fail;
- live scraping is required for CI;
- no data deletion flow;
- no legal/acceptable-use pages;
- no monitoring for worker failures.

## 10. Manual beta checklist

- Test each supported platform with multiple product types.
- Compare extracted cost and shipping to source manually.
- Review title originality.
- Review every generated factual claim.
- Test non-English output.
- Test target-country changes.
- Test missing shipping manual override.
- Test high-risk beauty/health-support item.
- Test unsupported and restricted items.
- Test mobile editor.
- Test failed payment and expired subscription.
- Test support workflow and audit trail.
