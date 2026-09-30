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
  exit_date date,
  exit_time time,
  pass_type text not null,
  source_group_name text,
  gatepass_number text,
  vehicle_plate text not null,
  province text,
  vehicle_type text,
  driver_name text,
  company_name text,
  contact_person text,
  department text,
  purpose text,
  telephone_number text,
  gate_name text,
  approval_reference text,
  notes text,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint gatepass_vehicle_records_pass_type_check
    check (pass_type in ('TDK_APPROVED', 'TEMPORARY', 'UNSPECIFIED')),
  constraint gatepass_vehicle_records_plate_check
    check (length(trim(vehicle_plate)) > 0),
  constraint gatepass_vehicle_records_time_check
    check (
      exit_time is null
      or entry_time is null
      or (coalesce(exit_date, visit_date) + exit_time) >= (visit_date + entry_time)
    )
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

create table if not exists public.gatepass_import_batches (
  id uuid primary key default gen_random_uuid(),
  source_file text,
  record_count integer not null default 0,
  inserted_count integer not null default 0,
  updated_count integer not null default 0,
  date_from date,
  date_to date,
  status text not null default 'completed',
  imported_by uuid references auth.users(id) on delete set null default auth.uid(),
  imported_at timestamptz not null default timezone('utc', now()),
  constraint gatepass_import_batches_status_check
    check (status in ('completed', 'failed'))
);

-- TDK APPROVED master registry. Each uploaded workbook is treated as a full
-- snapshot. The system compares it with the prior active registry and records
-- additions, removals, reactivations, and metadata updates automatically.
create table if not exists public.tdk_approved_registry_imports (
  id uuid primary key default gen_random_uuid(),
  snapshot_date date not null,
  source_file text,
  total_count integer not null default 0,
  baseline_count integer not null default 0,
  added_count integer not null default 0,
  reactivated_count integer not null default 0,
  removed_count integer not null default 0,
  updated_count integer not null default 0,
  unchanged_count integer not null default 0,
  status text not null default 'completed',
  imported_by uuid references auth.users(id) on delete set null default auth.uid(),
  imported_at timestamptz not null default timezone('utc', now()),
  constraint tdk_approved_registry_imports_status_check
    check (status in ('completed', 'failed'))
);

create table if not exists public.tdk_approved_registry (
  id uuid primary key default gen_random_uuid(),
  plate_key text not null unique,
  vehicle_plate text not null,
  full_name text,
  group_name text not null default 'TDK APPROVED',
  company_name text,
  remark text,
  contact_name text,
  purpose text,
  source_created_by text,
  mapping_status text,
  is_active boolean not null default true,
  first_seen_date date not null,
  last_seen_date date not null,
  removed_date date,
  source_sheet text,
  source_row integer,
  last_import_id uuid references public.tdk_approved_registry_imports(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint tdk_approved_registry_plate_check
    check (length(trim(vehicle_plate)) > 0),
  constraint tdk_approved_registry_group_check
    check (group_name = 'TDK APPROVED')
);

create table if not exists public.tdk_approved_registry_changes (
  id uuid primary key default gen_random_uuid(),
  import_id uuid not null references public.tdk_approved_registry_imports(id) on delete cascade,
  change_date date not null,
  change_type text not null,
  plate_key text not null,
  vehicle_plate text not null,
  full_name text,
  company_name text,
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  constraint tdk_approved_registry_changes_type_check
    check (change_type in ('BASELINE', 'ADDED', 'REACTIVATED', 'REMOVED', 'UPDATED'))
);

create index if not exists tdk_approved_registry_active_plate_idx
  on public.tdk_approved_registry (is_active, plate_key);

create index if not exists tdk_approved_registry_company_idx
  on public.tdk_approved_registry (company_name)
  where is_active = true;

create index if not exists tdk_approved_registry_imports_date_idx
  on public.tdk_approved_registry_imports (snapshot_date desc, imported_at desc);

create index if not exists tdk_approved_registry_changes_date_idx
  on public.tdk_approved_registry_changes (change_date desc, change_type);

alter table public.gatepass_vehicle_records
  add column if not exists exit_date date,
  add column if not exists source_group_name text,
  add column if not exists telephone_number text,
  add column if not exists import_batch_id uuid references public.gatepass_import_batches(id) on delete set null,
  add column if not exists source_file text,
  add column if not exists source_sheet text,
  add column if not exists source_row integer,
  add column if not exists source_key text;

alter table public.gatepass_vehicle_records
  drop constraint if exists gatepass_vehicle_records_pass_type_check;
alter table public.gatepass_vehicle_records
  add constraint gatepass_vehicle_records_pass_type_check
  check (pass_type in ('TDK_APPROVED', 'TEMPORARY', 'UNSPECIFIED'));

alter table public.gatepass_vehicle_records
  drop constraint if exists gatepass_vehicle_records_time_check;
alter table public.gatepass_vehicle_records
  add constraint gatepass_vehicle_records_time_check
  check (
    exit_time is null
    or entry_time is null
    or (coalesce(exit_date, visit_date) + exit_time) >= (visit_date + entry_time)
  );

create unique index if not exists gatepass_vehicle_records_source_key_uidx
  on public.gatepass_vehicle_records (source_key)
  where source_key is not null and length(trim(source_key)) > 0;

create index if not exists gatepass_import_batches_imported_at_idx
  on public.gatepass_import_batches (imported_at desc);

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
alter table public.gatepass_import_batches enable row level security;
alter table public.tdk_approved_registry enable row level security;
alter table public.tdk_approved_registry_imports enable row level security;
alter table public.tdk_approved_registry_changes enable row level security;

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

drop policy if exists "Management can view gatepass import history"
  on public.gatepass_import_batches;
create policy "Management can view gatepass import history"
  on public.gatepass_import_batches
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

grant select on public.gatepass_import_batches to authenticated;

drop policy if exists "Authorized users can view TDK approved registry"
  on public.tdk_approved_registry;
create policy "Authorized users can view TDK approved registry"
  on public.tdk_approved_registry
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

drop policy if exists "Authorized users can view TDK registry imports"
  on public.tdk_approved_registry_imports;
create policy "Authorized users can view TDK registry imports"
  on public.tdk_approved_registry_imports
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

drop policy if exists "Authorized users can view TDK registry changes"
  on public.tdk_approved_registry_changes;
create policy "Authorized users can view TDK registry changes"
  on public.tdk_approved_registry_changes
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

grant select on public.tdk_approved_registry to authenticated;
grant select on public.tdk_approved_registry_imports to authenticated;
grant select on public.tdk_approved_registry_changes to authenticated;

create or replace function public.import_gatepass_vehicle_records(
  p_rows jsonb,
  p_source_file text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  actor_role text := '';
  batch_id uuid;
  item jsonb;
  existing_id uuid;
  normalized_pass_type text;
  normalized_plate text;
  normalized_gatepass text;
  normalized_source_key text;
  inserted_total integer := 0;
  updated_total integer := 0;
  row_total integer := 0;
  min_visit_date date;
  max_visit_date date;
begin
  select lower(coalesce(to_jsonb(p) ->> 'role', ''))
  into actor_role
  from public.profiles p
  where p.id = auth.uid()
    and coalesce((to_jsonb(p) ->> 'is_active')::boolean, true);

  if actor_role not in ('it_support', 'security', 'admin') then
    raise exception 'You do not have permission to import Gatepass records' using errcode = '42501';
  end if;

  if coalesce(jsonb_typeof(p_rows), '') <> 'array' then
    raise exception 'Gatepass import requires an array of rows' using errcode = '22023';
  end if;

  if jsonb_array_length(p_rows) = 0 then
    raise exception 'Gatepass import requires at least one row' using errcode = '22023';
  end if;

  if jsonb_array_length(p_rows) > 5000 then
    raise exception 'Gatepass import is limited to 5000 rows per file' using errcode = '22023';
  end if;

  insert into public.gatepass_import_batches (source_file, record_count, imported_by)
  values (nullif(trim(p_source_file), ''), jsonb_array_length(p_rows), auth.uid())
  returning id into batch_id;

  for item in select value from jsonb_array_elements(p_rows)
  loop
    normalized_pass_type := upper(trim(coalesce(item ->> 'pass_type', '')));
    normalized_plate := upper(trim(coalesce(item ->> 'vehicle_plate', '')));
    normalized_gatepass := nullif(upper(trim(coalesce(item ->> 'gatepass_number', ''))), '');

    if coalesce(item ->> 'visit_date', '') = '' or normalized_plate = '' then
      raise exception 'Every Gatepass row requires visit_date and vehicle_plate' using errcode = '22023';
    end if;
    if normalized_pass_type not in ('TDK_APPROVED', 'TEMPORARY', 'UNSPECIFIED') then
      raise exception 'Invalid Gatepass type: %', normalized_pass_type using errcode = '22023';
    end if;

    normalized_source_key := md5(concat_ws('|',
      coalesce(item ->> 'visit_date', ''),
      coalesce(item ->> 'entry_time', ''),
      normalized_plate,
      coalesce(normalized_gatepass, ''),
      upper(trim(coalesce(item ->> 'gate_name', '')))
    ));

    existing_id := null;
    if normalized_gatepass is not null then
      select r.id into existing_id
      from public.gatepass_vehicle_records r
      where r.gatepass_number = normalized_gatepass
      limit 1;
    end if;
    if existing_id is null then
      select r.id into existing_id
      from public.gatepass_vehicle_records r
      where r.source_key = normalized_source_key
      limit 1;
    end if;

    if existing_id is null then
      insert into public.gatepass_vehicle_records (
        visit_date, entry_time, exit_date, exit_time, pass_type, source_group_name, gatepass_number,
        vehicle_plate, province, vehicle_type, driver_name, company_name,
        contact_person, department, purpose, telephone_number, gate_name, approval_reference,
        notes, created_by, import_batch_id, source_file, source_sheet, source_row, source_key
      ) values (
        (item ->> 'visit_date')::date,
        nullif(item ->> 'entry_time', '')::time,
        nullif(item ->> 'exit_date', '')::date,
        nullif(item ->> 'exit_time', '')::time,
        normalized_pass_type,
        nullif(trim(item ->> 'source_group_name'), ''),
        normalized_gatepass,
        normalized_plate,
        nullif(trim(item ->> 'province'), ''),
        nullif(trim(item ->> 'vehicle_type'), ''),
        nullif(trim(item ->> 'driver_name'), ''),
        nullif(trim(item ->> 'company_name'), ''),
        nullif(trim(item ->> 'contact_person'), ''),
        nullif(trim(item ->> 'department'), ''),
        nullif(trim(item ->> 'purpose'), ''),
        nullif(trim(item ->> 'telephone_number'), ''),
        nullif(trim(item ->> 'gate_name'), ''),
        nullif(trim(item ->> 'approval_reference'), ''),
        nullif(trim(item ->> 'notes'), ''),
        auth.uid(), batch_id, nullif(trim(p_source_file), ''),
        nullif(trim(item ->> 'source_sheet'), ''),
        nullif(item ->> 'source_row', '')::integer,
        normalized_source_key
      );
      inserted_total := inserted_total + 1;
    else
      update public.gatepass_vehicle_records
      set visit_date = (item ->> 'visit_date')::date,
          entry_time = nullif(item ->> 'entry_time', '')::time,
          exit_date = nullif(item ->> 'exit_date', '')::date,
          exit_time = nullif(item ->> 'exit_time', '')::time,
          pass_type = normalized_pass_type,
          source_group_name = nullif(trim(item ->> 'source_group_name'), ''),
          gatepass_number = normalized_gatepass,
          vehicle_plate = normalized_plate,
          province = nullif(trim(item ->> 'province'), ''),
          vehicle_type = nullif(trim(item ->> 'vehicle_type'), ''),
          driver_name = nullif(trim(item ->> 'driver_name'), ''),
          company_name = nullif(trim(item ->> 'company_name'), ''),
          contact_person = nullif(trim(item ->> 'contact_person'), ''),
          department = nullif(trim(item ->> 'department'), ''),
          purpose = nullif(trim(item ->> 'purpose'), ''),
          telephone_number = nullif(trim(item ->> 'telephone_number'), ''),
          gate_name = nullif(trim(item ->> 'gate_name'), ''),
          approval_reference = nullif(trim(item ->> 'approval_reference'), ''),
          notes = nullif(trim(item ->> 'notes'), ''),
          import_batch_id = batch_id,
          source_file = nullif(trim(p_source_file), ''),
          source_sheet = nullif(trim(item ->> 'source_sheet'), ''),
          source_row = nullif(item ->> 'source_row', '')::integer,
          source_key = normalized_source_key
      where id = existing_id;
      updated_total := updated_total + 1;
    end if;

    row_total := row_total + 1;
    min_visit_date := least(coalesce(min_visit_date, (item ->> 'visit_date')::date), (item ->> 'visit_date')::date);
    max_visit_date := greatest(coalesce(max_visit_date, (item ->> 'visit_date')::date), (item ->> 'visit_date')::date);
  end loop;

  update public.gatepass_import_batches
  set record_count = row_total,
      inserted_count = inserted_total,
      updated_count = updated_total,
      date_from = min_visit_date,
      date_to = max_visit_date,
      status = 'completed'
  where id = batch_id;

  return jsonb_build_object(
    'batch_id', batch_id,
    'total', row_total,
    'inserted', inserted_total,
    'updated', updated_total,
    'date_from', min_visit_date,
    'date_to', max_visit_date
  );
end;
$$;

revoke all on function public.import_gatepass_vehicle_records(jsonb, text) from public;
grant execute on function public.import_gatepass_vehicle_records(jsonb, text) to authenticated;

create or replace function public.sync_tdk_approved_registry(
  p_rows jsonb,
  p_source_file text default null,
  p_snapshot_date date default current_date
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  actor_role text := '';
  import_id uuid;
  item jsonb;
  existing_record public.tdk_approved_registry%rowtype;
  record_exists boolean;
  initial_snapshot boolean;
  metadata_changed boolean;
  normalized_plate_key text;
  normalized_plate text;
  normalized_group text;
  before_payload jsonb;
  after_payload jsonb;
  row_total integer := 0;
  baseline_total integer := 0;
  added_total integer := 0;
  reactivated_total integer := 0;
  removed_total integer := 0;
  updated_total integer := 0;
  unchanged_total integer := 0;
begin
  select lower(coalesce(to_jsonb(p) ->> 'role', ''))
  into actor_role
  from public.profiles p
  where p.id = auth.uid()
    and coalesce((to_jsonb(p) ->> 'is_active')::boolean, true);

  if actor_role not in ('it_support', 'security', 'admin') then
    raise exception 'You do not have permission to update the TDK APPROVED registry' using errcode = '42501';
  end if;

  if p_snapshot_date is null then
    raise exception 'Snapshot date is required' using errcode = '22023';
  end if;

  if exists (
    select 1
    from public.tdk_approved_registry_imports i
    where i.status = 'completed'
      and i.snapshot_date > p_snapshot_date
  ) then
    raise exception 'Snapshot date cannot be older than the latest completed registry update' using errcode = '22023';
  end if;

  if coalesce(jsonb_typeof(p_rows), '') <> 'array' then
    raise exception 'TDK APPROVED registry import requires an array of rows' using errcode = '22023';
  end if;

  if jsonb_array_length(p_rows) = 0 then
    raise exception 'TDK APPROVED registry import requires at least one row' using errcode = '22023';
  end if;

  if jsonb_array_length(p_rows) > 5000 then
    raise exception 'TDK APPROVED registry import is limited to 5000 rows per file' using errcode = '22023';
  end if;

  select not exists (select 1 from public.tdk_approved_registry)
  into initial_snapshot;

  create temporary table if not exists tdk_approved_seen_keys (
    plate_key text primary key
  ) on commit drop;
  truncate table pg_temp.tdk_approved_seen_keys;

  insert into public.tdk_approved_registry_imports (
    snapshot_date, source_file, total_count, imported_by
  ) values (
    p_snapshot_date, nullif(trim(p_source_file), ''), jsonb_array_length(p_rows), auth.uid()
  ) returning id into import_id;

  for item in select value from jsonb_array_elements(p_rows)
  loop
    normalized_plate := upper(trim(coalesce(item ->> 'vehicle_plate', '')));
    normalized_plate_key := upper(regexp_replace(
      trim(coalesce(item ->> 'plate_key', normalized_plate)),
      '[[:space:]-]+', '', 'g'
    ));
    normalized_group := upper(regexp_replace(
      trim(coalesce(item ->> 'group_name', 'TDK APPROVED')),
      '[[:space:]_-]+', '', 'g'
    ));

    if normalized_plate = '' or normalized_plate_key = '' then
      raise exception 'Every TDK APPROVED registry row requires a license plate' using errcode = '22023';
    end if;
    if normalized_group <> 'TDKAPPROVED' then
      raise exception 'Registry row % is not in TDK APPROVED group', normalized_plate using errcode = '22023';
    end if;
    if exists (select 1 from pg_temp.tdk_approved_seen_keys s where s.plate_key = normalized_plate_key) then
      raise exception 'Duplicate license plate in registry file: %', normalized_plate using errcode = '22023';
    end if;
    insert into pg_temp.tdk_approved_seen_keys (plate_key) values (normalized_plate_key);

    after_payload := jsonb_strip_nulls(jsonb_build_object(
      'vehicle_plate', normalized_plate,
      'full_name', nullif(trim(item ->> 'full_name'), ''),
      'group_name', 'TDK APPROVED',
      'company_name', nullif(trim(item ->> 'company_name'), ''),
      'remark', nullif(trim(item ->> 'remark'), ''),
      'contact_name', nullif(trim(item ->> 'contact_name'), ''),
      'purpose', nullif(trim(item ->> 'purpose'), ''),
      'source_created_by', nullif(trim(item ->> 'source_created_by'), ''),
      'mapping_status', nullif(trim(item ->> 'mapping_status'), '')
    ));

    select r.*
    into existing_record
    from public.tdk_approved_registry r
    where r.plate_key = normalized_plate_key;
    record_exists := found;

    if not record_exists then
      insert into public.tdk_approved_registry (
        plate_key, vehicle_plate, full_name, group_name, company_name, remark,
        contact_name, purpose, source_created_by, mapping_status, is_active,
        first_seen_date, last_seen_date, removed_date, source_sheet, source_row,
        last_import_id
      ) values (
        normalized_plate_key,
        normalized_plate,
        nullif(trim(item ->> 'full_name'), ''),
        'TDK APPROVED',
        nullif(trim(item ->> 'company_name'), ''),
        nullif(trim(item ->> 'remark'), ''),
        nullif(trim(item ->> 'contact_name'), ''),
        nullif(trim(item ->> 'purpose'), ''),
        nullif(trim(item ->> 'source_created_by'), ''),
        nullif(trim(item ->> 'mapping_status'), ''),
        true, p_snapshot_date, p_snapshot_date, null,
        nullif(trim(item ->> 'source_sheet'), ''),
        nullif(item ->> 'source_row', '')::integer,
        import_id
      );

      insert into public.tdk_approved_registry_changes (
        import_id, change_date, change_type, plate_key, vehicle_plate,
        full_name, company_name, before_data, after_data
      ) values (
        import_id, p_snapshot_date,
        case when initial_snapshot then 'BASELINE' else 'ADDED' end,
        normalized_plate_key, normalized_plate,
        nullif(trim(item ->> 'full_name'), ''),
        nullif(trim(item ->> 'company_name'), ''),
        null, after_payload
      );

      if initial_snapshot then
        baseline_total := baseline_total + 1;
      else
        added_total := added_total + 1;
      end if;
    else
      before_payload := jsonb_strip_nulls(jsonb_build_object(
        'vehicle_plate', existing_record.vehicle_plate,
        'full_name', existing_record.full_name,
        'group_name', existing_record.group_name,
        'company_name', existing_record.company_name,
        'remark', existing_record.remark,
        'contact_name', existing_record.contact_name,
        'purpose', existing_record.purpose,
        'source_created_by', existing_record.source_created_by,
        'mapping_status', existing_record.mapping_status
      ));
      metadata_changed := before_payload is distinct from after_payload;

      if not existing_record.is_active then
        insert into public.tdk_approved_registry_changes (
          import_id, change_date, change_type, plate_key, vehicle_plate,
          full_name, company_name, before_data, after_data
        ) values (
          import_id, p_snapshot_date, 'REACTIVATED', normalized_plate_key,
          normalized_plate, nullif(trim(item ->> 'full_name'), ''),
          nullif(trim(item ->> 'company_name'), ''), before_payload, after_payload
        );
        reactivated_total := reactivated_total + 1;
      elsif metadata_changed then
        insert into public.tdk_approved_registry_changes (
          import_id, change_date, change_type, plate_key, vehicle_plate,
          full_name, company_name, before_data, after_data
        ) values (
          import_id, p_snapshot_date, 'UPDATED', normalized_plate_key,
          normalized_plate, nullif(trim(item ->> 'full_name'), ''),
          nullif(trim(item ->> 'company_name'), ''), before_payload, after_payload
        );
        updated_total := updated_total + 1;
      else
        unchanged_total := unchanged_total + 1;
      end if;

      update public.tdk_approved_registry
      set vehicle_plate = normalized_plate,
          full_name = nullif(trim(item ->> 'full_name'), ''),
          group_name = 'TDK APPROVED',
          company_name = nullif(trim(item ->> 'company_name'), ''),
          remark = nullif(trim(item ->> 'remark'), ''),
          contact_name = nullif(trim(item ->> 'contact_name'), ''),
          purpose = nullif(trim(item ->> 'purpose'), ''),
          source_created_by = nullif(trim(item ->> 'source_created_by'), ''),
          mapping_status = nullif(trim(item ->> 'mapping_status'), ''),
          is_active = true,
          last_seen_date = p_snapshot_date,
          removed_date = null,
          source_sheet = nullif(trim(item ->> 'source_sheet'), ''),
          source_row = nullif(item ->> 'source_row', '')::integer,
          last_import_id = import_id,
          updated_at = timezone('utc', now())
      where id = existing_record.id;
    end if;

    row_total := row_total + 1;
  end loop;

  if not initial_snapshot then
    for existing_record in
      select r.*
      from public.tdk_approved_registry r
      where r.is_active = true
        and not exists (
          select 1
          from pg_temp.tdk_approved_seen_keys s
          where s.plate_key = r.plate_key
        )
    loop
      before_payload := jsonb_strip_nulls(jsonb_build_object(
        'vehicle_plate', existing_record.vehicle_plate,
        'full_name', existing_record.full_name,
        'group_name', existing_record.group_name,
        'company_name', existing_record.company_name,
        'remark', existing_record.remark,
        'contact_name', existing_record.contact_name,
        'purpose', existing_record.purpose,
        'source_created_by', existing_record.source_created_by,
        'mapping_status', existing_record.mapping_status
      ));

      insert into public.tdk_approved_registry_changes (
        import_id, change_date, change_type, plate_key, vehicle_plate,
        full_name, company_name, before_data, after_data
      ) values (
        import_id, p_snapshot_date, 'REMOVED', existing_record.plate_key,
        existing_record.vehicle_plate, existing_record.full_name,
        existing_record.company_name, before_payload, null
      );

      update public.tdk_approved_registry
      set is_active = false,
          removed_date = p_snapshot_date,
          last_import_id = import_id,
          updated_at = timezone('utc', now())
      where id = existing_record.id;

      removed_total := removed_total + 1;
    end loop;
  end if;

  update public.tdk_approved_registry_imports
  set total_count = row_total,
      baseline_count = baseline_total,
      added_count = added_total,
      reactivated_count = reactivated_total,
      removed_count = removed_total,
      updated_count = updated_total,
      unchanged_count = unchanged_total,
      status = 'completed'
  where id = import_id;

  return jsonb_build_object(
    'import_id', import_id,
    'snapshot_date', p_snapshot_date,
    'total', row_total,
    'baseline', baseline_total,
    'added', added_total,
    'reactivated', reactivated_total,
    'removed', removed_total,
    'updated', updated_total,
    'unchanged', unchanged_total
  );
end;
$$;

revoke all on function public.sync_tdk_approved_registry(jsonb, text, date) from public;
grant execute on function public.sync_tdk_approved_registry(jsonb, text, date) to authenticated;

-- Manual registry maintenance from the Gatepass In-Out management screen.
-- Records are never physically deleted: REMOVE deactivates the vehicle and
-- writes the same monthly audit trail used by workbook imports.
create or replace function public.manage_tdk_approved_registry(
  p_action text,
  p_record_id uuid default null,
  p_payload jsonb default '{}'::jsonb,
  p_effective_date date default current_date
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  actor_role text := '';
  normalized_action text := upper(trim(coalesce(p_action, '')));
  normalized_plate text;
  normalized_plate_key text;
  existing_record public.tdk_approved_registry%rowtype;
  saved_record public.tdk_approved_registry%rowtype;
  record_exists boolean := false;
  change_type text;
  import_id uuid;
  before_payload jsonb;
  after_payload jsonb;
  active_total integer := 0;
begin
  select lower(coalesce(to_jsonb(p) ->> 'role', ''))
  into actor_role
  from public.profiles p
  where p.id = auth.uid()
    and coalesce((to_jsonb(p) ->> 'is_active')::boolean, true);

  if actor_role not in ('it_support', 'security', 'admin') then
    raise exception 'You do not have permission to manage the TDK APPROVED registry' using errcode = '42501';
  end if;

  if p_effective_date is null then
    raise exception 'Effective date is required' using errcode = '22023';
  end if;

  if exists (
    select 1
    from public.tdk_approved_registry_imports i
    where i.status = 'completed'
      and i.snapshot_date > p_effective_date
  ) then
    raise exception 'Effective date cannot be older than the latest completed registry update' using errcode = '22023';
  end if;

  if normalized_action not in ('ADD', 'UPDATE', 'REMOVE', 'REACTIVATE') then
    raise exception 'Invalid registry action: %', normalized_action using errcode = '22023';
  end if;

  if normalized_action = 'ADD' then
    normalized_plate := upper(trim(coalesce(p_payload ->> 'vehicle_plate', '')));
    normalized_plate_key := upper(regexp_replace(normalized_plate, '[[:space:]-]+', '', 'g'));
    if normalized_plate_key = '' then
      raise exception 'License plate is required' using errcode = '22023';
    end if;

    select r.* into existing_record
    from public.tdk_approved_registry r
    where r.plate_key = normalized_plate_key;
    record_exists := found;

    if record_exists and existing_record.is_active then
      raise exception 'License plate already exists in the active registry: %', normalized_plate using errcode = '23505';
    end if;
    if record_exists then
      normalized_action := 'REACTIVATE';
    end if;
  else
    if p_record_id is null then
      raise exception 'Registry record id is required' using errcode = '22023';
    end if;
    select r.* into existing_record
    from public.tdk_approved_registry r
    where r.id = p_record_id;
    record_exists := found;
    if not record_exists then
      raise exception 'TDK APPROVED registry record was not found' using errcode = 'P0002';
    end if;
    if normalized_action = 'REMOVE' and not existing_record.is_active then
      raise exception 'License plate is already inactive' using errcode = '22023';
    end if;
    if normalized_action = 'REACTIVATE' and existing_record.is_active then
      raise exception 'License plate is already active' using errcode = '22023';
    end if;
  end if;

  if record_exists then
    before_payload := jsonb_strip_nulls(jsonb_build_object(
      'vehicle_plate', existing_record.vehicle_plate,
      'full_name', existing_record.full_name,
      'group_name', existing_record.group_name,
      'company_name', existing_record.company_name,
      'remark', existing_record.remark,
      'contact_name', existing_record.contact_name,
      'purpose', existing_record.purpose,
      'source_created_by', existing_record.source_created_by,
      'mapping_status', existing_record.mapping_status
    ));
  end if;

  if normalized_action <> 'REMOVE' then
    normalized_plate := upper(trim(coalesce(
      nullif(p_payload ->> 'vehicle_plate', ''),
      existing_record.vehicle_plate,
      ''
    )));
    normalized_plate_key := upper(regexp_replace(normalized_plate, '[[:space:]-]+', '', 'g'));
    if normalized_plate_key = '' then
      raise exception 'License plate is required' using errcode = '22023';
    end if;
    if exists (
      select 1 from public.tdk_approved_registry r
      where r.plate_key = normalized_plate_key
        and (not record_exists or r.id <> existing_record.id)
    ) then
      raise exception 'License plate already exists: %', normalized_plate using errcode = '23505';
    end if;

    after_payload := jsonb_strip_nulls(jsonb_build_object(
      'vehicle_plate', normalized_plate,
      'full_name', nullif(trim(p_payload ->> 'full_name'), ''),
      'group_name', 'TDK APPROVED',
      'company_name', nullif(trim(p_payload ->> 'company_name'), ''),
      'remark', nullif(trim(p_payload ->> 'remark'), ''),
      'contact_name', nullif(trim(p_payload ->> 'contact_name'), ''),
      'purpose', nullif(trim(p_payload ->> 'purpose'), ''),
      'source_created_by', nullif(trim(p_payload ->> 'source_created_by'), ''),
      'mapping_status', nullif(trim(p_payload ->> 'mapping_status'), '')
    ));
  end if;

  change_type := case normalized_action
    when 'ADD' then 'ADDED'
    when 'UPDATE' then 'UPDATED'
    when 'REMOVE' then 'REMOVED'
    when 'REACTIVATE' then 'REACTIVATED'
  end;

  insert into public.tdk_approved_registry_imports (
    snapshot_date, source_file, status, imported_by
  ) values (
    p_effective_date, 'Manual: ' || normalized_action, 'completed', auth.uid()
  ) returning id into import_id;

  if normalized_action = 'ADD' then
    insert into public.tdk_approved_registry (
      plate_key, vehicle_plate, full_name, group_name, company_name, remark,
      contact_name, purpose, source_created_by, mapping_status, is_active,
      first_seen_date, last_seen_date, removed_date, source_sheet, source_row,
      last_import_id
    ) values (
      normalized_plate_key, normalized_plate,
      nullif(trim(p_payload ->> 'full_name'), ''), 'TDK APPROVED',
      nullif(trim(p_payload ->> 'company_name'), ''),
      nullif(trim(p_payload ->> 'remark'), ''),
      nullif(trim(p_payload ->> 'contact_name'), ''),
      nullif(trim(p_payload ->> 'purpose'), ''),
      nullif(trim(p_payload ->> 'source_created_by'), ''),
      nullif(trim(p_payload ->> 'mapping_status'), ''),
      true, p_effective_date, p_effective_date, null, 'Manual', null, import_id
    ) returning * into saved_record;
  elsif normalized_action = 'REMOVE' then
    update public.tdk_approved_registry
    set is_active = false,
        removed_date = p_effective_date,
        last_import_id = import_id,
        updated_at = timezone('utc', now())
    where id = existing_record.id
    returning * into saved_record;
  else
    -- UPDATE and REACTIVATE both accept the complete form payload. For a
    -- reactivation triggered from the quick action, an empty payload keeps
    -- the prior metadata.
    if p_payload = '{}'::jsonb then
      after_payload := before_payload;
      normalized_plate := existing_record.vehicle_plate;
      normalized_plate_key := existing_record.plate_key;
    end if;

    update public.tdk_approved_registry
    set plate_key = normalized_plate_key,
        vehicle_plate = normalized_plate,
        full_name = case when p_payload = '{}'::jsonb then existing_record.full_name else nullif(trim(p_payload ->> 'full_name'), '') end,
        group_name = 'TDK APPROVED',
        company_name = case when p_payload = '{}'::jsonb then existing_record.company_name else nullif(trim(p_payload ->> 'company_name'), '') end,
        remark = case when p_payload = '{}'::jsonb then existing_record.remark else nullif(trim(p_payload ->> 'remark'), '') end,
        contact_name = case when p_payload = '{}'::jsonb then existing_record.contact_name else nullif(trim(p_payload ->> 'contact_name'), '') end,
        purpose = case when p_payload = '{}'::jsonb then existing_record.purpose else nullif(trim(p_payload ->> 'purpose'), '') end,
        source_created_by = case when p_payload = '{}'::jsonb then existing_record.source_created_by else nullif(trim(p_payload ->> 'source_created_by'), '') end,
        mapping_status = case when p_payload = '{}'::jsonb then existing_record.mapping_status else nullif(trim(p_payload ->> 'mapping_status'), '') end,
        is_active = case when normalized_action = 'REACTIVATE' then true else existing_record.is_active end,
        last_seen_date = case when existing_record.is_active or normalized_action = 'REACTIVATE' then p_effective_date else existing_record.last_seen_date end,
        removed_date = case when normalized_action = 'REACTIVATE' then null else existing_record.removed_date end,
        last_import_id = import_id,
        updated_at = timezone('utc', now())
    where id = existing_record.id
    returning * into saved_record;
  end if;

  insert into public.tdk_approved_registry_changes (
    import_id, change_date, change_type, plate_key, vehicle_plate,
    full_name, company_name, before_data, after_data
  ) values (
    import_id, p_effective_date, change_type, saved_record.plate_key,
    saved_record.vehicle_plate, saved_record.full_name, saved_record.company_name,
    before_payload, case when normalized_action = 'REMOVE' then null else after_payload end
  );

  select count(*) into active_total
  from public.tdk_approved_registry
  where is_active = true;

  update public.tdk_approved_registry_imports
  set total_count = active_total,
      added_count = case when change_type = 'ADDED' then 1 else 0 end,
      reactivated_count = case when change_type = 'REACTIVATED' then 1 else 0 end,
      removed_count = case when change_type = 'REMOVED' then 1 else 0 end,
      updated_count = case when change_type = 'UPDATED' then 1 else 0 end
  where id = import_id;

  return jsonb_build_object(
    'action', change_type,
    'effective_date', p_effective_date,
    'active_total', active_total,
    'record', to_jsonb(saved_record)
  );
end;
$$;

revoke all on function public.manage_tdk_approved_registry(text, uuid, jsonb, date) from public;
grant execute on function public.manage_tdk_approved_registry(text, uuid, jsonb, date) to authenticated;

-- Explicitly clear the TDK APPROVED master and its audit history before a
-- clean baseline import. This never touches gatepass_vehicle_records.
create or replace function public.reset_tdk_approved_registry()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  actor_role text := '';
  deleted_changes integer := 0;
  deleted_registry integer := 0;
  deleted_imports integer := 0;
begin
  select lower(coalesce(to_jsonb(p) ->> 'role', ''))
  into actor_role
  from public.profiles p
  where p.id = auth.uid()
    and coalesce((to_jsonb(p) ->> 'is_active')::boolean, true);

  if actor_role not in ('it_support', 'security', 'admin') then
    raise exception 'You do not have permission to reset the TDK APPROVED registry' using errcode = '42501';
  end if;

  -- Delete dependent audit rows first, then the registry rows, then imports.
  delete from public.tdk_approved_registry_changes;
  get diagnostics deleted_changes = row_count;

  delete from public.tdk_approved_registry;
  get diagnostics deleted_registry = row_count;

  delete from public.tdk_approved_registry_imports;
  get diagnostics deleted_imports = row_count;

  return jsonb_build_object(
    'deleted_changes', deleted_changes,
    'deleted_registry', deleted_registry,
    'deleted_imports', deleted_imports
  );
end;
$$;

revoke all on function public.reset_tdk_approved_registry() from public;
grant execute on function public.reset_tdk_approved_registry() to authenticated;

do $$
begin
  -- A vehicle report can contain thousands of rows. Publishing each row would
  -- make every open dashboard issue thousands of refresh requests. Publish the
  -- single completed import batch instead, so clients refresh once per file.
  if exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'gatepass_vehicle_records'
  ) then
    alter publication supabase_realtime drop table public.gatepass_vehicle_records;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'gatepass_import_batches'
  ) then
    alter publication supabase_realtime add table public.gatepass_import_batches;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'tdk_approved_registry_imports'
  ) then
    alter publication supabase_realtime add table public.tdk_approved_registry_imports;
  end if;
end;
$$;

comment on table public.gatepass_vehicle_records is
  'Vehicle gatepass activity used for TDK APPROVED and TEMPORARY management reporting.';

comment on table public.tdk_approved_registry is
  'Current TDK APPROVED vehicle master registry synchronized from recurring snapshot workbooks.';

notify pgrst, 'reload schema';

commit;
