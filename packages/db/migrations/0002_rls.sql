alter table workspaces enable row level security;
alter table workspace_members enable row level security;
alter table projects enable row level security;
alter table source_snapshots enable row level security;
alter table generated_versions enable row level security;
alter table usage_ledger enable row level security;

create policy "workspace members can read workspaces" on workspaces
  for select using (exists (
    select 1 from workspace_members wm
    where wm.workspace_id = id and wm.user_id = auth.uid()
  ));

create policy "members can read memberships" on workspace_members
  for select using (user_id = auth.uid() or exists (
    select 1 from workspace_members wm
    where wm.workspace_id = workspace_id and wm.user_id = auth.uid()
  ));

create policy "members can read projects" on projects
  for select using (exists (
    select 1 from workspace_members wm
    where wm.workspace_id = projects.workspace_id and wm.user_id = auth.uid()
  ));

create policy "members can manage projects" on projects
  for all using (exists (
    select 1 from workspace_members wm
    where wm.workspace_id = projects.workspace_id and wm.user_id = auth.uid() and wm.role in ('owner', 'admin', 'editor')
  ));

create policy "members can read snapshots" on source_snapshots
  for select using (exists (
    select 1 from projects p join workspace_members wm on wm.workspace_id = p.workspace_id
    where p.id = source_snapshots.project_id and wm.user_id = auth.uid()
  ));

create policy "members can read generated versions" on generated_versions
  for select using (exists (
    select 1 from projects p join workspace_members wm on wm.workspace_id = p.workspace_id
    where p.id = generated_versions.project_id and wm.user_id = auth.uid()
  ));

create policy "members can read usage ledger" on usage_ledger
  for select using (exists (
    select 1 from workspace_members wm
    where wm.workspace_id = usage_ledger.workspace_id and wm.user_id = auth.uid()
  ));
