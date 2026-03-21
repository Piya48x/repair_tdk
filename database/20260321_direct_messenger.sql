-- Direct messenger for user/admin/IT communication.
-- Run this in Supabase SQL Editor before using the popup messenger UI.

create table if not exists public.chat_rooms (
  id bigint generated always as identity primary key,
  user1_id uuid not null references auth.users(id) on delete cascade,
  user2_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamp with time zone not null default timezone('utc'::text, now()),
  updated_at timestamp with time zone not null default timezone('utc'::text, now()),
  last_message_at timestamp with time zone,
  constraint chat_rooms_distinct_users_check check (user1_id <> user2_id),
  constraint chat_rooms_order_check check (user1_id::text < user2_id::text),
  constraint chat_rooms_unique_pair unique (user1_id, user2_id)
);

create table if not exists public.chat_messages (
  id bigint generated always as identity primary key,
  room_id bigint not null references public.chat_rooms(id) on delete cascade,
  sender_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  message text,
  type text not null default 'text',
  file_url text,
  file_name text,
  file_mime_type text,
  file_size bigint,
  created_at timestamp with time zone not null default timezone('utc'::text, now()),
  read_status boolean not null default false,
  read_at timestamp with time zone,
  constraint chat_messages_type_check check (type in ('text', 'image', 'file')),
  constraint chat_messages_content_check check (
    (message is not null and length(trim(message)) > 0)
    or file_url is not null
  )
);

create table if not exists public.chat_presence (
  user_id uuid primary key references auth.users(id) on delete cascade,
  last_seen_at timestamp with time zone not null default timezone('utc'::text, now()),
  updated_at timestamp with time zone not null default timezone('utc'::text, now())
);

create index if not exists chat_rooms_last_message_idx
  on public.chat_rooms (coalesce(last_message_at, updated_at) desc);

create index if not exists chat_messages_room_created_idx
  on public.chat_messages (room_id, created_at asc);

create index if not exists chat_messages_room_unread_idx
  on public.chat_messages (room_id, read_status, created_at desc);

alter table public.chat_rooms enable row level security;
alter table public.chat_messages enable row level security;
alter table public.chat_presence enable row level security;

alter table public.chat_rooms replica identity full;
alter table public.chat_messages replica identity full;
alter table public.chat_presence replica identity full;

create or replace function public.set_row_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$;

drop trigger if exists trg_chat_rooms_set_updated_at on public.chat_rooms;
create trigger trg_chat_rooms_set_updated_at
before update on public.chat_rooms
for each row
execute function public.set_row_updated_at();

drop trigger if exists trg_chat_presence_set_updated_at on public.chat_presence;
create trigger trg_chat_presence_set_updated_at
before update on public.chat_presence
for each row
execute function public.set_row_updated_at();

create or replace function public.touch_chat_room_last_message()
returns trigger
language plpgsql
as $$
begin
  update public.chat_rooms
  set
    last_message_at = new.created_at,
    updated_at = timezone('utc'::text, now())
  where id = new.room_id;
  return new;
end;
$$;

create or replace function public.enforce_chat_message_sender()
returns trigger
language plpgsql
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  new.sender_id = auth.uid();
  return new;
end;
$$;

drop trigger if exists trg_chat_messages_enforce_sender on public.chat_messages;
create trigger trg_chat_messages_enforce_sender
before insert on public.chat_messages
for each row
execute function public.enforce_chat_message_sender();

drop trigger if exists trg_chat_messages_touch_room on public.chat_messages;
create trigger trg_chat_messages_touch_room
after insert on public.chat_messages
for each row
execute function public.touch_chat_room_last_message();

create or replace function public.can_access_chat_room(_room_id bigint)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.chat_rooms r
    where r.id = _room_id
      and auth.uid() in (r.user1_id, r.user2_id)
  );
$$;

grant execute on function public.can_access_chat_room(bigint) to authenticated;

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
  where user1_id = _left_id
    and user2_id = _right_id
  limit 1;

  if _room.id is null then
    insert into public.chat_rooms (user1_id, user2_id)
    values (_left_id, _right_id)
    returning * into _room;
  end if;

  return _room;
end;
$$;

grant execute on function public.get_or_create_chat_room(uuid) to authenticated;

create or replace function public.mark_room_messages_read(_room_id bigint)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  _updated_count integer := 0;
begin
  if not public.can_access_chat_room(_room_id) then
    return 0;
  end if;

  update public.chat_messages
  set
    read_status = true,
    read_at = timezone('utc'::text, now())
  where room_id = _room_id
    and sender_id <> auth.uid()
    and coalesce(read_status, false) = false;

  get diagnostics _updated_count = row_count;
  return _updated_count;
end;
$$;

grant execute on function public.mark_room_messages_read(bigint) to authenticated;

create or replace function public.touch_chat_presence()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return;
  end if;

  insert into public.chat_presence (user_id, last_seen_at)
  values (auth.uid(), timezone('utc'::text, now()))
  on conflict (user_id)
  do update set
    last_seen_at = excluded.last_seen_at,
    updated_at = timezone('utc'::text, now());
end;
$$;

grant execute on function public.touch_chat_presence() to authenticated;

create or replace function public.get_user_directory()
returns table (
  id uuid,
  name text,
  email text,
  role text,
  avatar_url text,
  status text,
  last_seen_at timestamp with time zone
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.id,
    coalesce(
      nullif(to_jsonb(p) ->> 'full_name', ''),
      nullif(to_jsonb(p) ->> 'employee_code', ''),
      nullif(to_jsonb(p) ->> 'email', ''),
      'User'
    ) as name,
    coalesce(nullif(to_jsonb(p) ->> 'email', ''), '') as email,
    coalesce(nullif(to_jsonb(p) ->> 'role', ''), 'user') as role,
    coalesce(
      nullif(to_jsonb(p) ->> 'avatar_url', ''),
      nullif(to_jsonb(p) ->> 'id_card_url', ''),
      ''
    ) as avatar_url,
    case
      when cp.last_seen_at is not null
        and cp.last_seen_at > timezone('utc'::text, now()) - interval '90 seconds'
      then 'online'
      else 'offline'
    end as status,
    cp.last_seen_at
  from public.profiles p
  left join public.chat_presence cp on cp.user_id = p.id
  order by
    case
      when cp.last_seen_at is not null
        and cp.last_seen_at > timezone('utc'::text, now()) - interval '90 seconds'
      then 0
      else 1
    end,
    coalesce(
      nullif(to_jsonb(p) ->> 'full_name', ''),
      nullif(to_jsonb(p) ->> 'employee_code', ''),
      nullif(to_jsonb(p) ->> 'email', ''),
      'User'
    );
$$;

grant execute on function public.get_user_directory() to authenticated;

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
  unread_count bigint
)
language sql
stable
security definer
set search_path = public
as $$
  with my_rooms as (
    select
      r.id,
      case
        when r.user1_id = auth.uid() then r.user2_id
        else r.user1_id
      end as other_user_id
    from public.chat_rooms r
    where auth.uid() in (r.user1_id, r.user2_id)
  )
  select
    mr.id as room_id,
    mr.other_user_id,
    dir.name as other_user_name,
    dir.email as other_user_email,
    dir.role as other_user_role,
    dir.avatar_url as other_user_avatar_url,
    dir.status as other_user_status,
    dir.last_seen_at as other_user_last_seen_at,
    lm.id as last_message_id,
    lm.message as last_message,
    lm.type as last_message_type,
    lm.file_url as last_message_file_url,
    lm.file_name as last_message_file_name,
    lm.created_at as last_message_created_at,
    lm.sender_id as last_message_sender_id,
    coalesce(uc.unread_count, 0) as unread_count
  from my_rooms mr
  left join lateral (
    select *
    from public.get_user_directory() dir
    where dir.id = mr.other_user_id
    limit 1
  ) dir on true
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

drop view if exists public.users;
create view public.users as
select *
from public.get_user_directory();

grant select on public.users to authenticated;

drop policy if exists chat_rooms_select_policy on public.chat_rooms;
create policy chat_rooms_select_policy
  on public.chat_rooms
  for select
  to authenticated
  using (auth.uid() in (user1_id, user2_id));

drop policy if exists chat_rooms_insert_policy on public.chat_rooms;
create policy chat_rooms_insert_policy
  on public.chat_rooms
  for insert
  to authenticated
  with check (auth.uid() in (user1_id, user2_id));

drop policy if exists chat_messages_select_policy on public.chat_messages;
create policy chat_messages_select_policy
  on public.chat_messages
  for select
  to authenticated
  using (public.can_access_chat_room(room_id));

drop policy if exists chat_messages_insert_policy on public.chat_messages;
create policy chat_messages_insert_policy
  on public.chat_messages
  for insert
  to authenticated
  with check (public.can_access_chat_room(room_id));

drop policy if exists chat_messages_update_policy on public.chat_messages;
create policy chat_messages_update_policy
  on public.chat_messages
  for update
  to authenticated
  using (public.can_access_chat_room(room_id))
  with check (public.can_access_chat_room(room_id));

drop policy if exists chat_presence_select_policy on public.chat_presence;
create policy chat_presence_select_policy
  on public.chat_presence
  for select
  to authenticated
  using (true);

drop policy if exists chat_presence_insert_policy on public.chat_presence;
create policy chat_presence_insert_policy
  on public.chat_presence
  for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists chat_presence_update_policy on public.chat_presence;
create policy chat_presence_update_policy
  on public.chat_presence
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

grant select, insert on public.chat_rooms to authenticated;
grant select, insert, update on public.chat_messages to authenticated;
grant select, insert, update on public.chat_presence to authenticated;

grant usage, select on sequence public.chat_rooms_id_seq to authenticated;
grant usage, select on sequence public.chat_messages_id_seq to authenticated;

insert into storage.buckets (id, name, public, file_size_limit)
values ('chat-files', 'chat-files', true, 20971520)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'chat_files_select_policy'
  ) then
    create policy chat_files_select_policy
      on storage.objects
      for select
      to authenticated
      using (bucket_id = 'chat-files');
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'chat_files_insert_policy'
  ) then
    create policy chat_files_insert_policy
      on storage.objects
      for insert
      to authenticated
      with check (
        bucket_id = 'chat-files'
        and (storage.foldername(name))[1] = 'direct'
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'chat_files_update_policy'
  ) then
    create policy chat_files_update_policy
      on storage.objects
      for update
      to authenticated
      using (bucket_id = 'chat-files')
      with check (bucket_id = 'chat-files');
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'chat_files_delete_policy'
  ) then
    create policy chat_files_delete_policy
      on storage.objects
      for delete
      to authenticated
      using (bucket_id = 'chat-files');
  end if;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.chat_rooms;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.chat_messages;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.chat_presence;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;
