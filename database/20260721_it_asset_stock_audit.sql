-- Annual IT asset stock audit sessions, item snapshots, evidence, and review flow.
-- Safe to run multiple times after 20260315_reports_schema.sql and
-- 20260713_it_asset_evidence_and_history.sql.

create extension if not exists "uuid-ossp";

create table if not exists public.it_asset_audit_sessions (
  id uuid primary key default uuid_generate_v4(),
  audit_code text not null unique,
  name text not null,
  audit_year integer not null,
  status text not null default 'in_progress',
  scope_location text,
  asset_categories text[] not null default '{}'::text[],
  notes text,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_by_name text,
  started_at timestamptz not null default timezone('utc', now()),
  completed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint it_asset_audit_sessions_year_check
    check (audit_year between 2000 and 2200),
  constraint it_asset_audit_sessions_status_check
    check (status in ('draft', 'in_progress', 'completed', 'cancelled'))
);

create table if not exists public.it_asset_audit_items (
  id uuid primary key default uuid_generate_v4(),
  audit_session_id uuid not null references public.it_asset_audit_sessions(id) on delete cascade,
  asset_id uuid references public.it_assets(id) on delete set null,
  asset_tag_snapshot text not null,
  asset_name_snapshot text not null,
  asset_category_snapshot text,
  serial_number_snapshot text,
  status_snapshot text,
  location_snapshot text,
  owner_name_snapshot text,
  asset_snapshot jsonb not null default '{}'::jsonb,
  result_status text not null default 'pending',
  found_location text,
  found_owner_name text,
  found_serial_number text,
  condition_notes text,
  proposed_changes jsonb not null default '{}'::jsonb,
  review_status text not null default 'not_required',
  audited_by uuid references auth.users(id) on delete set null,
  audited_by_name text,
  audited_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_by_name text,
  reviewed_at timestamptz,
  review_notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint it_asset_audit_items_result_check
    check (result_status in ('pending', 'verified', 'mismatch', 'not_found', 'damaged', 'unregistered')),
  constraint it_asset_audit_items_review_check
    check (review_status in ('not_required', 'pending', 'approved', 'rejected')),
  constraint it_asset_audit_items_session_tag_unique
    unique (audit_session_id, asset_tag_snapshot)
);

create table if not exists public.it_asset_audit_attachments (
  id uuid primary key default uuid_generate_v4(),
  audit_item_id uuid not null references public.it_asset_audit_items(id) on delete cascade,
  file_name text not null,
  file_path text not null unique,
  file_url text not null,
  mime_type text,
  file_size bigint not null default 0,
  uploaded_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists it_asset_audit_sessions_year_idx
  on public.it_asset_audit_sessions (audit_year desc, created_at desc);

create index if not exists it_asset_audit_sessions_status_idx
  on public.it_asset_audit_sessions (status, created_at desc);

create index if not exists it_asset_audit_items_session_idx
  on public.it_asset_audit_items (audit_session_id, result_status, updated_at desc);

create index if not exists it_asset_audit_items_asset_idx
  on public.it_asset_audit_items (asset_id, created_at desc);

create index if not exists it_asset_audit_items_tag_idx
  on public.it_asset_audit_items (lower(asset_tag_snapshot));

create index if not exists it_asset_audit_attachments_item_idx
  on public.it_asset_audit_attachments (audit_item_id, created_at desc);

create or replace function public.set_it_asset_audit_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists trg_it_asset_audit_sessions_updated_at on public.it_asset_audit_sessions;
create trigger trg_it_asset_audit_sessions_updated_at
before update on public.it_asset_audit_sessions
for each row execute function public.set_it_asset_audit_updated_at();

drop trigger if exists trg_it_asset_audit_items_updated_at on public.it_asset_audit_items;
create trigger trg_it_asset_audit_items_updated_at
before update on public.it_asset_audit_items
for each row execute function public.set_it_asset_audit_updated_at();

grant select, insert, update, delete on public.it_asset_audit_sessions to authenticated;
grant select, insert, update, delete on public.it_asset_audit_items to authenticated;
grant select, insert, update, delete on public.it_asset_audit_attachments to authenticated;

alter table public.it_asset_audit_sessions enable row level security;
alter table public.it_asset_audit_items enable row level security;
alter table public.it_asset_audit_attachments enable row level security;

drop policy if exists "Internal roles can view IT asset audit sessions" on public.it_asset_audit_sessions;
create policy "Internal roles can view IT asset audit sessions"
  on public.it_asset_audit_sessions
  for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and lower(p.role::text) in ('it_support', 'admin', 'it_manager', 'executive', 'auditor')
    )
  );

drop policy if exists "IT can manage IT asset audit sessions" on public.it_asset_audit_sessions;
create policy "IT can manage IT asset audit sessions"
  on public.it_asset_audit_sessions
  for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and lower(p.role::text) in ('it_support', 'admin', 'it_manager')
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and lower(p.role::text) in ('it_support', 'admin', 'it_manager')
    )
  );

drop policy if exists "Internal roles can view IT asset audit items" on public.it_asset_audit_items;
create policy "Internal roles can view IT asset audit items"
  on public.it_asset_audit_items
  for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and lower(p.role::text) in ('it_support', 'admin', 'it_manager', 'executive', 'auditor')
    )
  );

drop policy if exists "IT can manage IT asset audit items" on public.it_asset_audit_items;
create policy "IT can manage IT asset audit items"
  on public.it_asset_audit_items
  for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and lower(p.role::text) in ('it_support', 'admin', 'it_manager')
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and lower(p.role::text) in ('it_support', 'admin', 'it_manager')
    )
  );

drop policy if exists "Internal roles can view IT asset audit attachments" on public.it_asset_audit_attachments;
create policy "Internal roles can view IT asset audit attachments"
  on public.it_asset_audit_attachments
  for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and lower(p.role::text) in ('it_support', 'admin', 'it_manager', 'executive', 'auditor')
    )
  );

drop policy if exists "IT can manage IT asset audit attachments" on public.it_asset_audit_attachments;
create policy "IT can manage IT asset audit attachments"
  on public.it_asset_audit_attachments
  for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and lower(p.role::text) in ('it_support', 'admin', 'it_manager')
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and lower(p.role::text) in ('it_support', 'admin', 'it_manager')
    )
  );

-- Managers can approve or reject a discrepancy. Approved field proposals are
-- applied to the master asset and also written to the existing activity log.
create or replace function public.review_it_asset_audit_item(
  p_item_id uuid,
  p_approved boolean,
  p_reviewer_name text default null,
  p_review_notes text default null
)
returns public.it_asset_audit_items
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_user_id uuid := auth.uid();
  v_item public.it_asset_audit_items;
  v_session public.it_asset_audit_sessions;
  v_before public.it_assets;
  v_after public.it_assets;
  v_changes jsonb;
begin
  select lower(p.role::text) into v_role
  from public.profiles p
  where p.id = v_user_id;

  if coalesce(v_role, '') not in ('admin', 'it_manager') then
    raise exception 'Only admin or IT manager can review stock audit discrepancies';
  end if;

  select * into v_item
  from public.it_asset_audit_items
  where id = p_item_id
  for update;

  if not found then
    raise exception 'Audit item not found';
  end if;

  select * into v_session
  from public.it_asset_audit_sessions
  where id = v_item.audit_session_id;

  v_changes := coalesce(v_item.proposed_changes, '{}'::jsonb);

  if p_approved and v_item.asset_id is not null and v_changes <> '{}'::jsonb then
    select * into v_before from public.it_assets where id = v_item.asset_id;

    update public.it_assets a
    set
      location = case when v_changes ? 'location' then nullif(btrim(v_changes ->> 'location'), '') else a.location end,
      owner_name = case when v_changes ? 'owner_name' then nullif(btrim(v_changes ->> 'owner_name'), '') else a.owner_name end,
      serial_number = case when v_changes ? 'serial_number' then nullif(btrim(v_changes ->> 'serial_number'), '') else a.serial_number end,
      status = case when v_changes ? 'status' then coalesce(nullif(btrim(v_changes ->> 'status'), ''), a.status) else a.status end
    where a.id = v_item.asset_id
    returning * into v_after;

    begin
      insert into public.it_asset_activity_logs (
        asset_id,
        action,
        summary,
        changes,
        snapshot,
        created_by,
        created_by_name
      ) values (
        v_item.asset_id,
        'updated',
        'Approved changes from ' || coalesce(v_session.name, v_session.audit_code, 'stock audit'),
        jsonb_build_object(
          'source', 'stock_audit',
          'audit_session_id', v_item.audit_session_id,
          'audit_item_id', v_item.id,
          'before', to_jsonb(v_before),
          'proposed_changes', v_changes
        ),
        to_jsonb(v_after),
        v_user_id,
        p_reviewer_name
      );
    exception
      when undefined_table then null;
    end;
  end if;

  update public.it_asset_audit_items
  set
    review_status = case when p_approved then 'approved' else 'rejected' end,
    reviewed_by = v_user_id,
    reviewed_by_name = p_reviewer_name,
    reviewed_at = timezone('utc', now()),
    review_notes = p_review_notes
  where id = p_item_id
  returning * into v_item;

  return v_item;
end;
$$;

revoke all on function public.review_it_asset_audit_item(uuid, boolean, text, text) from public;
grant execute on function public.review_it_asset_audit_item(uuid, boolean, text, text) to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'it-asset-audit-evidence',
  'it-asset-audit-evidence',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists it_asset_audit_evidence_select_policy on storage.objects;
create policy it_asset_audit_evidence_select_policy
  on storage.objects
  for select
  to public
  using (bucket_id = 'it-asset-audit-evidence');

drop policy if exists it_asset_audit_evidence_insert_policy on storage.objects;
create policy it_asset_audit_evidence_insert_policy
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'it-asset-audit-evidence'
    and coalesce((storage.foldername(name))[1], '') = 'audits'
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and lower(p.role::text) in ('it_support', 'admin', 'it_manager')
    )
  );

drop policy if exists it_asset_audit_evidence_update_policy on storage.objects;
create policy it_asset_audit_evidence_update_policy
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'it-asset-audit-evidence'
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and lower(p.role::text) in ('it_support', 'admin', 'it_manager')
    )
  )
  with check (
    bucket_id = 'it-asset-audit-evidence'
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and lower(p.role::text) in ('it_support', 'admin', 'it_manager')
    )
  );

drop policy if exists it_asset_audit_evidence_delete_policy on storage.objects;
create policy it_asset_audit_evidence_delete_policy
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'it-asset-audit-evidence'
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and lower(p.role::text) in ('it_support', 'admin', 'it_manager')
    )
  );

notify pgrst, 'reload schema';
