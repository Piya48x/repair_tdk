-- Link new IT asset movement records to the Asset Registry and update the
-- current owner/location/status in one database transaction.
-- Run after:
--   20260315_reports_schema.sql
--   20260713_it_asset_evidence_and_history.sql
--   20260729_it_asset_qr_center.sql
--   20260822_it_asset_move_history.sql

begin;

alter table public.it_asset_moves
  add column if not exists asset_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.it_asset_moves'::regclass
      and conname = 'it_asset_moves_asset_id_fkey'
  ) then
    alter table public.it_asset_moves
      add constraint it_asset_moves_asset_id_fkey
      foreign key (asset_id)
      references public.it_assets(id)
      on delete restrict;
  end if;
end
$$;

create index if not exists idx_it_asset_moves_asset_id
  on public.it_asset_moves (asset_id, performed_at desc);

create or replace function public.create_it_asset_move_and_sync_registry(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  asset_before public.it_assets%rowtype;
  asset_after public.it_assets%rowtype;
  saved_move public.it_asset_moves%rowtype;
  target_code text;
  target_owner text;
  target_location text;
  target_status text;
  target_owner_profile_id uuid;
  target_owner_employee_code text;
  owner_match_count integer := 0;
  actor_name text;
begin
  if not public.is_it_asset_move_manager() then
    raise exception 'You do not have permission to create an IT asset movement'
      using errcode = '42501';
  end if;

  if p_payload is null or jsonb_typeof(p_payload) <> 'object' then
    raise exception 'Movement payload must be a JSON object';
  end if;

  target_code := upper(regexp_replace(trim(coalesce(p_payload ->> 'asset_code', '')), '\s+', '', 'g'));
  if target_code = '' then
    raise exception 'Asset Code is required';
  end if;

  select asset.*
  into asset_before
  from public.it_assets asset
  where lower(trim(asset.asset_tag)) = lower(target_code)
  for update;

  if not found then
    raise exception 'Asset Code % was not found in IT Asset Management', target_code;
  end if;

  select coalesce(
    nullif(trim(to_jsonb(profile) ->> 'full_name'), ''),
    nullif(trim(to_jsonb(profile) ->> 'email'), ''),
    auth.uid()::text
  )
  into actor_name
  from public.profiles profile
  where profile.id = auth.uid();

  actor_name := coalesce(actor_name, auth.uid()::text);

  insert into public.it_asset_moves (
    performed_at,
    move_type,
    requester_profile_id,
    requester_name,
    requester_employee_code,
    ticket_reference,
    operator_profile_id,
    operator_name,
    device_type,
    custom_device_type,
    asset_id,
    asset_code,
    serial_number,
    brand_model,
    old_user_name,
    old_factory,
    old_building,
    old_floor,
    old_department,
    old_desk,
    new_user_name,
    new_to_it_stock,
    new_factory,
    new_building,
    new_floor,
    new_department,
    new_desk,
    condition_status,
    condition_details,
    accessories,
    accessory_other,
    before_images,
    after_images,
    notes,
    created_by,
    created_by_name
  ) values (
    coalesce(nullif(p_payload ->> 'performed_at', '')::timestamptz, timezone('utc', now())),
    trim(coalesce(p_payload ->> 'move_type', 'move')),
    nullif(p_payload ->> 'requester_profile_id', '')::uuid,
    trim(coalesce(p_payload ->> 'requester_name', '')),
    trim(coalesce(p_payload ->> 'requester_employee_code', '')),
    trim(coalesce(p_payload ->> 'ticket_reference', '')),
    auth.uid(),
    actor_name,
    trim(coalesce(p_payload ->> 'device_type', 'other')),
    trim(coalesce(p_payload ->> 'custom_device_type', '')),
    asset_before.id,
    asset_before.asset_tag,
    upper(trim(coalesce(p_payload ->> 'serial_number', ''))),
    trim(coalesce(p_payload ->> 'brand_model', '')),
    trim(coalesce(p_payload ->> 'old_user_name', '')),
    trim(coalesce(p_payload ->> 'old_factory', '')),
    trim(coalesce(p_payload ->> 'old_building', '')),
    trim(coalesce(p_payload ->> 'old_floor', '')),
    trim(coalesce(p_payload ->> 'old_department', '')),
    trim(coalesce(p_payload ->> 'old_desk', '')),
    trim(coalesce(p_payload ->> 'new_user_name', '')),
    coalesce((p_payload ->> 'new_to_it_stock')::boolean, false),
    trim(coalesce(p_payload ->> 'new_factory', '')),
    trim(coalesce(p_payload ->> 'new_building', '')),
    trim(coalesce(p_payload ->> 'new_floor', '')),
    trim(coalesce(p_payload ->> 'new_department', '')),
    trim(coalesce(p_payload ->> 'new_desk', '')),
    trim(coalesce(p_payload ->> 'condition_status', 'normal')),
    trim(coalesce(p_payload ->> 'condition_details', '')),
    coalesce(
      array(select jsonb_array_elements_text(coalesce(p_payload -> 'accessories', '[]'::jsonb))),
      '{}'::text[]
    ),
    trim(coalesce(p_payload ->> 'accessory_other', '')),
    coalesce(p_payload -> 'before_images', '[]'::jsonb),
    coalesce(p_payload -> 'after_images', '[]'::jsonb),
    trim(coalesce(p_payload ->> 'notes', '')),
    auth.uid(),
    actor_name
  )
  returning * into saved_move;

  target_owner := case
    when saved_move.new_to_it_stock then 'คลัง IT'
    else nullif(trim(saved_move.new_user_name), '')
  end;

  target_location := concat_ws(
    ' / ',
    nullif(trim(saved_move.new_factory), ''),
    nullif(trim(saved_move.new_building), ''),
    nullif(trim(saved_move.new_floor), ''),
    nullif(trim(saved_move.new_department), ''),
    nullif(trim(saved_move.new_desk), '')
  );

  target_status := case
    when saved_move.move_type = 'retire' then 'retired'
    when saved_move.move_type = 'send_repair' then 'repair'
    when saved_move.move_type = 'return' then 'spare'
    when saved_move.new_to_it_stock then 'spare'
    when saved_move.move_type in ('move', 'swap_user') then 'assigned'
    else asset_before.status
  end;

  if not saved_move.new_to_it_stock and target_owner is not null then
    select
      count(*)::integer,
      (array_agg(profile.id order by profile.id))[1],
      (array_agg(nullif(trim(to_jsonb(profile) ->> 'employee_code'), '') order by profile.id))[1]
    into owner_match_count, target_owner_profile_id, target_owner_employee_code
    from public.profiles profile
    where lower(trim(coalesce(to_jsonb(profile) ->> 'full_name', ''))) = lower(target_owner)
      and coalesce((to_jsonb(profile) ->> 'is_active')::boolean, true);

    if owner_match_count <> 1 then
      target_owner_profile_id := null;
      target_owner_employee_code := null;
    end if;
  end if;

  update public.it_assets
  set
    owner_name = target_owner,
    owner_profile_id = target_owner_profile_id,
    owner_employee_code = target_owner_employee_code,
    location = nullif(target_location, ''),
    factory = nullif(trim(saved_move.new_factory), ''),
    building = nullif(trim(saved_move.new_building), ''),
    floor = nullif(trim(saved_move.new_floor), ''),
    room = nullif(trim(saved_move.new_desk), ''),
    department = nullif(trim(saved_move.new_department), ''),
    status = target_status,
    updated_at = timezone('utc', now())
  where id = asset_before.id
  returning * into asset_after;

  insert into public.it_asset_activity_logs (
    asset_id,
    action,
    summary,
    changes,
    snapshot,
    created_by,
    created_by_name
  ) values (
    asset_after.id,
    'updated',
    format('Synced from movement %s', saved_move.move_id),
    jsonb_build_object(
      'source', 'asset_move',
      'move_id', saved_move.move_id,
      'move_record_id', saved_move.id,
      'move_type', saved_move.move_type,
      'before', to_jsonb(asset_before),
      'after', to_jsonb(asset_after)
    ),
    to_jsonb(asset_after),
    auth.uid(),
    actor_name
  );

  return to_jsonb(saved_move);
end;
$$;

revoke all on function public.create_it_asset_move_and_sync_registry(jsonb) from public;
grant execute on function public.create_it_asset_move_and_sync_registry(jsonb) to authenticated;

comment on function public.create_it_asset_move_and_sync_registry(jsonb) is
  'Creates immutable movement history and synchronizes the linked IT Asset Registry record atomically.';

-- Asset Management already listens for changes on this table. Ensure the
-- master record update reaches every open dashboard without a manual refresh.
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'it_assets'
  ) then
    alter publication supabase_realtime add table public.it_assets;
  end if;
end
$$;

notify pgrst, 'reload schema';

commit;
