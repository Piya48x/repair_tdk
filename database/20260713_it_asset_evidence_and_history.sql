-- IT asset evidence photos and update history.
-- Safe to run multiple times.

create extension if not exists "uuid-ossp";

create table if not exists public.it_asset_attachments (
  id uuid primary key default uuid_generate_v4(),
  asset_id uuid not null references public.it_assets(id) on delete cascade,
  file_name text not null,
  file_path text not null unique,
  file_url text not null,
  mime_type text,
  file_size bigint not null default 0,
  uploaded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.it_asset_activity_logs (
  id uuid primary key default uuid_generate_v4(),
  asset_id uuid not null references public.it_assets(id) on delete cascade,
  action text not null default 'updated',
  summary text,
  changes jsonb not null default '{}'::jsonb,
  snapshot jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_by_name text,
  created_at timestamptz not null default timezone('utc', now()),
  constraint it_asset_activity_logs_action_check
    check (action in ('created', 'updated', 'archived', 'evidence', 'deleted'))
);

alter table if exists public.it_asset_attachments
  add column if not exists asset_id uuid,
  add column if not exists file_name text,
  add column if not exists file_path text,
  add column if not exists file_url text,
  add column if not exists mime_type text,
  add column if not exists file_size bigint,
  add column if not exists uploaded_by uuid,
  add column if not exists created_at timestamptz;

alter table if exists public.it_asset_activity_logs
  add column if not exists asset_id uuid,
  add column if not exists action text,
  add column if not exists summary text,
  add column if not exists changes jsonb,
  add column if not exists snapshot jsonb,
  add column if not exists created_by uuid,
  add column if not exists created_by_name text,
  add column if not exists created_at timestamptz;

alter table if exists public.it_asset_attachments
  alter column file_size set default 0,
  alter column created_at set default timezone('utc', now());

alter table if exists public.it_asset_activity_logs
  alter column action set default 'updated',
  alter column changes set default '{}'::jsonb,
  alter column snapshot set default '{}'::jsonb,
  alter column created_at set default timezone('utc', now());

create index if not exists it_asset_attachments_asset_idx
  on public.it_asset_attachments (asset_id, created_at desc);

create index if not exists it_asset_activity_logs_asset_idx
  on public.it_asset_activity_logs (asset_id, created_at desc);

create index if not exists it_asset_activity_logs_created_idx
  on public.it_asset_activity_logs (created_at desc);

grant select, insert, update, delete on public.it_asset_attachments to authenticated;
grant select, insert, update, delete on public.it_asset_activity_logs to authenticated;

alter table if exists public.it_asset_attachments enable row level security;
alter table if exists public.it_asset_activity_logs enable row level security;

drop policy if exists "Internal roles can view IT asset attachments" on public.it_asset_attachments;
create policy "Internal roles can view IT asset attachments"
  on public.it_asset_attachments
  for select
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and lower(p.role::text) in ('it_support', 'admin', 'it_manager', 'executive', 'auditor')
    )
  );

drop policy if exists "IT can manage IT asset attachments" on public.it_asset_attachments;
create policy "IT can manage IT asset attachments"
  on public.it_asset_attachments
  for all
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and lower(p.role::text) in ('it_support', 'admin', 'it_manager')
    )
  )
  with check (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and lower(p.role::text) in ('it_support', 'admin', 'it_manager')
    )
  );

drop policy if exists "Internal roles can view IT asset activity logs" on public.it_asset_activity_logs;
create policy "Internal roles can view IT asset activity logs"
  on public.it_asset_activity_logs
  for select
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and lower(p.role::text) in ('it_support', 'admin', 'it_manager', 'executive', 'auditor')
    )
  );

drop policy if exists "IT can manage IT asset activity logs" on public.it_asset_activity_logs;
create policy "IT can manage IT asset activity logs"
  on public.it_asset_activity_logs
  for all
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and lower(p.role::text) in ('it_support', 'admin', 'it_manager')
    )
  )
  with check (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and lower(p.role::text) in ('it_support', 'admin', 'it_manager')
    )
  );

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'it-asset-evidence',
  'it-asset-evidence',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists it_asset_evidence_select_policy on storage.objects;
create policy it_asset_evidence_select_policy
  on storage.objects
  for select
  to public
  using (bucket_id = 'it-asset-evidence');

drop policy if exists it_asset_evidence_insert_policy on storage.objects;
create policy it_asset_evidence_insert_policy
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'it-asset-evidence'
    and coalesce((storage.foldername(name))[1], '') = 'assets'
    and exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and lower(p.role::text) in ('it_support', 'admin', 'it_manager')
    )
  );

drop policy if exists it_asset_evidence_update_policy on storage.objects;
create policy it_asset_evidence_update_policy
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'it-asset-evidence'
    and exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and lower(p.role::text) in ('it_support', 'admin', 'it_manager')
    )
  )
  with check (
    bucket_id = 'it-asset-evidence'
    and exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and lower(p.role::text) in ('it_support', 'admin', 'it_manager')
    )
  );

drop policy if exists it_asset_evidence_delete_policy on storage.objects;
create policy it_asset_evidence_delete_policy
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'it-asset-evidence'
    and exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and lower(p.role::text) in ('it_support', 'admin', 'it_manager')
    )
  );

notify pgrst, 'reload schema';
