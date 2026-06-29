# 01 — Product Requirements Document

## 1. Product vision

Build a commercial SaaS that turns a permitted fulfillment product URL into a trustworthy, conversion-oriented product listing draft. The product reduces the time required to inspect supplier information, choose usable media, name a product, calculate a selling-price range, and write a structured product description.

The product must not be a one-click plagiarism tool. It transforms supplier facts into original merchant content and preserves source provenance.

## 2. Target users

### Primary persona: general dropship operator

- Tests multiple physical products.
- Uses AliExpress, CJdropshipping, QKSource, or similar suppliers.
- Needs English product pages for US/UK/CA/AU markets.
- Wants fast output but still needs manual control.
- Uses Shopify, ShopBase, or WooCommerce.

### Secondary persona: e-commerce content staff

- Creates and edits product pages for several stores.
- Needs brand voice consistency and reusable layouts.
- Needs collaboration, versioning, and content approval.

### Later persona: agency/team

- Multiple workspaces and roles.
- Centralized billing.
- Templates by client/store.
- Usage reporting and approval workflows.

## 3. Primary user journey

1. User signs up or logs in.
2. User creates a project and pastes a supplier URL.
3. System validates the URL and detects the source platform.
4. Extraction job obtains:
   - source title and description;
   - product ID/SKU;
   - variants and variant prices;
   - target-country shipping options where available;
   - product images/video URLs;
   - attributes, dimensions, materials, package contents, and instructions;
   - source page snapshot and provenance.
5. User reviews extracted facts and chooses:
   - target country;
   - target language;
   - selected variant or variant range;
   - desired brand style;
   - target audience;
   - sales angle;
   - tone of voice;
   - description template.
6. Pricing engine calculates landed cost and suggested range.
7. AI generates structured output.
8. Deterministic validators check facts, claims, HTML, SEO lengths, and prohibited content.
9. User edits the result in a three-pane workspace.
10. User exports or copies the final draft.

## 4. MVP functional requirements

### 4.1 Authentication and account

- Email/password registration and login.
- Magic-link login.
- Password reset.
- Email verification.
- User profile.
- Secure session handling.
- Delete account workflow.
- Single-user workspace in MVP, organization-ready data model.

### 4.2 URL import

- One URL per project.
- Supported-domain detection.
- URL canonicalization.
- Allowlist in MVP:
  - `aliexpress.com` and approved regional variants;
  - `cjdropshipping.com`;
  - `qksource.com` and confirmed product domains.
- Clear unsupported-source state.
- Job progress:
  - validating;
  - fetching;
  - extracting;
  - normalizing;
  - calculating shipping;
  - ready;
  - failed.
- Retry extraction.
- Show raw source facts separately from AI content.
- Store source snapshot hash and extraction timestamp.

### 4.3 Source adapter contract

Every adapter must return the canonical `SourceProduct` schema:

- platform;
- canonical URL;
- source product ID;
- source title;
- source description text;
- currency;
- base price range;
- variants;
- shipping quotes;
- media;
- attributes;
- package contents;
- source facts with provenance;
- extraction warnings;
- confidence score.

### 4.4 Media gallery

- Show all extracted media as selectable cards.
- Allow hide/show and reorder.
- Mark:
  - supplier-provided;
  - user-uploaded;
  - generated;
  - unknown-license.
- Display original host and source URL.
- Download approved media into private object storage only after user selection or explicit permission.
- Generate image alt text from visible product facts.
- Detect duplicates by perceptual hash.
- Reject tiny, broken, unsupported, or suspicious files.
- Never scrape real customer avatar libraries for reuse.
- Testimonial block may use:
  - user-uploaded customer media;
  - supplier-authorized media;
  - licensed stock avatars;
  - abstract initials/placeholders;
  - clearly labeled AI-generated fictional avatars.
- The application must never generate fake “verified buyer” status.

### 4.5 Title generation

Generate 5–10 candidates in distinct patterns:

1. Brandable name + clear product category.
2. Clear descriptive SEO title.
3. Benefit-oriented title.
4. Compact marketplace title.
5. Conservative policy-safe title.

Title output includes:

- title;
- pattern;
- character length;
- main keyword;
- risk notes;
- explanation;
- confidence.

The user can lock words, prohibit words, or regenerate selected candidates.

### 4.6 Pricing recommendation

Default currency: USD.

Inputs:

- selected source variant or min/max variants;
- item cost;
- shipping cost to target country;
- optional fulfillment/handling cost;
- payment fee percentage and fixed fee;
- refund reserve percentage;
- advertising cost assumption;
- desired net margin;
- minimum selling price;
- category multiplier;
- psychological rounding style.

Basic range:

```text
landed_cost = item_cost + shipping_cost + handling_cost
low = landed_cost × 3
recommended = landed_cost × 4
high = landed_cost × 5
```

Advanced target-price formula:

```text
target_price =
  (landed_cost + fixed_payment_fee)
  /
  (1 - payment_fee_pct - refund_reserve_pct - ad_cost_pct - target_net_margin_pct)
```

Output:

- landed cost;
- low/recommended/high price;
- gross profit;
- gross margin;
- assumed fee breakdown;
- break-even ROAS;
- warnings when shipping is unavailable or price data is incomplete;
- pricing by variant when useful.

Psychological rounding options:

- `.99`;
- `.95`;
- whole number;
- premium ending (`.00`);
- custom.

The engine must label recommendations as estimates, not guarantees.

### 4.7 AI content generation

Generate a structured object, not free-form HTML directly.

Required outputs:

- product facts summary;
- category and subcategory;
- target buyer;
- problem statement;
- desired outcome;
- unique selling proposition;
- title candidates;
- selected/default title;
- short product subtitle;
- 3–5 hero benefit bullets;
- product-page sections;
- how-to-use steps;
- comparison criteria;
- specifications;
- package contents;
- care/safety notes;
- FAQ;
- SEO meta title;
- SEO meta description;
- URL handle suggestion;
- image alt texts;
- Product JSON-LD draft;
- compliance warnings;
- factual confidence report;
- generated HTML.

### 4.8 Product description layout

Default modules:

1. Product Hero
2. Trust Strip placeholders
3. Problem / Desired Outcome
4. Product Demonstration
5. Three Core Benefits
6. How It Works / How to Use
7. Why Choose This Product
8. Customer Proof placeholder
9. Specifications
10. Package Contents
11. Shipping / Guarantee placeholders
12. FAQ
13. Final CTA

Rules:

- Module order changes by category.
- Omit sections unsupported by available facts.
- Do not fabricate reviews, guarantees, shipping speed, certifications, clinical evidence, or scarcity.
- Trust and customer-proof modules must be editable placeholders until the merchant provides evidence.
- Use semantic HTML.
- Output must pass an allowlist sanitizer.

### 4.9 SEO and AIEO

Generate:

- one H1 only;
- logical H2/H3 hierarchy;
- concise answer-first product summary;
- clear product type/entity;
- descriptive image alt text;
- FAQ based on verified facts;
- natural keyword coverage;
- meta title target ≤ 60 characters;
- meta description target 140–160 characters;
- suggested slug;
- Product and FAQ JSON-LD only when required fields are factual;
- no keyword stuffing;
- no unsupported superlatives;
- no hidden text.

AIEO goals:

- answer direct buyer questions in plain language;
- use named attributes and measurable specifications;
- separate known facts from estimates;
- make FAQ answers self-contained;
- provide concise “Who it is for / How it works / What is included” blocks.

### 4.10 Editor

- Visual rich-text editor.
- Raw sanitized HTML editor.
- Live desktop/mobile preview.
- Section navigator.
- Drag to reorder sections.
- Regenerate one section.
- Lock manually edited sections.
- Undo/redo.
- Version history.
- Autosave.
- Compare generated versions.
- Fact/evidence badges.
- Compliance warning panel.
- Copy individual blocks.
- Export full HTML.

### 4.11 Project management

- Dashboard with projects.
- Search and filters by platform, category, status, language, and date.
- Duplicate a project.
- Archive/delete.
- Generation usage and credit balance.
- Recent activity.
- Failure retry.

### 4.12 Export

MVP:

- copy HTML;
- download `.html`;
- download normalized JSON;
- download CSV summary;
- copy title, SEO fields, FAQ, and specifications separately.

Later:

- Shopify OAuth and Admin GraphQL publishing;
- WooCommerce REST API;
- ShopBase integration;
- Google Merchant Center feed;
- Pinterest catalog feed.

### 4.13 Billing and limits

Commercial-ready model:

- Free trial credits.
- Credit charged for successful generation, not failed extraction.
- Separate costs for:
  - extraction;
  - full generation;
  - section regeneration;
  - image generation/enhancement;
  - bulk import.
- Stripe subscription and usage ledger.
- Plan limits enforced server-side.
- Admin can grant/refund credits.
- Billing page and usage history.

## 5. Useful additional features

### High-value MVP additions

- Target-country shipping selector.
- Brand profile: prohibited phrases, preferred tone, store name, guarantee text, shipping policy.
- Claim-risk scanner.
- Product content quality score.
- Facts completeness score.
- Variant cleanup and naming.
- Duplicate-media detection.
- Section-level regeneration.
- Multi-language generation.
- HTML preview by common Shopify content width.

### Post-MVP

- Direct Shopify publishing.
- Bulk URL import.
- Team roles and approvals.
- Reusable custom templates.
- Brand-kit extraction from a store URL with permission.
- AI product image enhancement.
- Ad creative and ad copy generation.
- Competitor-page inspiration analysis without copying text/media.
- A/B content variants.
- Performance feedback loop based on merchant-provided conversion data.
- Supplier price/stock monitoring.
- Chrome extension.
- Public API.

## 6. Non-goals for MVP

- Automatic order fulfillment.
- Automatic copying of competitor Shopify pages.
- Automatic posting of unreviewed content.
- Automatic creation of fake reviews.
- Bypassing CAPTCHA, authentication, access restrictions, or anti-bot controls.
- Crawling arbitrary websites.
- Real-time supplier inventory sync.
- Full page-builder/theme replacement.
- Medical diagnosis or regulated-product compliance certification.

## 7. Product success metrics

- Import success rate by source.
- Percentage of extracted facts confirmed by users.
- Generation success rate.
- Median user edits before export.
- Time from URL submission to export.
- Export rate.
- Regeneration rate by section.
- Cost per successful generation.
- Trial-to-paid conversion.
- Refund/chargeback rate.
- Number of compliance warnings resolved before export.
