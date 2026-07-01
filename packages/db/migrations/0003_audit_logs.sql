create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  actor_user_id uuid,
  action text not null,
  resource_type text not null,
  resource_id uuid,
  metadata_json jsonb not null default '{}'::jsonb,
  ip_hash text,
  user_agent_hash text,
  created_at timestamptz not null default now()
);

alter table audit_logs enable row level security;

create policy "members can read audit logs" on audit_logs
  for select using (exists (
    select 1 from workspace_members wm
    where wm.workspace_id = audit_logs.workspace_id and wm.user_id = auth.uid()
  ));
