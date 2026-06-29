create extension if not exists "pgcrypto";

create table if not exists workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  owner_user_id uuid not null,
  plan_code text not null default 'trial',
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists workspace_members (
  workspace_id uuid not null references workspaces(id) on delete cascade,
  user_id uuid not null,
  role text not null default 'owner',
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  name text not null,
  source_url text not null,
  canonical_source_url text,
  source_platform text,
  target_country text not null default 'US',
  target_language text not null default 'en',
  currency text not null default 'USD',
  status text not null default 'draft',
  active_version_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists source_snapshots (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  adapter_version text not null,
  method text not null,
  content_hash text not null,
  redacted_payload jsonb not null,
  warnings jsonb not null default '[]'::jsonb,
  confidence_score numeric not null,
  extracted_at timestamptz not null default now()
);

create table if not exists generated_versions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  version_number integer not null,
  structured_content_json jsonb not null,
  sanitized_html text not null,
  seo_json jsonb not null,
  compliance_report_json jsonb not null,
  manually_edited boolean not null default false,
  created_by_user_id uuid,
  created_at timestamptz not null default now()
);

create table if not exists usage_ledger (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  event_type text not null,
  project_id uuid references projects(id) on delete set null,
  credits_delta numeric not null,
  idempotency_key text not null unique,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
