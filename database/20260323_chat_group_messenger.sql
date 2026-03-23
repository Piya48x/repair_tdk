-- Enable group chat support in central messenger while keeping direct chat compatibility.

alter table public.chat_rooms
  add column if not exists room_type text,
  add column if not exists room_name text,
  add column if not exists created_by uuid references auth.users(id) on delete set null,
  add column if not exists group_avatar_url text;

update public.chat_rooms
set room_type = coalesce(nullif(room_type, ''), 'direct')
where room_type is null or room_type = '';

alter table public.chat_rooms
  alter column room_type set default 'direct';

alter table public.chat_rooms
  alter column room_type set not null;

alter table public.chat_rooms
  drop constraint if exists chat_rooms_room_type_check;

alter table public.chat_rooms
  add constraint chat_rooms_room_type_check
  check (room_type in ('direct', 'group'));

update public.chat_rooms
set created_by = coalesce(created_by, user1_id)
where created_by is null;

alter table public.chat_rooms
  drop constraint if exists chat_rooms_unique_pair;

alter table public.chat_rooms
  drop constraint if exists chat_rooms_user1_id_user2_id_key;

alter table public.chat_rooms
  drop constraint if exists chat_rooms_order_check;

alter table public.chat_rooms
  drop constraint if exists chat_rooms_direct_order_check;

drop index if exists public.chat_rooms_user1_id_user2_id_key;
drop index if exists public.chat_rooms_user1_user2_key;
drop index if exists public.chat_rooms_unique_pair_idx;
drop index if exists public.chat_rooms_unique_pair;

alter table public.chat_rooms
  add constraint chat_rooms_direct_order_check
  check (
    room_type <> 'direct'
    or user1_id::text < user2_id::text
  );

create unique index if not exists chat_rooms_direct_pair_unique_idx
  on public.chat_rooms (user1_id, user2_id)
  where room_type = 'direct';

create index if not exists chat_rooms_room_type_idx
  on public.chat_rooms (room_type);

create table if not exists public.chat_room_members (
  room_id bigint not null references public.chat_rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member',
  added_by uuid references auth.users(id) on delete set null,
  joined_at timestamp with time zone not null default timezone('utc'::text, now()),
  updated_at timestamp with time zone not null default timezone('utc'::text, now()),
  primary key (room_id, user_id),
  constraint chat_room_members_role_check check (role in ('owner', 'member'))
);

create index if not exists chat_room_members_user_idx
  on public.chat_room_members (user_id);

create index if not exists chat_room_members_room_idx
  on public.chat_room_members (room_id);

alter table public.chat_room_members enable row level security;
alter table public.chat_room_members replica identity full;

drop trigger if exists trg_chat_room_members_set_updated_at on public.chat_room_members;
create trigger trg_chat_room_members_set_updated_at
before update on public.chat_room_members
for each row
execute function public.set_row_updated_at();

insert into public.chat_room_members (room_id, user_id, role, added_by, joined_at)
select
  r.id,
  r.user1_id,
  case when r.user1_id = coalesce(r.created_by, r.user1_id) then 'owner' else 'member' end,
  coalesce(r.created_by, r.user1_id),
  coalesce(r.created_at, timezone('utc'::text, now()))
from public.chat_rooms r
on conflict (room_id, user_id) do nothing;

insert into public.chat_room_members (room_id, user_id, role, added_by, joined_at)
select
  r.id,
  r.user2_id,
  case when r.user2_id = coalesce(r.created_by, r.user1_id) then 'owner' else 'member' end,
  coalesce(r.created_by, r.user1_id),
  coalesce(r.created_at, timezone('utc'::text, now()))
from public.chat_rooms r
on conflict (room_id, user_id) do nothing;

create or replace function public.can_access_chat_room(_room_id bigint)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.chat_room_members crm
    where crm.room_id = _room_id
      and crm.user_id = auth.uid()
  );
$$;

grant execute on function public.can_access_chat_room(bigint) to authenticated;

create or replace function public.can_manage_chat_group(_room_id bigint)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.chat_rooms r
    left join public.chat_room_members crm
      on crm.room_id = r.id
     and crm.user_id = auth.uid()
    left join public.profiles p
      on p.id = auth.uid()
    where r.id = _room_id
      and r.room_type = 'group'
      and (
        r.created_by = auth.uid()
        or crm.role = 'owner'
        or lower(coalesce(p.role::text, '')) in ('admin', 'it_manager')
      )
  );
$$;

grant execute on function public.can_manage_chat_group(bigint) to authenticated;

create or replace function public.get_or_create_chat_room(_other_user_id uuid)
returns public.chat_rooms
language plpgsql
security definer
set search_path = public
as $$
declare
  _self_id uuid := auth.uid();
  _left_id uuid;
  _right_id uuid;
  _room public.chat_rooms;
begin
  if _self_id is null then
    raise exception 'Not authenticated';
  end if;

  if _other_user_id is null or _other_user_id = _self_id then
    raise exception 'Invalid target user';
  end if;

  if _self_id::text < _other_user_id::text then
    _left_id := _self_id;
    _right_id := _other_user_id;
  else
    _left_id := _other_user_id;
    _right_id := _self_id;
  end if;

  select *
  into _room
  from public.chat_rooms
  where room_type = 'direct'
    and user1_id = _left_id
    and user2_id = _right_id
  limit 1;

  if _room.id is null then
    insert into public.chat_rooms (user1_id, user2_id, room_type, created_by)
    values (_left_id, _right_id, 'direct', _self_id)
    returning * into _room;
  end if;

  insert into public.chat_room_members (room_id, user_id, role, added_by)
  values (_room.id, _self_id, 'owner', _self_id)
  on conflict (room_id, user_id) do nothing;

  insert into public.chat_room_members (room_id, user_id, role, added_by)
  values (_room.id, _other_user_id, 'member', _self_id)
  on conflict (room_id, user_id) do nothing;

  return _room;
end;
$$;

grant execute on function public.get_or_create_chat_room(uuid) to authenticated;

create or replace function public.create_chat_group(_name text, _member_ids uuid[])
returns public.chat_rooms
language plpgsql
security definer
set search_path = public
as $$
declare
  _self_id uuid := auth.uid();
  _members uuid[];
  _first_id uuid;
  _second_id uuid;
  _room public.chat_rooms;
  _room_name text := nullif(trim(coalesce(_name, '')), '');
begin
  if _self_id is null then
    raise exception 'Not authenticated';
  end if;

  select coalesce(array_agg(member_id order by member_id::text), '{}'::uuid[])
  into _members
  from (
    select distinct member_id
    from unnest(coalesce(_member_ids, '{}'::uuid[]) || array[_self_id]::uuid[]) as member_id
    where member_id is not null
  ) dedup_members;

  if coalesce(array_length(_members, 1), 0) < 2 then
    raise exception 'Group must include at least two members';
  end if;

  _first_id := _self_id;
  select member_id
  into _second_id
  from unnest(_members) as member_id
  where member_id <> _self_id
  order by member_id::text
  limit 1;

  if _second_id is null then
    raise exception 'Group must include at least one other member';
  end if;

  insert into public.chat_rooms (user1_id, user2_id, room_type, room_name, created_by)
  values (
    _first_id,
    _second_id,
    'group',
    coalesce(_room_name, 'Group chat'),
    _self_id
  )
  returning * into _room;

  insert into public.chat_room_members (room_id, user_id, role, added_by)
  select
    _room.id,
    member_id,
    case when member_id = _self_id then 'owner' else 'member' end,
    _self_id
  from unnest(_members) as member_id
  on conflict (room_id, user_id) do nothing;

  return _room;
end;
$$;

grant execute on function public.create_chat_group(text, uuid[]) to authenticated;

drop function if exists public.create_chat_group_v2(text, uuid[]);

create or replace function public.create_chat_group_v2(_name text, _member_ids uuid[])
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  _self_id uuid := auth.uid();
  _members uuid[];
  _second_id uuid;
  _room_id bigint;
  _room_name text := nullif(trim(coalesce(_name, '')), '');
begin
  if _self_id is null then
    raise exception 'Not authenticated';
  end if;

  select coalesce(array_agg(member_id order by member_id::text), '{}'::uuid[])
  into _members
  from (
    select distinct member_id
    from unnest(coalesce(_member_ids, '{}'::uuid[]) || array[_self_id]::uuid[]) as member_id
    where member_id is not null
  ) dedup_members;

  if coalesce(array_length(_members, 1), 0) < 2 then
    raise exception 'Group must include at least two members';
  end if;

  select member_id
  into _second_id
  from unnest(_members) as member_id
  where member_id <> _self_id
  order by member_id::text
  limit 1;

  if _second_id is null then
    raise exception 'Group must include at least one other member';
  end if;

  insert into public.chat_rooms (user1_id, user2_id, room_type, room_name, created_by)
  values (
    _self_id,
    _second_id,
    'group',
    coalesce(_room_name, 'Group chat'),
    _self_id
  )
  returning id into _room_id;

  insert into public.chat_room_members (room_id, user_id, role, added_by)
  select
    _room_id,
    member_id,
    case when member_id = _self_id then 'owner' else 'member' end,
    _self_id
  from unnest(_members) as member_id
  on conflict (room_id, user_id) do nothing;

  return _room_id;
end;
$$;

grant execute on function public.create_chat_group_v2(text, uuid[]) to authenticated;

drop function if exists public.update_chat_group_details(bigint, text, text, boolean);

create or replace function public.update_chat_group_details(
  _room_id bigint,
  _room_name text default null,
  _group_avatar_url text default null,
  _clear_avatar boolean default false
)
returns public.chat_rooms
language plpgsql
security definer
set search_path = public
as $$
declare
  _room public.chat_rooms;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if not public.can_manage_chat_group(_room_id) then
    raise exception 'Not allowed to manage this group';
  end if;

  update public.chat_rooms
  set
    room_name = coalesce(nullif(trim(coalesce(_room_name, '')), ''), room_name),
    group_avatar_url = case
      when _clear_avatar then null
      when nullif(trim(coalesce(_group_avatar_url, '')), '') is not null then nullif(trim(coalesce(_group_avatar_url, '')), '')
      else group_avatar_url
    end,
    updated_at = timezone('utc'::text, now())
  where id = _room_id
    and room_type = 'group'
  returning * into _room;

  if _room.id is null then
    raise exception 'Group room not found';
  end if;

  return _room;
end;
$$;

grant execute on function public.update_chat_group_details(bigint, text, text, boolean) to authenticated;

drop function if exists public.delete_chat_group(bigint);

create or replace function public.delete_chat_group(_room_id bigint)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  _deleted_count integer := 0;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if not public.can_manage_chat_group(_room_id) then
    raise exception 'Not allowed to delete this group';
  end if;

  delete from public.chat_rooms
  where id = _room_id
    and room_type = 'group';

  get diagnostics _deleted_count = row_count;
  return _deleted_count > 0;
end;
$$;

grant execute on function public.delete_chat_group(bigint) to authenticated;

drop function if exists public.get_my_chat_room_summaries();

create or replace function public.get_my_chat_room_summaries()
returns table (
  room_id bigint,
  other_user_id uuid,
  other_user_name text,
  other_user_email text,
  other_user_role text,
  other_user_avatar_url text,
  other_user_status text,
  other_user_last_seen_at timestamp with time zone,
  last_message_id bigint,
  last_message text,
  last_message_type text,
  last_message_file_url text,
  last_message_file_name text,
  last_message_created_at timestamp with time zone,
  last_message_sender_id uuid,
  unread_count bigint,
  room_type text,
  room_name text,
  group_avatar_url text,
  created_by uuid,
  my_member_role text,
  member_count integer,
  member_ids uuid[],
  member_names text
)
language sql
stable
security definer
set search_path = public
as $$
  with my_rooms as (
    select
      r.id,
      r.room_type,
      r.room_name,
      r.group_avatar_url,
      r.created_by,
      r.user1_id,
      r.user2_id,
      me.role as my_member_role,
      case
        when r.room_type = 'direct' then
          case
            when r.user1_id = auth.uid() then r.user2_id
            else r.user1_id
          end
        else null
      end as other_user_id
    from public.chat_rooms r
    join public.chat_room_members me
      on me.room_id = r.id
     and me.user_id = auth.uid()
  ),
  member_rollup as (
    select
      crm.room_id,
      count(*)::integer as member_count,
      array_agg(crm.user_id order by crm.user_id::text) as member_ids,
      string_agg(
        coalesce(
          nullif(to_jsonb(p) ->> 'full_name', ''),
          nullif(to_jsonb(p) ->> 'employee_code', ''),
          nullif(to_jsonb(p) ->> 'email', ''),
          'User'
        ),
        ', '
        order by coalesce(
          nullif(to_jsonb(p) ->> 'full_name', ''),
          nullif(to_jsonb(p) ->> 'employee_code', ''),
          nullif(to_jsonb(p) ->> 'email', ''),
          'User'
        )
      ) as member_names
    from public.chat_room_members crm
    left join public.profiles p on p.id = crm.user_id
    where crm.room_id in (select id from my_rooms)
    group by crm.room_id
  ),
  peer_rollup as (
    select
      crm.room_id,
      string_agg(
        coalesce(
          nullif(to_jsonb(p) ->> 'full_name', ''),
          nullif(to_jsonb(p) ->> 'employee_code', ''),
          nullif(to_jsonb(p) ->> 'email', ''),
          'User'
        ),
        ', '
        order by coalesce(
          nullif(to_jsonb(p) ->> 'full_name', ''),
          nullif(to_jsonb(p) ->> 'employee_code', ''),
          nullif(to_jsonb(p) ->> 'email', ''),
          'User'
        )
      ) as peer_names
    from public.chat_room_members crm
    left join public.profiles p on p.id = crm.user_id
    where crm.room_id in (select id from my_rooms)
      and crm.user_id <> auth.uid()
    group by crm.room_id
  ),
  group_presence as (
    select
      crm.room_id,
      case
        when bool_or(cp.last_seen_at > timezone('utc'::text, now()) - interval '90 seconds') then 'online'
        else 'offline'
      end as status,
      max(cp.last_seen_at) as last_seen_at
    from public.chat_room_members crm
    left join public.chat_presence cp
      on cp.user_id = crm.user_id
     and crm.user_id <> auth.uid()
    where crm.room_id in (select id from my_rooms)
    group by crm.room_id
  )
  select
    mr.id as room_id,
    mr.other_user_id,
    case
      when mr.room_type = 'group' then coalesce(nullif(mr.room_name, ''), peer.peer_names, 'Group chat')
      else dir.name
    end as other_user_name,
    case
      when mr.room_type = 'group' then ''
      else dir.email
    end as other_user_email,
    case
      when mr.room_type = 'group' then 'group'
      else dir.role
    end as other_user_role,
    case
      when mr.room_type = 'group' then ''
      else dir.avatar_url
    end as other_user_avatar_url,
    case
      when mr.room_type = 'group' then coalesce(gp.status, 'offline')
      else dir.status
    end as other_user_status,
    case
      when mr.room_type = 'group' then gp.last_seen_at
      else dir.last_seen_at
    end as other_user_last_seen_at,
    lm.id as last_message_id,
    lm.message as last_message,
    lm.type as last_message_type,
    lm.file_url as last_message_file_url,
    lm.file_name as last_message_file_name,
    lm.created_at as last_message_created_at,
    lm.sender_id as last_message_sender_id,
    coalesce(uc.unread_count, 0) as unread_count,
    mr.room_type,
    case
      when mr.room_type = 'group' then coalesce(nullif(mr.room_name, ''), peer.peer_names, 'Group chat')
      else null
    end as room_name,
    case
      when mr.room_type = 'group' then coalesce(nullif(mr.group_avatar_url, ''), '')
      else ''
    end as group_avatar_url,
    mr.created_by,
    coalesce(mr.my_member_role, '') as my_member_role,
    coalesce(member_rollup.member_count, 0) as member_count,
    coalesce(member_rollup.member_ids, '{}'::uuid[]) as member_ids,
    coalesce(member_rollup.member_names, '') as member_names
  from my_rooms mr
  left join lateral (
    select *
    from public.get_user_directory() dir
    where dir.id = mr.other_user_id
    limit 1
  ) dir on true
  left join peer_rollup peer on peer.room_id = mr.id
  left join group_presence gp on gp.room_id = mr.id
  left join member_rollup on member_rollup.room_id = mr.id
  left join lateral (
    select m.id, m.message, m.type, m.file_url, m.file_name, m.created_at, m.sender_id
    from public.chat_messages m
    where m.room_id = mr.id
    order by m.created_at desc
    limit 1
  ) lm on true
  left join lateral (
    select count(*) as unread_count
    from public.chat_messages m
    where m.room_id = mr.id
      and m.sender_id <> auth.uid()
      and coalesce(m.read_status, false) = false
  ) uc on true
  order by coalesce(lm.created_at, timezone('utc'::text, now()) - interval '100 years') desc;
$$;

grant execute on function public.get_my_chat_room_summaries() to authenticated;

drop policy if exists chat_rooms_select_policy on public.chat_rooms;
create policy chat_rooms_select_policy
  on public.chat_rooms
  for select
  to authenticated
  using (
    public.can_access_chat_room(id)
    or created_by = auth.uid()
    or user1_id = auth.uid()
    or (room_type = 'direct' and user2_id = auth.uid())
  );

drop policy if exists chat_rooms_insert_policy on public.chat_rooms;
create policy chat_rooms_insert_policy
  on public.chat_rooms
  for insert
  to authenticated
  with check (
    created_by = auth.uid()
    or user1_id = auth.uid()
    or (room_type = 'direct' and user2_id = auth.uid())
  );

drop policy if exists chat_rooms_update_policy on public.chat_rooms;
create policy chat_rooms_update_policy
  on public.chat_rooms
  for update
  to authenticated
  using (
    (room_type = 'direct' and public.can_access_chat_room(id))
    or public.can_manage_chat_group(id)
  )
  with check (
    (room_type = 'direct' and public.can_access_chat_room(id))
    or public.can_manage_chat_group(id)
  );

drop policy if exists chat_rooms_delete_policy on public.chat_rooms;
create policy chat_rooms_delete_policy
  on public.chat_rooms
  for delete
  to authenticated
  using (public.can_manage_chat_group(id));

drop policy if exists chat_room_members_select_policy on public.chat_room_members;
create policy chat_room_members_select_policy
  on public.chat_room_members
  for select
  to authenticated
  using (public.can_access_chat_room(room_id));

drop policy if exists chat_room_members_insert_policy on public.chat_room_members;
create policy chat_room_members_insert_policy
  on public.chat_room_members
  for insert
  to authenticated
  with check (
    public.can_manage_chat_group(room_id)
    or exists (
      select 1
      from public.chat_rooms rooms
      where rooms.id = room_id
        and rooms.created_by = auth.uid()
    )
  );

drop policy if exists chat_room_members_update_policy on public.chat_room_members;
create policy chat_room_members_update_policy
  on public.chat_room_members
  for update
  to authenticated
  using (public.can_manage_chat_group(room_id))
  with check (public.can_manage_chat_group(room_id));

drop policy if exists chat_room_members_delete_policy on public.chat_room_members;
create policy chat_room_members_delete_policy
  on public.chat_room_members
  for delete
  to authenticated
  using (public.can_manage_chat_group(room_id));

grant select, insert, update, delete on public.chat_rooms to authenticated;
grant select, insert, update, delete on public.chat_room_members to authenticated;
grant usage, select on sequence public.chat_rooms_id_seq to authenticated;

drop policy if exists chat_files_insert_policy on storage.objects;
create policy chat_files_insert_policy
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'chat-files'
    and coalesce((storage.foldername(name))[1], '') in ('direct', 'group')
  );

do $$
begin
  alter publication supabase_realtime add table public.chat_room_members;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;

notify pgrst, 'reload schema';
