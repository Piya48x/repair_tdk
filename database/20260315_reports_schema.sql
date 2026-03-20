-- Reports schema for executive and IT manager dashboards.
-- Safe to run multiple times.

create extension if not exists "uuid-ossp";

-- Ensure new role values exist if profiles.role uses enum user_role.
do $$
begin
  if exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'user_role'
  ) then
    alter type public.user_role add value if not exists 'it_manager';
    alter type public.user_role add value if not exists 'executive';
  end if;
end;
$$;

create table if not exists public.it_assets (
  id uuid primary key default uuid_generate_v4(),
  asset_tag text not null unique,
  asset_name text not null,
  asset_category text not null default 'Other',
  brand text,
  model text,
  serial_number text,
  status text not null default 'in_use',
  location text,
  owner_name text,
  purchase_date date,
  warranty_end_date date,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint it_assets_status_check
    check (status in ('in_use', 'assigned', 'spare', 'available', 'broken', 'repair', 'retired', 'lost'))
);

create table if not exists public.it_licenses (
  id uuid primary key default uuid_generate_v4(),
  license_name text not null,
  vendor text,
  license_type text,
  status text not null default 'active',
  quantity_total integer not null default 1,
  quantity_assigned integer not null default 0,
  expiry_date date,
  renewal_date date,
  cost numeric(12,2),
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint it_licenses_status_check
    check (status in ('active', 'inactive', 'expired', 'pending_renewal')),
  constraint it_licenses_quantity_check
    check (quantity_total >= 0 and quantity_assigned >= 0 and quantity_assigned <= quantity_total)
);

alter table if exists public.it_assets
  add column if not exists asset_tag text,
  add column if not exists asset_name text,
  add column if not exists asset_category text,
  add column if not exists brand text,
  add column if not exists model text,
  add column if not exists serial_number text,
  add column if not exists status text,
  add column if not exists location text,
  add column if not exists owner_name text,
  add column if not exists purchase_date date,
  add column if not exists warranty_end_date date,
  add column if not exists notes text,
  add column if not exists created_by uuid,
  add column if not exists created_at timestamptz,
  add column if not exists updated_at timestamptz;

alter table if exists public.it_licenses
  add column if not exists license_name text,
  add column if not exists vendor text,
  add column if not exists license_type text,
  add column if not exists status text,
  add column if not exists quantity_total integer,
  add column if not exists quantity_assigned integer,
  add column if not exists expiry_date date,
  add column if not exists renewal_date date,
  add column if not exists cost numeric(12,2),
  add column if not exists notes text,
  add column if not exists created_by uuid,
  add column if not exists created_at timestamptz,
  add column if not exists updated_at timestamptz;

alter table if exists public.it_assets
  alter column created_by set default auth.uid(),
  alter column created_at set default timezone('utc', now()),
  alter column updated_at set default timezone('utc', now());

alter table if exists public.it_licenses
  alter column created_by set default auth.uid(),
  alter column created_at set default timezone('utc', now()),
  alter column updated_at set default timezone('utc', now());

create index if not exists it_assets_status_idx on public.it_assets (status);
create index if not exists it_assets_category_idx on public.it_assets (asset_category);
create index if not exists it_assets_purchase_date_idx on public.it_assets (purchase_date);

create index if not exists it_licenses_status_idx on public.it_licenses (status);
create index if not exists it_licenses_expiry_date_idx on public.it_licenses (expiry_date);
create index if not exists it_licenses_license_name_idx on public.it_licenses (license_name);

create or replace function public.set_it_assets_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists trg_it_assets_updated_at on public.it_assets;
create trigger trg_it_assets_updated_at
before update on public.it_assets
for each row
execute function public.set_it_assets_updated_at();

create or replace function public.set_it_licenses_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists trg_it_licenses_updated_at on public.it_licenses;
create trigger trg_it_licenses_updated_at
before update on public.it_licenses
for each row
execute function public.set_it_licenses_updated_at();

create or replace view public.executive_kpi as
select
  count(*)::bigint as total_tickets,
  count(*) filter (
    where upper(coalesce(status, '')) not in ('CLOSED', 'COMPLETED', 'RESOLVED')
  )::bigint as open_tickets,
  count(*) filter (
    where upper(coalesce(status, '')) not in ('CLOSED', 'COMPLETED', 'RESOLVED')
      and now() > coalesce(started_at, created_at) + (
        case lower(coalesce(priority, 'normal'))
          when 'urgent' then interval '2 hours'
          when 'high' then interval '4 hours'
          when 'normal' then interval '8 hours'
          when 'low' then interval '24 hours'
          else interval '8 hours'
        end
      )
  )::bigint as overdue_tickets,
  coalesce(
    round(
      avg(
        extract(epoch from (
          coalesce(closed_at, updated_at, now()) - coalesce(started_at, created_at, now())
        )) / 60
      ) filter (
        where upper(coalesce(status, '')) in ('CLOSED', 'COMPLETED', 'RESOLVED')
          and coalesce(closed_at, updated_at, now()) >= coalesce(started_at, created_at, now())
      )
    ),
    0
  )::bigint as avg_resolution_time_minutes
from public.tickets;

grant select on public.executive_kpi to authenticated;
grant select, insert, update, delete on public.it_assets to authenticated;
grant select, insert, update, delete on public.it_licenses to authenticated;

alter table if exists public.it_assets enable row level security;
alter table if exists public.it_licenses enable row level security;

drop policy if exists "Internal roles can view IT assets" on public.it_assets;
create policy "Internal roles can view IT assets"
  on public.it_assets
  for select
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role::text in ('it_support', 'admin', 'it_manager', 'executive', 'auditor')
    )
  );

drop policy if exists "IT can manage IT assets" on public.it_assets;
create policy "IT can manage IT assets"
  on public.it_assets
  for insert
  with check (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role::text in ('it_support', 'admin')
    )
  );

drop policy if exists "IT can update IT assets" on public.it_assets;
create policy "IT can update IT assets"
  on public.it_assets
  for update
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role::text in ('it_support', 'admin')
    )
  )
  with check (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role::text in ('it_support', 'admin')
    )
  );

drop policy if exists "IT can delete IT assets" on public.it_assets;
create policy "IT can delete IT assets"
  on public.it_assets
  for delete
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role::text = 'admin'
    )
  );

drop policy if exists "Internal roles can view licenses" on public.it_licenses;
create policy "Internal roles can view licenses"
  on public.it_licenses
  for select
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role::text in ('it_support', 'admin', 'it_manager', 'executive', 'auditor')
    )
  );

drop policy if exists "IT can manage licenses" on public.it_licenses;
create policy "IT can manage licenses"
  on public.it_licenses
  for insert
  with check (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role::text in ('it_support', 'admin')
    )
  );

drop policy if exists "IT can update licenses" on public.it_licenses;
create policy "IT can update licenses"
  on public.it_licenses
  for update
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role::text in ('it_support', 'admin')
    )
  )
  with check (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role::text in ('it_support', 'admin')
    )
  );

drop policy if exists "IT can delete licenses" on public.it_licenses;
create policy "IT can delete licenses"
  on public.it_licenses
  for delete
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role::text = 'admin'
    )
  );
