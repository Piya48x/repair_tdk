-- Remove legacy temporary Asset Codes before importing the official Excel register.
-- Targets ONLY PC-<number>, NB-<number> and MN-<number>.
-- Official codes such as CPUTDK0011, NTDK0001 and MTDK0001 are not deleted.
-- A private JSONB backup is created before the delete runs.

begin;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists private.it_asset_cleanup_backups (
  batch_id text not null,
  entity_type text not null,
  entity_id text not null,
  payload jsonb not null,
  archived_at timestamptz not null default timezone('utc', now()),
  primary key (batch_id, entity_type, entity_id)
);

revoke all on table private.it_asset_cleanup_backups from public, anon, authenticated;
alter table private.it_asset_cleanup_backups enable row level security;

create temporary table legacy_asset_cleanup_targets
on commit drop
as
select
  a.id,
  a.asset_tag,
  a.asset_category
from public.it_assets a
where upper(trim(a.asset_tag)) ~ '^(PC|NB|MN)-[0-9]+$';

do $$
declare
  target_count integer;
begin
  select count(*) into target_count from pg_temp.legacy_asset_cleanup_targets;

  if target_count > 1000 then
    raise exception 'Safety stop: % legacy assets matched; expected no more than 1000', target_count;
  end if;
end;
$$;

-- Back up the master Asset rows.
insert into private.it_asset_cleanup_backups (
  batch_id, entity_type, entity_id, payload
)
select
  'LEGACY-ASSET-CLEANUP-20260827',
  'it_assets',
  a.id::text,
  to_jsonb(a)
from public.it_assets a
join pg_temp.legacy_asset_cleanup_targets target on target.id = a.id
on conflict (batch_id, entity_type, entity_id) do nothing;

-- Back up evidence rows that will be removed by ON DELETE CASCADE.
do $$
begin
  if to_regclass('public.it_asset_attachments') is not null then
    execute $backup$
      insert into private.it_asset_cleanup_backups (
        batch_id, entity_type, entity_id, payload
      )
      select
        'LEGACY-ASSET-CLEANUP-20260827',
        'it_asset_attachments',
        attachment.id::text,
        to_jsonb(attachment)
      from public.it_asset_attachments attachment
      join pg_temp.legacy_asset_cleanup_targets target
        on target.id = attachment.asset_id
      on conflict (batch_id, entity_type, entity_id) do nothing
    $backup$;
  end if;
end;
$$;

-- Back up activity history that will be removed by ON DELETE CASCADE.
do $$
begin
  if to_regclass('public.it_asset_activity_logs') is not null then
    execute $backup$
      insert into private.it_asset_cleanup_backups (
        batch_id, entity_type, entity_id, payload
      )
      select
        'LEGACY-ASSET-CLEANUP-20260827',
        'it_asset_activity_logs',
        activity.id::text,
        to_jsonb(activity)
      from public.it_asset_activity_logs activity
      join pg_temp.legacy_asset_cleanup_targets target
        on target.id = activity.asset_id
      on conflict (batch_id, entity_type, entity_id) do nothing
    $backup$;
  end if;
end;
$$;

-- Back up previous code aliases that will be removed by ON DELETE CASCADE.
do $$
begin
  if to_regclass('public.it_asset_code_aliases') is not null then
    execute $backup$
      insert into private.it_asset_cleanup_backups (
        batch_id, entity_type, entity_id, payload
      )
      select
        'LEGACY-ASSET-CLEANUP-20260827',
        'it_asset_code_aliases',
        code_alias.id::text,
        to_jsonb(code_alias)
      from public.it_asset_code_aliases code_alias
      join pg_temp.legacy_asset_cleanup_targets target
        on target.id = code_alias.asset_id
      on conflict (batch_id, entity_type, entity_id) do nothing
    $backup$;
  end if;
end;
$$;

-- Audit snapshots remain, but their asset_id becomes NULL. Save the original link.
do $$
begin
  if to_regclass('public.it_asset_audit_items') is not null then
    execute $backup$
      insert into private.it_asset_cleanup_backups (
        batch_id, entity_type, entity_id, payload
      )
      select
        'LEGACY-ASSET-CLEANUP-20260827',
        'it_asset_audit_item_links',
        audit_item.id::text,
        jsonb_build_object(
          'audit_item_id', audit_item.id,
          'asset_id', audit_item.asset_id,
          'asset_tag_snapshot', audit_item.asset_tag_snapshot
        )
      from public.it_asset_audit_items audit_item
      join pg_temp.legacy_asset_cleanup_targets target
        on target.id = audit_item.asset_id
      on conflict (batch_id, entity_type, entity_id) do nothing
    $backup$;
  end if;
end;
$$;

-- Do not continue unless every target Asset has a backup row.
do $$
declare
  target_count integer;
  backup_count integer;
begin
  select count(*) into target_count from pg_temp.legacy_asset_cleanup_targets;
  select count(*)
  into backup_count
  from private.it_asset_cleanup_backups backup
  join pg_temp.legacy_asset_cleanup_targets target
    on target.id::text = backup.entity_id
  where backup.batch_id = 'LEGACY-ASSET-CLEANUP-20260827'
    and backup.entity_type = 'it_assets';

  if backup_count <> target_count then
    raise exception 'Safety stop: backed up % of % target Assets', backup_count, target_count;
  end if;
end;
$$;

delete from public.it_assets asset
using pg_temp.legacy_asset_cleanup_targets target
where asset.id = target.id;

-- Supabase SQL Editor shows this result after a successful cleanup.
select
  count(*)::integer as deleted_legacy_assets,
  count(*) filter (where upper(trim(asset_tag)) like 'PC-%')::integer as deleted_pc,
  count(*) filter (where upper(trim(asset_tag)) like 'NB-%')::integer as deleted_notebook,
  count(*) filter (where upper(trim(asset_tag)) like 'MN-%')::integer as deleted_monitor
from pg_temp.legacy_asset_cleanup_targets;

commit;

