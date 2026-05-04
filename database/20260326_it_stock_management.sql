-- IT stock management tables for admin dashboard.
-- Safe to run multiple times.

create extension if not exists "uuid-ossp";

create table if not exists public.it_stock_items (
  id uuid primary key default uuid_generate_v4(),
  stock_code text not null unique,
  item_name text not null,
  item_category text not null default 'General',
  category_th text,
  category_en text,
  item_prefix text,
  reference_item_code text,
  description_th text,
  description_en text,
  brand text,
  model text,
  unit text not null default 'ชิ้น',
  quantity_on_hand integer not null default 0,
  minimum_quantity integer not null default 0,
  location text,
  source_ref text,
  lot_number text,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint it_stock_items_quantity_check
    check (quantity_on_hand >= 0 and minimum_quantity >= 0)
);

create table if not exists public.it_stock_item_attachments (
  id uuid primary key default uuid_generate_v4(),
  stock_item_id uuid not null references public.it_stock_items(id) on delete cascade,
  file_name text not null,
  file_path text not null unique,
  file_url text not null,
  mime_type text,
  file_size bigint not null default 0,
  uploaded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.it_stock_issue_logs (
  id uuid primary key default uuid_generate_v4(),
  stock_item_id uuid not null references public.it_stock_items(id) on delete restrict,
  quantity integer not null,
  requester_profile_id uuid references public.profiles(id) on delete set null,
  requester_name text not null,
  requester_emp_id text,
  requester_department text,
  purpose text,
  notes text,
  channel text not null default 'walk-in',
  stock_code_snapshot text not null,
  item_name_snapshot text not null,
  unit_snapshot text,
  issued_by uuid references auth.users(id) on delete set null,
  issued_by_name text,
  issued_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  constraint it_stock_issue_logs_quantity_check
    check (quantity > 0)
);

create table if not exists public.it_stock_issue_attachments (
  id uuid primary key default uuid_generate_v4(),
  issue_log_id uuid not null references public.it_stock_issue_logs(id) on delete cascade,
  file_name text not null,
  file_path text not null unique,
  file_url text not null,
  mime_type text,
  file_size bigint not null default 0,
  uploaded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now())
);

alter table if exists public.it_stock_items
  add column if not exists stock_code text,
  add column if not exists item_name text,
  add column if not exists item_category text,
  add column if not exists category_th text,
  add column if not exists category_en text,
  add column if not exists item_prefix text,
  add column if not exists reference_item_code text,
  add column if not exists description_th text,
  add column if not exists description_en text,
  add column if not exists brand text,
  add column if not exists model text,
  add column if not exists unit text,
  add column if not exists quantity_on_hand integer,
  add column if not exists minimum_quantity integer,
  add column if not exists location text,
  add column if not exists source_ref text,
  add column if not exists lot_number text,
  add column if not exists notes text,
  add column if not exists created_by uuid,
  add column if not exists created_at timestamptz,
  add column if not exists updated_at timestamptz;

alter table if exists public.it_stock_item_attachments
  add column if not exists stock_item_id uuid,
  add column if not exists file_name text,
  add column if not exists file_path text,
  add column if not exists file_url text,
  add column if not exists mime_type text,
  add column if not exists file_size bigint,
  add column if not exists uploaded_by uuid,
  add column if not exists created_at timestamptz;

alter table if exists public.it_stock_issue_logs
  add column if not exists stock_item_id uuid,
  add column if not exists quantity integer,
  add column if not exists requester_profile_id uuid,
  add column if not exists requester_name text,
  add column if not exists requester_emp_id text,
  add column if not exists requester_department text,
  add column if not exists purpose text,
  add column if not exists notes text,
  add column if not exists channel text,
  add column if not exists stock_code_snapshot text,
  add column if not exists item_name_snapshot text,
  add column if not exists unit_snapshot text,
  add column if not exists issued_by uuid,
  add column if not exists issued_by_name text,
  add column if not exists issued_at timestamptz,
  add column if not exists created_at timestamptz;

alter table if exists public.it_stock_issue_attachments
  add column if not exists issue_log_id uuid,
  add column if not exists file_name text,
  add column if not exists file_path text,
  add column if not exists file_url text,
  add column if not exists mime_type text,
  add column if not exists file_size bigint,
  add column if not exists uploaded_by uuid,
  add column if not exists created_at timestamptz;

alter table if exists public.it_stock_items
  alter column item_category set default 'General',
  alter column unit set default 'ชิ้น',
  alter column quantity_on_hand set default 0,
  alter column minimum_quantity set default 0,
  alter column created_by set default auth.uid(),
  alter column created_at set default timezone('utc', now()),
  alter column updated_at set default timezone('utc', now());

alter table if exists public.it_stock_item_attachments
  alter column file_size set default 0,
  alter column created_at set default timezone('utc', now());

alter table if exists public.it_stock_issue_logs
  alter column channel set default 'walk-in',
  alter column issued_by set default auth.uid(),
  alter column issued_at set default timezone('utc', now()),
  alter column created_at set default timezone('utc', now());

alter table if exists public.it_stock_issue_attachments
  alter column file_size set default 0,
  alter column created_at set default timezone('utc', now());

create index if not exists it_stock_items_stock_code_idx on public.it_stock_items (stock_code);
create index if not exists it_stock_items_category_idx on public.it_stock_items (item_category);
create index if not exists it_stock_items_reference_item_code_idx on public.it_stock_items (reference_item_code);
create index if not exists it_stock_items_item_prefix_idx on public.it_stock_items (item_prefix);
create index if not exists it_stock_items_lot_number_idx on public.it_stock_items (lot_number);
create index if not exists it_stock_items_quantity_idx on public.it_stock_items (quantity_on_hand);
create index if not exists it_stock_item_attachments_stock_item_idx on public.it_stock_item_attachments (stock_item_id);
create index if not exists it_stock_issue_logs_stock_item_idx on public.it_stock_issue_logs (stock_item_id);
create index if not exists it_stock_issue_logs_issued_at_idx on public.it_stock_issue_logs (issued_at desc);
create index if not exists it_stock_issue_logs_requester_emp_id_idx on public.it_stock_issue_logs (requester_emp_id);
create index if not exists it_stock_issue_attachments_issue_log_idx on public.it_stock_issue_attachments (issue_log_id);

create or replace function public.set_it_stock_items_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists trg_it_stock_items_updated_at on public.it_stock_items;
create trigger trg_it_stock_items_updated_at
before update on public.it_stock_items
for each row
execute function public.set_it_stock_items_updated_at();

grant select, insert, update, delete on public.it_stock_items to authenticated;
grant select, insert, update, delete on public.it_stock_item_attachments to authenticated;
grant select, insert, update, delete on public.it_stock_issue_logs to authenticated;
grant select, insert, update, delete on public.it_stock_issue_attachments to authenticated;

alter table if exists public.it_stock_items enable row level security;
alter table if exists public.it_stock_item_attachments enable row level security;
alter table if exists public.it_stock_issue_logs enable row level security;
alter table if exists public.it_stock_issue_attachments enable row level security;

drop policy if exists "Internal roles can view IT stock items" on public.it_stock_items;
create policy "Internal roles can view IT stock items"
  on public.it_stock_items
  for select
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role::text in ('it_support', 'admin', 'it_manager', 'executive', 'auditor')
    )
  );

drop policy if exists "IT can manage IT stock items" on public.it_stock_items;
create policy "IT can manage IT stock items"
  on public.it_stock_items
  for all
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role::text in ('it_support', 'admin', 'it_manager')
    )
  )
  with check (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role::text in ('it_support', 'admin', 'it_manager')
    )
  );

drop policy if exists "Internal roles can view IT stock item attachments" on public.it_stock_item_attachments;
create policy "Internal roles can view IT stock item attachments"
  on public.it_stock_item_attachments
  for select
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role::text in ('it_support', 'admin', 'it_manager', 'executive', 'auditor')
    )
  );

drop policy if exists "IT can manage IT stock item attachments" on public.it_stock_item_attachments;
create policy "IT can manage IT stock item attachments"
  on public.it_stock_item_attachments
  for all
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role::text in ('it_support', 'admin', 'it_manager')
    )
  )
  with check (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role::text in ('it_support', 'admin', 'it_manager')
    )
  );

drop policy if exists "Internal roles can view IT stock issue logs" on public.it_stock_issue_logs;
create policy "Internal roles can view IT stock issue logs"
  on public.it_stock_issue_logs
  for select
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role::text in ('it_support', 'admin', 'it_manager', 'executive', 'auditor')
    )
  );

drop policy if exists "IT can manage IT stock issue logs" on public.it_stock_issue_logs;
create policy "IT can manage IT stock issue logs"
  on public.it_stock_issue_logs
  for all
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role::text in ('it_support', 'admin', 'it_manager')
    )
  )
  with check (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role::text in ('it_support', 'admin', 'it_manager')
    )
  );

drop policy if exists "Internal roles can view IT stock issue attachments" on public.it_stock_issue_attachments;
create policy "Internal roles can view IT stock issue attachments"
  on public.it_stock_issue_attachments
  for select
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role::text in ('it_support', 'admin', 'it_manager', 'executive', 'auditor')
    )
  );

drop policy if exists "IT can manage IT stock issue attachments" on public.it_stock_issue_attachments;
create policy "IT can manage IT stock issue attachments"
  on public.it_stock_issue_attachments
  for all
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role::text in ('it_support', 'admin', 'it_manager')
    )
  )
  with check (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role::text in ('it_support', 'admin', 'it_manager')
    )
  );

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'it-stock-attachments',
  'it-stock-attachments',
  true,
  20971520,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif',
    'image/gif',
    'application/pdf',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'text/csv'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists it_stock_attachments_storage_select_policy on storage.objects;
create policy it_stock_attachments_storage_select_policy
  on storage.objects
  for select
  to public
  using (bucket_id = 'it-stock-attachments');

drop policy if exists it_stock_attachments_storage_insert_policy on storage.objects;
create policy it_stock_attachments_storage_insert_policy
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'it-stock-attachments'
    and coalesce((storage.foldername(name))[1], '') in ('items', 'issues')
  );

drop policy if exists it_stock_attachments_storage_update_policy on storage.objects;
create policy it_stock_attachments_storage_update_policy
  on storage.objects
  for update
  to authenticated
  using (bucket_id = 'it-stock-attachments' and owner = auth.uid())
  with check (bucket_id = 'it-stock-attachments' and owner = auth.uid());

drop policy if exists it_stock_attachments_storage_delete_policy on storage.objects;
create policy it_stock_attachments_storage_delete_policy
  on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'it-stock-attachments' and owner = auth.uid());

notify pgrst, 'reload schema';
