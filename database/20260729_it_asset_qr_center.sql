-- Asset QR Center fields and permissions.
-- Safe to run multiple times after 20260315_reports_schema.sql.

alter table if exists public.it_assets
  add column if not exists factory text,
  add column if not exists building text,
  add column if not exists floor text,
  add column if not exists room text,
  add column if not exists department text,
  add column if not exists po_number text,
  add column if not exists owner_profile_id uuid,
  add column if not exists owner_employee_code text,
  add column if not exists last_verified_at timestamptz,
  add column if not exists qr_created_at timestamptz;

do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'profiles'
  ) and not exists (
    select 1 from pg_constraint
    where conname = 'it_assets_owner_profile_id_fkey'
      and conrelid = 'public.it_assets'::regclass
  ) then
    alter table public.it_assets
      add constraint it_assets_owner_profile_id_fkey
      foreign key (owner_profile_id)
      references public.profiles(id)
      on delete set null;
  end if;
end;
$$;

create index if not exists it_assets_owner_profile_idx
  on public.it_assets (owner_profile_id);

create index if not exists it_assets_owner_employee_code_idx
  on public.it_assets (lower(owner_employee_code));

create index if not exists it_assets_serial_number_idx
  on public.it_assets (lower(serial_number));

create index if not exists it_assets_department_idx
  on public.it_assets (lower(department));

create index if not exists it_assets_last_verified_idx
  on public.it_assets (last_verified_at desc nulls last);

-- Return the active employee directory used by the QR owner autocomplete.
-- The function is restricted to IT roles so profile RLS cannot accidentally
-- reduce the dropdown to only the signed-in user's own profile.
create or replace function public.get_asset_qr_user_directory()
returns table (
  id uuid,
  full_name text,
  employee_code text,
  department text,
  avatar_url text,
  id_card_url text,
  email text,
  role text,
  is_active boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.id,
    nullif(to_jsonb(p) ->> 'full_name', '') as full_name,
    nullif(to_jsonb(p) ->> 'employee_code', '') as employee_code,
    nullif(to_jsonb(p) ->> 'department', '') as department,
    nullif(to_jsonb(p) ->> 'avatar_url', '') as avatar_url,
    nullif(to_jsonb(p) ->> 'id_card_url', '') as id_card_url,
    nullif(to_jsonb(p) ->> 'email', '') as email,
    coalesce(nullif(to_jsonb(p) ->> 'role', ''), 'user') as role,
    coalesce((to_jsonb(p) ->> 'is_active')::boolean, true) as is_active
  from public.profiles p
  where coalesce((to_jsonb(p) ->> 'is_active')::boolean, true) = true
    and exists (
      select 1
      from public.profiles viewer
      where viewer.id = auth.uid()
        and lower(viewer.role::text) in ('it_support', 'admin', 'it_manager')
    )
  order by
    coalesce(nullif(to_jsonb(p) ->> 'full_name', ''), nullif(to_jsonb(p) ->> 'employee_code', ''), p.id::text);
$$;

revoke all on function public.get_asset_qr_user_directory() from public;
grant execute on function public.get_asset_qr_user_directory() to authenticated;

-- Keep QR Center management aligned with the Stock Audit manager role.
drop policy if exists "IT can manage IT assets" on public.it_assets;
create policy "IT can manage IT assets"
  on public.it_assets
  for insert
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and lower(p.role::text) in ('it_support', 'admin', 'it_manager')
    )
  );

drop policy if exists "IT can update IT assets" on public.it_assets;
create policy "IT can update IT assets"
  on public.it_assets
  for update
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

notify pgrst, 'reload schema';
