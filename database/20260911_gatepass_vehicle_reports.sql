-- Gatepass vehicle register and reporting access.
-- Stores one row per vehicle visit/pass so the report can compare unique
-- vehicles and total gatepass activity day-over-day or month-over-month.

begin;

do $$
begin
  if exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'user_role'
  ) then
    alter type public.user_role add value if not exists 'security';
  end if;
end;
$$;

create table if not exists public.gatepass_vehicle_records (
  id uuid primary key default gen_random_uuid(),
  visit_date date not null,
  entry_time time,
  exit_time time,
  pass_type text not null,
  gatepass_number text,
  vehicle_plate text not null,
  province text,
  vehicle_type text,
  driver_name text,
  company_name text,
  contact_person text,
  department text,
  purpose text,
  gate_name text,
  approval_reference text,
  notes text,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint gatepass_vehicle_records_pass_type_check
    check (pass_type in ('TDK_APPROVED', 'TEMPORARY')),
  constraint gatepass_vehicle_records_plate_check
    check (length(trim(vehicle_plate)) > 0),
  constraint gatepass_vehicle_records_time_check
    check (exit_time is null or entry_time is null or exit_time >= entry_time)
);

create index if not exists gatepass_vehicle_records_visit_date_idx
  on public.gatepass_vehicle_records (visit_date desc);

create index if not exists gatepass_vehicle_records_pass_type_date_idx
  on public.gatepass_vehicle_records (pass_type, visit_date desc);

create index if not exists gatepass_vehicle_records_plate_date_idx
  on public.gatepass_vehicle_records (upper(trim(vehicle_plate)), visit_date desc);

create unique index if not exists gatepass_vehicle_records_gatepass_number_uidx
  on public.gatepass_vehicle_records (gatepass_number)
  where gatepass_number is not null and length(trim(gatepass_number)) > 0;

create or replace function public.set_gatepass_vehicle_records_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  new.pass_type = upper(trim(new.pass_type));
  new.vehicle_plate = upper(trim(new.vehicle_plate));
  new.gatepass_number = nullif(upper(trim(new.gatepass_number)), '');
  return new;
end;
$$;

drop trigger if exists trg_gatepass_vehicle_records_updated_at
  on public.gatepass_vehicle_records;
create trigger trg_gatepass_vehicle_records_updated_at
before insert or update on public.gatepass_vehicle_records
for each row
execute function public.set_gatepass_vehicle_records_updated_at();

alter table public.gatepass_vehicle_records enable row level security;

drop policy if exists "Management and security can view gatepass records"
  on public.gatepass_vehicle_records;
create policy "Management and security can view gatepass records"
  on public.gatepass_vehicle_records
  for select
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and lower(p.role::text) in ('it_support', 'it_manager', 'executive', 'security', 'auditor', 'admin')
        and coalesce((to_jsonb(p) ->> 'is_active')::boolean, true)
    )
  );

drop policy if exists "Gatepass operators can create records"
  on public.gatepass_vehicle_records;
create policy "Gatepass operators can create records"
  on public.gatepass_vehicle_records
  for insert
  with check (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and lower(p.role::text) in ('it_support', 'security', 'admin')
        and coalesce((to_jsonb(p) ->> 'is_active')::boolean, true)
    )
  );

drop policy if exists "Gatepass operators can update records"
  on public.gatepass_vehicle_records;
create policy "Gatepass operators can update records"
  on public.gatepass_vehicle_records
  for update
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and lower(p.role::text) in ('it_support', 'security', 'admin')
        and coalesce((to_jsonb(p) ->> 'is_active')::boolean, true)
    )
  )
  with check (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and lower(p.role::text) in ('it_support', 'security', 'admin')
        and coalesce((to_jsonb(p) ->> 'is_active')::boolean, true)
    )
  );

drop policy if exists "Admins can delete gatepass records"
  on public.gatepass_vehicle_records;
create policy "Admins can delete gatepass records"
  on public.gatepass_vehicle_records
  for delete
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and lower(p.role::text) = 'admin'
    )
  );

grant select, insert, update, delete on public.gatepass_vehicle_records to authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'gatepass_vehicle_records'
  ) then
    alter publication supabase_realtime add table public.gatepass_vehicle_records;
  end if;
end;
$$;

comment on table public.gatepass_vehicle_records is
  'Vehicle gatepass activity used for TDK APPROVED and TEMPORARY management reporting.';

notify pgrst, 'reload schema';

commit;
