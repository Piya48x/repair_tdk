-- Allow genuinely new TDK APPROVED vehicles (vehicle 40 onward) to be entered
-- with their actual historical effective date. The official 39-vehicle
-- baseline began on 2026-09-08, so no manual addition may predate that day.
--
-- UPDATE, REMOVE, and REACTIVATE continue to use manage_tdk_approved_registry
-- and retain its chronological-history protection.
create or replace function public.add_tdk_approved_registry_vehicle(
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
  normalized_plate text;
  normalized_plate_key text;
  existing_record public.tdk_approved_registry%rowtype;
  saved_record public.tdk_approved_registry%rowtype;
  import_id uuid;
  after_payload jsonb;
  historical_total integer := 0;
  active_total integer := 0;
begin
  select lower(trim(coalesce(to_jsonb(p) ->> 'role', '')))
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

  if p_effective_date < date '2026-09-08' then
    raise exception 'Effective date cannot be earlier than the official registry start date (2026-09-08)' using errcode = '22023';
  end if;

  normalized_plate := upper(trim(coalesce(p_payload ->> 'vehicle_plate', '')));
  normalized_plate_key := upper(regexp_replace(normalized_plate, '[[:space:]-]+', '', 'g'));
  if normalized_plate_key = '' then
    raise exception 'License plate is required' using errcode = '22023';
  end if;

  select r.*
  into existing_record
  from public.tdk_approved_registry r
  where r.plate_key = normalized_plate_key;

  if found then
    if existing_record.is_active then
      raise exception 'License plate already exists in the active registry: %', normalized_plate using errcode = '23505';
    end if;
    raise exception 'License plate already exists but is inactive; reactivate the existing record instead: %', normalized_plate using errcode = '23505';
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

  insert into public.tdk_approved_registry_imports (
    snapshot_date, source_file, status, imported_by
  ) values (
    p_effective_date, 'Manual: ADD (backdated)', 'completed', auth.uid()
  ) returning id into import_id;

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

  insert into public.tdk_approved_registry_changes (
    import_id, change_date, change_type, plate_key, vehicle_plate,
    full_name, company_name, before_data, after_data
  ) values (
    import_id, p_effective_date, 'ADDED', saved_record.plate_key,
    saved_record.vehicle_plate, saved_record.full_name, saved_record.company_name,
    null, after_payload
  );

  -- A backdated correction changes the accumulated fleet size for every
  -- completed snapshot on or after its effective date.
  update public.tdk_approved_registry_imports
  set total_count = total_count + 1
  where id <> import_id
    and status = 'completed'
    and snapshot_date >= p_effective_date;

  select count(*)
  into historical_total
  from public.tdk_approved_registry
  where first_seen_date <= p_effective_date
    and (removed_date is null or removed_date > p_effective_date);

  select count(*)
  into active_total
  from public.tdk_approved_registry
  where is_active = true;

  update public.tdk_approved_registry_imports
  set total_count = historical_total,
      added_count = 1
  where id = import_id;

  return jsonb_build_object(
    'action', 'ADDED',
    'effective_date', p_effective_date,
    'active_total', active_total,
    'record', to_jsonb(saved_record)
  );
end;
$$;

revoke all on function public.add_tdk_approved_registry_vehicle(jsonb, date) from public;
grant execute on function public.add_tdk_approved_registry_vehicle(jsonb, date) to authenticated;

comment on function public.add_tdk_approved_registry_vehicle(jsonb, date) is
  'Adds a new TDK APPROVED vehicle with an effective date on or after the official 2026-09-08 baseline date.';

notify pgrst, 'reload schema';
