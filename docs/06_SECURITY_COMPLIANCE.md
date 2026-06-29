# 06 — Security and Compliance

## 1. Threat model

The application accepts arbitrary-looking URLs, fetches external content, processes remote media, calls AI APIs, renders HTML, stores user projects, and charges customers. Treat every boundary as hostile.

Primary threats:

- SSRF and internal network access;
- DNS rebinding;
- redirect to private IP;
- oversized downloads;
- malicious MIME/content;
- XSS in source or AI output;
- prompt injection;
- credential leakage;
- unauthorized workspace access;
- duplicate billing;
- supplier account/token theft;
- copyrighted media misuse;
- fake testimonials;
- prohibited or regulated product content;
- scraping terms violations;
- denial of service through browser jobs.

## 2. URL ingestion security

MVP must use a strict domain allowlist.

Validation steps:

1. Parse with standards-compliant URL parser.
2. Require HTTPS except local development.
3. Reject credentials in URL.
4. Normalize IDN/punycode.
5. Check exact hostname and approved subdomains.
6. Resolve DNS server-side.
7. Reject:
   - localhost;
   - loopback;
   - link-local;
   - private RFC1918;
   - carrier-grade NAT;
   - cloud metadata IPs;
   - IPv6 local/private;
   - non-routable addresses.
8. Re-check every redirect destination.
9. Limit redirects.
10. Limit response size and time.
11. Disable arbitrary ports.
12. Use egress firewall rules where possible.

Never expose a general-purpose fetch proxy.

## 3. Browser worker security

- Run Chromium in isolated containers.
- No access to internal network.
- Ephemeral profiles.
- No saved credentials.
- Disable downloads unless explicitly handled.
- Restrict file-system mounts.
- Cap CPU, memory, and execution time.
- Close pages/contexts after job.
- Do not bypass CAPTCHA or anti-bot mechanisms.
- Log platform/method, not sensitive page content.

## 4. Prompt injection defense

Supplier HTML/text is untrusted.

- Remove scripts, comments, hidden text, and navigation.
- Extract only fields needed for product data.
- Pass data as structured JSON.
- System prompt explicitly says web content is data, never instructions.
- Do not give the model tools or secrets during content generation.
- Do not allow source text to select model, endpoint, prompt, or system behavior.
- Scan suspicious phrases and flag the snapshot.
- Bound input length.

## 5. HTML/XSS safety

- AI outputs structured JSON.
- Application renders HTML.
- Sanitize server-side before storage.
- Sanitize again before rendering when practical.
- Use an allowlist of tags, attributes, classes, and URL protocols.
- No script/style/iframe/form/event attributes.
- No arbitrary inline CSS.
- Content Security Policy.
- Escape raw source text.
- Isolate preview if raw HTML mode exists.
- Never use unsanitized `dangerouslySetInnerHTML`.

## 6. Authentication and authorization

- Supabase Auth.
- Email verification.
- Secure cookies/session.
- RLS on every user-owned table.
- Workspace membership checks in API and database.
- Service-role key server/worker only.
- Short-lived signed storage URLs.
- Re-authentication for sensitive changes.
- Audit account, billing, export, and deletion actions.
- Rate limit login, password reset, generation, and URL extraction.

## 7. Secret management

- Environment or managed secret store.
- Never commit `.env`.
- Never log API keys/tokens.
- Encrypt supplier refresh tokens at application level.
- Key rotation support.
- Separate development/staging/production keys.
- Restrict scopes to minimum.
- Redact secrets from error tracking.

## 8. Media safety and rights

Every media asset has provenance and license status.

Statuses:

- supplier-authorized;
- user-owned;
- licensed-stock;
- generated;
- unknown;
- rejected.

Rules:

- Unknown assets can be previewed but show a warning before export.
- Do not build a reusable library of scraped customer avatars.
- Do not copy competitor photos, logos, reviews, or before/after images.
- Remove EXIF where appropriate.
- Validate MIME by file signature.
- Scan uploads.
- Cap dimensions and bytes.
- Re-encode images.
- Preserve original source URL and timestamp.
- Provide takedown/DMCA process.

## 9. Review and social-proof integrity

The product must prohibit:

- fabricated reviews;
- copied reviews from unrelated stores;
- invented ratings;
- invented customer counts;
- fake verified-buyer badges;
- real-person avatars used without rights;
- fake press logos;
- false expert endorsements.

Allow:

- blank review section;
- merchant-imported verified reviews;
- user-uploaded UGC with consent;
- licensed avatars;
- abstract placeholders;
- clearly labeled AI-generated fictional visual assets that are not represented as real customers.

## 10. Product claims policy

### Always require verification for

- certifications;
- regulatory approval/registration;
- waterproof/IP ratings;
- battery life;
- exact materials;
- medical outcomes;
- clinical claims;
- quantified performance;
- shipping times;
- guarantees;
- inventory/scarcity;
- “made in” claims.

### High-risk categories

- medical-like devices;
- pain, arthritis, nerve, migraine, circulation, pregnancy;
- hair regrowth;
- red-light therapy;
- infant products;
- safety equipment;
- electrical energy-saving products;
- diagnostic devices.

Use conservative drafts and visible warnings.

### Restricted by default

- firearms and parts;
- lock-picking/burglary tools;
- surveillance/spy devices;
- illegal or counterfeit goods;
- controlled substances;
- products enabling wrongdoing;
- adult products if platform policy disables them;
- hazardous chemicals.

The exact list must be configurable in admin policy.

## 11. Platform and crawling compliance

- Follow supplier API terms.
- Respect robots directives where applicable.
- Identify the application where appropriate.
- Rate limit requests.
- Cache responsibly.
- Do not bypass authentication, geo blocks, CAPTCHA, or access controls.
- Use official APIs when available.
- Provide a manual-input fallback.
- Maintain adapter-specific terms notes.
- Have legal counsel review commercial deployment and supplier/platform agreements.

## 12. Privacy

- Collect minimum data.
- Publish privacy policy.
- Support data export and deletion.
- Do not store unnecessary customer personal data.
- Hash IP/user agent in audit logs where sufficient.
- Define retention periods.
- Configure subprocessors.
- Use regional controls if required.
- Obtain consent for analytics/cookies where applicable.

## 13. Billing safety

- Verify Stripe webhook signatures.
- Idempotent webhook processing.
- Append-only credit ledger.
- Reserve and finalize credits.
- Refund failed jobs automatically.
- Never trust client-reported plan/credit.
- Admin changes audited.
- Prevent replay and duplicate event processing.

## 14. Operational controls

- Health checks.
- Queue depth alert.
- Browser crash alert.
- Supplier adapter failure rate.
- AI schema failure rate.
- Cost-per-generation alert.
- Rate-limit and abuse alerts.
- Dead-letter dashboard.
- Backup and restore test.
- Incident response and status communication.

## 15. Required legal pages before launch

- Terms of Service.
- Privacy Policy.
- Acceptable Use Policy.
- Copyright/DMCA/Takedown.
- Refund/Billing Policy.
- AI-generated content disclaimer.
- Supplier/platform non-affiliation disclaimer where appropriate.
