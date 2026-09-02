-- Link repair tickets created from an Asset QR sticker to the IT asset registry.
-- Safe to run multiple times.

begin;

alter table if exists public.tickets
  add column if not exists asset_id uuid,
  add column if not exists asset_code text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.tickets'::regclass
      and conname = 'tickets_asset_id_fkey'
  ) then
    alter table public.tickets
      add constraint tickets_asset_id_fkey
      foreign key (asset_id)
      references public.it_assets(id)
      on delete set null;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.tickets'::regclass
      and conname = 'tickets_asset_code_when_linked_check'
  ) then
    alter table public.tickets
      add constraint tickets_asset_code_when_linked_check
      check (asset_id is null or length(trim(coalesce(asset_code, ''))) > 0);
  end if;
end
$$;

create index if not exists tickets_asset_id_created_idx
  on public.tickets (asset_id, created_at desc)
  where asset_id is not null;

create index if not exists tickets_asset_code_created_idx
  on public.tickets (upper(trim(asset_code)), created_at desc)
  where length(trim(coalesce(asset_code, ''))) > 0;

create or replace function public.sync_ticket_asset_code()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  current_asset_code text;
begin
  if new.asset_id is null then
    -- Keep the code snapshot if an asset is removed and the FK sets asset_id to null.
    return new;
  end if;

  select a.asset_tag
  into current_asset_code
  from public.it_assets a
  where a.id = new.asset_id;

  if current_asset_code is null then
    raise exception 'Linked IT asset does not exist';
  end if;

  new.asset_code := current_asset_code;
  return new;
end;
$$;

drop trigger if exists trg_sync_ticket_asset_code on public.tickets;
create trigger trg_sync_ticket_asset_code
before insert or update of asset_id, asset_code on public.tickets
for each row
execute function public.sync_ticket_asset_code();

create or replace function public.log_ticket_asset_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_name text;
  asset_snapshot jsonb;
begin
  if new.asset_id is null then
    return new;
  end if;

  select coalesce(
    nullif(trim(to_jsonb(p) ->> 'full_name'), ''),
    nullif(trim(to_jsonb(p) ->> 'email'), ''),
    new.reporter_name,
    auth.uid()::text
  )
  into actor_name
  from public.profiles p
  where p.id = auth.uid();

  select to_jsonb(a)
  into asset_snapshot
  from public.it_assets a
  where a.id = new.asset_id;

  insert into public.it_asset_activity_logs (
    asset_id,
    action,
    summary,
    changes,
    snapshot,
    created_by,
    created_by_name
  ) values (
    new.asset_id,
    'updated',
    format(
      'Repair ticket %s created from Asset QR',
      coalesce(to_jsonb(new) ->> 'ticket_no', new.id::text)
    ),
    jsonb_build_object(
      'source', 'asset_qr_repair_ticket',
      'ticket_id', new.id,
      'ticket_no', to_jsonb(new) ->> 'ticket_no',
      'asset_code', new.asset_code,
      'status', new.status
    ),
    coalesce(asset_snapshot, '{}'::jsonb),
    auth.uid(),
    coalesce(actor_name, new.reporter_name, auth.uid()::text)
  );

  return new;
end;
$$;

drop trigger if exists trg_log_ticket_asset_activity on public.tickets;
create trigger trg_log_ticket_asset_activity
after insert on public.tickets
for each row
when (new.asset_id is not null)
execute function public.log_ticket_asset_activity();

-- Authenticated employees can read one scanned Asset profile through this RPC.
-- It avoids granting the ordinary user role access to the complete asset table.
create or replace function public.get_asset_qr_detail(p_asset_tag text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  normalized_tag text := lower(trim(coalesce(p_asset_tag, '')));
  result jsonb;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required' using errcode = '42501';
  end if;

  if normalized_tag = '' then
    return null;
  end if;

  if not exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and coalesce((to_jsonb(p) ->> 'is_active')::boolean, true)
  ) then
    raise exception 'Active employee profile is required' using errcode = '42501';
  end if;

  select
    (to_jsonb(a) - 'created_by')
    || jsonb_build_object(
      'it_asset_attachments', coalesce((
        select jsonb_agg(to_jsonb(att) - 'uploaded_by' order by att.created_at asc)
        from public.it_asset_attachments att
        where att.asset_id = a.id
      ), '[]'::jsonb),
      'owner_profile', (
        select jsonb_strip_nulls(jsonb_build_object(
          'id', p.id,
          'full_name', to_jsonb(p) ->> 'full_name',
          'employee_code', to_jsonb(p) ->> 'employee_code',
          'department', to_jsonb(p) ->> 'department',
          'avatar_url', to_jsonb(p) ->> 'avatar_url',
          'id_card_url', to_jsonb(p) ->> 'id_card_url'
        ))
        from public.profiles p
        where p.id = a.owner_profile_id
      )
    )
  into result
  from public.it_assets a
  where lower(trim(a.asset_tag)) = normalized_tag
     or exists (
       select 1
       from public.it_asset_code_aliases code_alias
       where code_alias.asset_id = a.id
         and lower(trim(code_alias.old_asset_code)) = normalized_tag
     )
  order by case when lower(trim(a.asset_tag)) = normalized_tag then 0 else 1 end
  limit 1;

  return result;
end;
$$;

revoke all on function public.get_asset_qr_detail(text) from public;
grant execute on function public.get_asset_qr_detail(text) to authenticated;

comment on column public.tickets.asset_id is
  'IT asset registry record linked to this repair ticket.';

comment on column public.tickets.asset_code is
  'Asset Code snapshot captured when the repair ticket was created.';

comment on function public.get_asset_qr_detail(text) is
  'Returns one scanned IT asset profile to an authenticated active employee without exposing the asset registry.';

notify pgrst, 'reload schema';

commit;
