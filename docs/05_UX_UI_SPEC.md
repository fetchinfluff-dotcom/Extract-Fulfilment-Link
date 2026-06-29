# 05 — UX/UI Specification

## 1. UX objective

A first-time user should understand the workflow without documentation:

```text
Paste supplier URL → Verify product facts → Choose selling strategy
→ Generate → Edit → Export
```

The interface should feel like a professional content workspace, not a generic “AI magic” landing page.

## 2. Design direction

Use proven SaaS patterns inspired by modern dashboard products, but do not copy exact visual assets, source code, trademarks, or proprietary screens.

Recommended visual language:

- calm neutral background;
- white/raised workspace surfaces;
- one configurable accent color;
- strong typography;
- generous whitespace;
- subtle borders instead of excessive shadows;
- minimal gradients;
- clear progress and evidence states;
- responsive layout;
- accessible contrast and focus states.

Use shadcn/ui components and blocks as foundations, then customize.

## 3. Marketing site

Pages:

- Home
- Features
- Supported Sources
- Pricing
- Examples
- FAQ
- Login
- Sign Up
- Terms
- Privacy
- Acceptable Use
- Copyright/DMCA
- Contact

Hero message structure:

```text
Turn a supplier link into a product-page draft you can trust.

Extract product facts, organize usable media, calculate a pricing range,
and generate editable SEO-ready product content.
```

Do not promise guaranteed conversion, rankings, or sales.

Marketing demo:

- URL input mock.
- Animated extraction steps.
- Before: raw supplier listing.
- After: clean structured page.
- Show fact evidence and compliance warnings as differentiators.

## 4. Onboarding

Step 1: goal

- Test products faster.
- Build product pages.
- Optimize existing listings.
- Manage content for clients.

Step 2: default market

- Country.
- Currency.
- Language.

Step 3: brand profile

- Store name.
- Tone.
- Preferred/prohibited wording.
- Shipping, returns, guarantee copy.

Step 4: first import.

Allow skip except required market/currency.

## 5. Dashboard

### Header

- Workspace switcher.
- Search.
- Credit usage.
- Notifications.
- User menu.

### Main content

- Primary CTA: New product.
- Recent projects.
- Status chips.
- Filters.
- Usage summary.
- Failed jobs needing action.
- Quick templates.

Project card:

- thumbnail;
- generated title or source title;
- platform;
- target country;
- status;
- last updated;
- warnings;
- quick actions.

## 6. New project wizard

### Step 1 — Source

- Large URL input.
- Supported-source logos/text.
- Paste detection.
- “Use manual product data” alternative.
- Privacy/permission note.

### Step 2 — Extracted product

Two-column:

- left: selected media;
- right: title, source, variants, cost, attributes.

Actions:

- select variant;
- choose target country;
- request shipping quote;
- correct missing facts;
- flag incorrect extraction.

Show evidence badges:

- API
- Page data
- User corrected
- Inferred
- Missing

### Step 3 — Strategy

Inputs:

- category;
- target audience;
- main problem;
- primary outcome;
- tone;
- brand profile;
- language;
- template;
- price assumptions;
- prohibited claims.

Use defaults and progressive disclosure.

### Step 4 — Generate

Visible stage timeline:

```text
Analyzing product
Checking claims
Calculating price
Planning sections
Writing content
Validating facts
Preparing preview
```

Never show a fake percentage if exact progress is unknown. Use stage-based progress.

### Step 5 — Workspace

Open editor.

## 7. Editor workspace

Desktop: three panes.

### Left pane — source and media

Tabs:

- Facts
- Variants
- Media
- Warnings

Features:

- source evidence;
- corrections;
- drag media order;
- select/deselect;
- missing-field prompts.

### Center pane — content

Tabs:

- Visual editor
- HTML
- Preview

Features:

- inline text editing;
- section cards;
- drag reorder;
- add/remove allowed sections;
- desktop/mobile preview;
- image placement;
- autosave status;
- undo/redo.

### Right pane — controls

Tabs:

- Generate
- SEO
- Pricing
- Compliance
- Export

Controls:

- tone;
- length;
- audience;
- regenerate selected section;
- title candidate selector;
- SEO fields;
- price calculator;
- warning resolution;
- copy/export.

On smaller screens, panes become drawers/tabs.

## 8. Evidence UX

Every important claim can show:

- green: source-supported;
- blue: user-provided;
- amber: inferred or needs review;
- red: unsupported/high-risk.

Clicking opens:

- claim;
- source fact;
- source location;
- confidence;
- edit/remove action.

This is a key product differentiator.

## 9. Pricing UX

Display:

- base cost;
- shipping;
- landed cost;
- low/recommended/high;
- gross margin;
- break-even ROAS;
- assumptions.

Provide sliders/inputs but always show exact numbers.

Warnings:

- shipping unavailable;
- variant costs differ significantly;
- suggested range may be too low for fees;
- compare-at price is not automatically generated without a real pricing basis.

## 10. Media UX

Grid cards include:

- thumbnail;
- dimensions;
- source;
- license/provenance status;
- duplicate warning;
- selected status;
- product/variant label.

Actions:

- select;
- reorder;
- crop;
- upload replacement;
- generate alt text;
- remove from project.

Do not hotlink final exported images by default. Explain that merchant must have rights to use them.

## 11. Empty, loading, and failure states

### Unsupported URL

- State reason.
- Offer manual import.
- Allow request for a new source integration.

### Blocked page/CAPTCHA

- Do not attempt bypass.
- Ask user for supplier API credentials, exported data, or manual fields.

### Missing shipping

- Allow manual shipping entry.
- Mark price recommendation as incomplete.

### AI failure

- Preserve extracted source.
- Do not consume generation credit unless successful.
- Retry or switch model.

### Partial output

- Show completed sections.
- Mark failed sections.
- Allow targeted retry.

## 12. Accessibility

- WCAG-oriented color contrast.
- Keyboard navigation.
- Visible focus states.
- Proper labels.
- Semantic headings.
- Dialog focus trapping.
- Alt text.
- Reduced motion option.
- Errors connected to form controls.
- Do not rely only on color for evidence status.

## 13. Design system tokens

```text
Radius: medium
Spacing: 4px base grid
Content width: 1200–1440px dashboard
Editor center width: responsive 720–900px
Typography: clean sans-serif
Body: 14–16px
Primary CTA: one accent color
Status colors: semantic and accessible
```

## 14. UX copy principles

- Say “Generate draft,” not “Create winning product.”
- Say “Suggested price,” not “Guaranteed profitable price.”
- Say “Source-supported,” not “100% accurate.”
- Say “Needs review,” not “AI error.”
- Explain missing data and next action.
- Avoid fake urgency anywhere in the SaaS.

## 15. Competitive differentiation to make visible

- Multiple fulfillment sources.
- Source facts and provenance.
- Claim-risk guard.
- Landed-cost pricing calculator.
- Modular editor.
- SEO/AIEO output.
- Provider-agnostic AI.
- No fake reviews.
- Exportable structured JSON, not only visual page output.
