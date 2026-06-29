# 03 — Data Model and API

## 1. Core database entities

All user-owned tables include:

- `id` UUID;
- `workspace_id` UUID;
- `created_at`;
- `updated_at`;
- optional `deleted_at`;
- RLS policy keyed to workspace membership.

## 2. Tables

### `profiles`

- `user_id`
- `display_name`
- `locale`
- `timezone`
- `default_currency`
- `onboarding_completed`

### `workspaces`

- `name`
- `slug`
- `owner_user_id`
- `plan_code`
- `status`

### `workspace_members`

- `workspace_id`
- `user_id`
- `role`: owner/admin/editor/viewer

### `brand_profiles`

- `workspace_id`
- `name`
- `store_name`
- `default_language`
- `target_markets`
- `tone`
- `preferred_phrases`
- `prohibited_phrases`
- `shipping_copy`
- `returns_copy`
- `guarantee_copy`
- `brand_colors`
- `logo_asset_id`

### `projects`

- `workspace_id`
- `name`
- `source_url`
- `canonical_source_url`
- `source_platform`
- `source_product_id`
- `target_country`
- `target_language`
- `currency`
- `category`
- `status`
- `selected_variant_id`
- `brand_profile_id`
- `active_version_id`

Statuses:

- draft
- extracting
- source_ready
- generating
- ready
- failed
- archived

### `source_snapshots`

- `project_id`
- `adapter_version`
- `method`: api/http/browser/manual
- `content_hash`
- `redacted_payload`
- `http_status`
- `extracted_at`
- `warnings`
- `confidence_score`

Never store supplier authentication cookies or unnecessary personal data.

### `source_products`

- `project_id`
- `source_title`
- `source_description_text`
- `currency`
- `min_item_cost`
- `max_item_cost`
- `attributes_json`
- `package_contents_json`
- `instructions_json`
- `facts_json`
- `completeness_score`

### `source_variants`

- `source_product_id`
- `source_variant_id`
- `sku`
- `title`
- `options_json`
- `item_cost`
- `currency`
- `inventory_status`
- `image_asset_id`
- `is_selected`

### `shipping_quotes`

- `project_id`
- `source_variant_id`
- `destination_country`
- `method_name`
- `shipping_cost`
- `currency`
- `estimated_min_days`
- `estimated_max_days`
- `tracked`
- `quoted_at`
- `expires_at`
- `source`
- `confidence`

### `media_assets`

- `workspace_id`
- `project_id`
- `source_type`: supplier/user/generated/licensed
- `source_url`
- `storage_path`
- `mime_type`
- `width`
- `height`
- `bytes`
- `sha256`
- `perceptual_hash`
- `license_status`
- `provenance_json`
- `selected`
- `sort_order`
- `alt_text`
- `safety_status`

### `pricing_scenarios`

- `project_id`
- `source_variant_id`
- `item_cost`
- `shipping_cost`
- `handling_cost`
- `payment_fee_pct`
- `payment_fee_fixed`
- `refund_reserve_pct`
- `ad_cost_pct`
- `target_net_margin_pct`
- `low_price`
- `recommended_price`
- `high_price`
- `break_even_roas`
- `rounding_style`
- `assumptions_json`

### `generation_runs`

- `project_id`
- `prompt_version_id`
- `model_provider`
- `model_name`
- `status`
- `input_hash`
- `input_tokens`
- `output_tokens`
- `estimated_cost`
- `started_at`
- `completed_at`
- `error_code`
- `error_summary`
- `compliance_score`
- `factuality_score`

### `generated_versions`

- `project_id`
- `generation_run_id`
- `version_number`
- `structured_content_json`
- `sanitized_html`
- `seo_json`
- `schema_json_ld`
- `compliance_report_json`
- `manually_edited`
- `created_by_user_id`

### `section_locks`

- `generated_version_id`
- `section_key`
- `locked`
- `locked_by_user_id`

### `prompt_versions`

- `key`
- `version`
- `system_prompt`
- `schema_version`
- `active`
- `notes`

### `exports`

- `project_id`
- `generated_version_id`
- `format`
- `status`
- `storage_path`
- `created_by_user_id`

### `subscriptions`

- `workspace_id`
- `provider`
- `provider_customer_id`
- `provider_subscription_id`
- `plan_code`
- `status`
- `current_period_end`

### `usage_ledger`

Append-only:

- `workspace_id`
- `event_type`
- `project_id`
- `generation_run_id`
- `credits_delta`
- `provider_cost`
- `idempotency_key`
- `metadata_json`

### `audit_logs`

- `workspace_id`
- `actor_user_id`
- `action`
- `resource_type`
- `resource_id`
- `metadata_json`
- `ip_hash`
- `user_agent_hash`

## 3. API conventions

- JSON only except file downloads.
- Zod validation for every body/query/response.
- Auth required except health and public marketing endpoints.
- Workspace authorization checked server-side.
- Idempotency key for job creation, billing, and exports.
- Structured error format:

```json
{
  "error": {
    "code": "SOURCE_UNSUPPORTED",
    "message": "This source is not supported.",
    "details": {},
    "requestId": "..."
  }
}
```

## 4. MVP endpoints

### Auth

Primarily Supabase Auth SDK.

### Projects

```text
GET    /api/projects
POST   /api/projects
GET    /api/projects/:projectId
PATCH  /api/projects/:projectId
DELETE /api/projects/:projectId
POST   /api/projects/:projectId/duplicate
```

### Extraction

```text
POST /api/projects/:projectId/extract
GET  /api/projects/:projectId/source
POST /api/projects/:projectId/retry-extraction
POST /api/projects/:projectId/shipping-quotes
PATCH /api/projects/:projectId/source-corrections
```

`source-corrections` permits the user to correct facts without altering the immutable snapshot.

### Media

```text
GET    /api/projects/:projectId/media
PATCH  /api/projects/:projectId/media/:assetId
POST   /api/projects/:projectId/media/upload
POST   /api/projects/:projectId/media/reorder
DELETE /api/projects/:projectId/media/:assetId
```

### Pricing

```text
POST /api/projects/:projectId/pricing/calculate
GET  /api/projects/:projectId/pricing
```

### Generation

```text
POST /api/projects/:projectId/generate
POST /api/projects/:projectId/regenerate-section
GET  /api/projects/:projectId/generation-runs
GET  /api/projects/:projectId/versions
POST /api/projects/:projectId/versions/:versionId/activate
PATCH /api/projects/:projectId/versions/:versionId
```

### Export

```text
POST /api/projects/:projectId/export/html
POST /api/projects/:projectId/export/json
POST /api/projects/:projectId/export/csv
GET  /api/exports/:exportId
```

### Brand profiles

```text
GET    /api/brand-profiles
POST   /api/brand-profiles
PATCH  /api/brand-profiles/:id
DELETE /api/brand-profiles/:id
```

### Billing

```text
GET  /api/billing/usage
POST /api/billing/checkout
POST /api/billing/portal
POST /api/webhooks/stripe
```

## 5. Job progress API

Use Server-Sent Events, Realtime, or polling.

Canonical progress event:

```json
{
  "projectId": "uuid",
  "jobId": "uuid",
  "stage": "extracting_media",
  "progress": 46,
  "message": "Inspecting product images",
  "recoverable": true,
  "timestamp": "ISO-8601"
}
```

The UI must work with polling even if realtime is unavailable.

## 6. Caching

- Cache normalized source products by canonical URL + target country + source revision hash.
- Do not share private supplier credentials across workspaces.
- Reuse public extraction only when licensing and freshness rules allow.
- Shipping quotes expire.
- AI content remains workspace-private.
- Media cache keeps provenance and deletion rules.

## 7. Data retention

- Raw/redacted snapshot: configurable retention.
- Failed temporary media: delete quickly.
- User project data: until user deletes or account retention expires.
- Audit and billing records: retain as legally required.
- Account deletion job removes or anonymizes user content.
