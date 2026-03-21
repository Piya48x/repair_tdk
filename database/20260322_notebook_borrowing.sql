-- Notebook borrow / return workflow for dashboard and admin dashboard.
-- Run this in Supabase SQL Editor after the existing auth/profile schema is present.

create or replace function public.set_row_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$;

create table if not exists public.notebooks (
  id bigint generated always as identity primary key,
  asset_code text not null unique,
  model text not null,
  status text not null default 'available',
  current_user_id uuid references public.profiles(id) on delete set null,
  borrow_time timestamp with time zone,
  created_at timestamp with time zone not null default timezone('utc'::text, now()),
  updated_at timestamp with time zone not null default timezone('utc'::text, now()),
  constraint notebooks_status_check check (status in ('available', 'borrowed', 'repair'))
);

create table if not exists public.borrow_logs (
  id bigint generated always as identity primary key,
  notebook_id bigint not null references public.notebooks(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  borrow_time timestamp with time zone,
  return_time timestamp with time zone,
  duration interval,
  reason text not null,
  location text not null,
  image_url text not null,
  image_name text,
  image_mime_type text,
  image_size bigint,
  status text not null default 'pending',
  requested_at timestamp with time zone not null default timezone('utc'::text, now()),
  approved_at timestamp with time zone,
  return_confirmed_at timestamp with time zone,
  approved_by uuid references public.profiles(id) on delete set null,
  confirmed_by uuid references public.profiles(id) on delete set null,
  updated_at timestamp with time zone not null default timezone('utc'::text, now()),
  constraint borrow_logs_status_check check (status in ('pending', 'approved', 'returned')),
  constraint borrow_logs_reason_check check (length(trim(reason)) > 0),
  constraint borrow_logs_location_check check (length(trim(location)) > 0),
  constraint borrow_logs_image_check check (length(trim(image_url)) > 0)
);

create index if not exists notebooks_status_idx
  on public.notebooks (status);

create index if not exists notebooks_asset_code_idx
  on public.notebooks (asset_code);

create index if not exists borrow_logs_notebook_status_idx
  on public.borrow_logs (notebook_id, status, requested_at desc);

create index if not exists borrow_logs_user_status_idx
  on public.borrow_logs (user_id, status, requested_at desc);

create index if not exists borrow_logs_requested_at_idx
  on public.borrow_logs (requested_at desc);

alter table public.notebooks enable row level security;
alter table public.borrow_logs enable row level security;

alter table public.notebooks replica identity full;
alter table public.borrow_logs replica identity full;

drop trigger if exists trg_notebooks_set_updated_at on public.notebooks;
create trigger trg_notebooks_set_updated_at
before update on public.notebooks
for each row
execute function public.set_row_updated_at();

drop trigger if exists trg_borrow_logs_set_updated_at on public.borrow_logs;
create trigger trg_borrow_logs_set_updated_at
before update on public.borrow_logs
for each row
execute function public.set_row_updated_at();

create or replace function public.is_it_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and lower(coalesce(to_jsonb(p) ->> 'role', '')) in ('it_support', 'admin', 'it_manager')
  );
$$;

create or replace function public.get_profile_display_name(_user_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    nullif(to_jsonb(p) ->> 'full_name', ''),
    nullif(to_jsonb(p) ->> 'employee_code', ''),
    nullif(to_jsonb(p) ->> 'email', ''),
    'User'
  )
  from public.profiles p
  where p.id = _user_id;
$$;

create or replace function public.get_profile_role(_user_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(nullif(to_jsonb(p) ->> 'role', ''), 'user')
  from public.profiles p
  where p.id = _user_id;
$$;

create or replace function public.is_notebook_center_asset(_asset_code text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select upper(trim(coalesce(_asset_code, ''))) in ('NB-018', 'NB-017', 'NB-016', 'NB-014');
$$;

create or replace function public.send_chat_message_to_user(
  _recipient_id uuid,
  _message text,
  _message_type text default 'text'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  _room public.chat_rooms;
begin
  if auth.uid() is null then
    return;
  end if;

  if _recipient_id is null or _recipient_id = auth.uid() then
    return;
  end if;

  if trim(coalesce(_message, '')) = '' then
    return;
  end if;

  _room := public.get_or_create_chat_room(_recipient_id);

  insert into public.chat_messages (
    room_id,
    message,
    type
  ) values (
    _room.id,
    _message,
    coalesce(nullif(_message_type, ''), 'text')
  );
end;
$$;

create or replace function public.send_chat_message_to_it_staff(_message text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  recipient record;
begin
  if auth.uid() is null then
    return;
  end if;

  if trim(coalesce(_message, '')) = '' then
    return;
  end if;

  for recipient in
    select p.id
    from public.profiles p
    where p.id <> auth.uid()
      and lower(coalesce(to_jsonb(p) ->> 'role', '')) in ('it_support', 'admin')
  loop
    perform public.send_chat_message_to_user(recipient.id, _message, 'text');
  end loop;
end;
$$;

create or replace function public.get_notebook_dashboard()
returns table (
  id bigint,
  asset_code text,
  model text,
  status text,
  current_user_id uuid,
  current_user_name text,
  current_user_role text,
  borrow_time timestamp with time zone,
  borrow_count bigint,
  latest_log_id bigint,
  latest_log_status text,
  latest_log_requested_at timestamp with time zone,
  latest_log_reason text,
  latest_log_location text,
  latest_log_image_url text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    n.id,
    n.asset_code,
    n.model,
    n.status,
    n.current_user_id,
    coalesce(
      nullif(to_jsonb(p) ->> 'full_name', ''),
      nullif(to_jsonb(p) ->> 'employee_code', ''),
      nullif(to_jsonb(p) ->> 'email', ''),
      ''
    ) as current_user_name,
    coalesce(nullif(to_jsonb(p) ->> 'role', ''), '') as current_user_role,
    n.borrow_time,
    coalesce(bl.borrow_count, 0) as borrow_count,
    ll.id as latest_log_id,
    ll.status as latest_log_status,
    ll.requested_at as latest_log_requested_at,
    ll.reason as latest_log_reason,
    ll.location as latest_log_location,
    ll.image_url as latest_log_image_url
  from public.notebooks n
  left join public.profiles p
    on p.id = n.current_user_id
  left join lateral (
    select count(*) as borrow_count
    from public.borrow_logs b
    where b.notebook_id = n.id
  ) bl on true
  left join lateral (
    select b.id, b.status, b.requested_at, b.reason, b.location, b.image_url
    from public.borrow_logs b
    where b.notebook_id = n.id
    order by b.requested_at desc, b.id desc
    limit 1
  ) ll on true
  where public.is_notebook_center_asset(n.asset_code)
  order by n.asset_code asc;
$$;

grant execute on function public.get_notebook_dashboard() to authenticated;

create or replace function public.get_my_notebook_borrow_logs()
returns table (
  log_id bigint,
  notebook_id bigint,
  asset_code text,
  model text,
  notebook_status text,
  status text,
  borrow_time timestamp with time zone,
  return_time timestamp with time zone,
  duration interval,
  reason text,
  location text,
  image_url text,
  image_name text,
  image_mime_type text,
  image_size bigint,
  requested_at timestamp with time zone,
  approved_at timestamp with time zone,
  return_confirmed_at timestamp with time zone,
  approved_by_name text,
  confirmed_by_name text,
  borrow_count bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    bl.id as log_id,
    bl.notebook_id,
    n.asset_code,
    n.model,
    n.status as notebook_status,
    bl.status,
    bl.borrow_time,
    bl.return_time,
    bl.duration,
    bl.reason,
    bl.location,
    bl.image_url,
    bl.image_name,
    bl.image_mime_type,
    bl.image_size,
    bl.requested_at,
    bl.approved_at,
    bl.return_confirmed_at,
    coalesce(
      nullif(to_jsonb(ap) ->> 'full_name', ''),
      nullif(to_jsonb(ap) ->> 'employee_code', ''),
      nullif(to_jsonb(ap) ->> 'email', ''),
      ''
    ) as approved_by_name,
    coalesce(
      nullif(to_jsonb(cf) ->> 'full_name', ''),
      nullif(to_jsonb(cf) ->> 'employee_code', ''),
      nullif(to_jsonb(cf) ->> 'email', ''),
      ''
    ) as confirmed_by_name,
    count(*) over (partition by bl.notebook_id) as borrow_count
  from public.borrow_logs bl
  join public.notebooks n on n.id = bl.notebook_id
  left join public.profiles ap on ap.id = bl.approved_by
  left join public.profiles cf on cf.id = bl.confirmed_by
  where bl.user_id = auth.uid()
  order by coalesce(bl.return_confirmed_at, bl.return_time, bl.approved_at, bl.requested_at) desc, bl.id desc;
$$;

grant execute on function public.get_my_notebook_borrow_logs() to authenticated;

create or replace function public.get_notebook_request_queue()
returns table (
  log_id bigint,
  notebook_id bigint,
  asset_code text,
  model text,
  notebook_status text,
  user_id uuid,
  user_name text,
  user_role text,
  borrow_time timestamp with time zone,
  return_time timestamp with time zone,
  duration interval,
  reason text,
  location text,
  image_url text,
  image_name text,
  image_mime_type text,
  image_size bigint,
  status text,
  requested_at timestamp with time zone,
  approved_at timestamp with time zone,
  return_confirmed_at timestamp with time zone,
  approved_by_name text,
  confirmed_by_name text,
  borrow_count bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_it_staff() then
    raise exception 'Not authorized';
  end if;

  return query
  select
    bl.id as log_id,
    bl.notebook_id,
    n.asset_code,
    n.model,
    n.status as notebook_status,
    bl.user_id,
    coalesce(
      nullif(to_jsonb(u) ->> 'full_name', ''),
      nullif(to_jsonb(u) ->> 'employee_code', ''),
      nullif(to_jsonb(u) ->> 'email', ''),
      ''
    ) as user_name,
    coalesce(nullif(to_jsonb(u) ->> 'role', ''), 'user') as user_role,
    bl.borrow_time,
    bl.return_time,
    bl.duration,
    bl.reason,
    bl.location,
    bl.image_url,
    bl.image_name,
    bl.image_mime_type,
    bl.image_size,
    bl.status,
    bl.requested_at,
    bl.approved_at,
    bl.return_confirmed_at,
    coalesce(
      nullif(to_jsonb(ap) ->> 'full_name', ''),
      nullif(to_jsonb(ap) ->> 'employee_code', ''),
      nullif(to_jsonb(ap) ->> 'email', ''),
      ''
    ) as approved_by_name,
    coalesce(
      nullif(to_jsonb(cf) ->> 'full_name', ''),
      nullif(to_jsonb(cf) ->> 'employee_code', ''),
      nullif(to_jsonb(cf) ->> 'email', ''),
      ''
    ) as confirmed_by_name,
    count(*) over (partition by bl.notebook_id) as borrow_count
  from public.borrow_logs bl
  join public.notebooks n on n.id = bl.notebook_id
  left join public.profiles u on u.id = bl.user_id
  left join public.profiles ap on ap.id = bl.approved_by
  left join public.profiles cf on cf.id = bl.confirmed_by
  where public.is_notebook_center_asset(n.asset_code)
  order by coalesce(bl.return_confirmed_at, bl.return_time, bl.approved_at, bl.requested_at) desc, bl.id desc;
end;
$$;

grant execute on function public.get_notebook_request_queue() to authenticated;

create or replace function public.request_notebook_borrow(
  _notebook_id bigint,
  _reason text,
  _location text,
  _image_url text,
  _image_name text default null,
  _image_mime_type text default null,
  _image_size bigint default null
)
returns public.borrow_logs
language plpgsql
security definer
set search_path = public
as $$
declare
  _self_id uuid := auth.uid();
  _notebook public.notebooks;
  _log public.borrow_logs;
  _active_asset_code text;
begin
  if _self_id is null then
    raise exception 'Not authenticated';
  end if;

  if trim(coalesce(_reason, '')) = '' then
    raise exception 'Reason is required';
  end if;

  if trim(coalesce(_location, '')) = '' then
    raise exception 'Location is required';
  end if;

  if trim(coalesce(_image_url, '')) = '' then
    raise exception 'Notebook photo is required';
  end if;

  if exists (
    select 1
    from public.borrow_logs bl
    where bl.user_id = _self_id
      and bl.return_confirmed_at is null
      and bl.status in ('pending', 'approved', 'returned')
  ) then
    select n.asset_code
    into _active_asset_code
    from public.borrow_logs bl
    join public.notebooks n on n.id = bl.notebook_id
    where bl.user_id = _self_id
      and bl.return_confirmed_at is null
      and bl.status in ('pending', 'approved', 'returned')
    order by bl.requested_at desc, bl.id desc
    limit 1;

    raise exception 'You already have an active notebook borrow: %', coalesce(_active_asset_code, 'unknown');
  end if;

  select *
  into _notebook
  from public.notebooks
  where id = _notebook_id
  for update;

  if _notebook.id is null then
    raise exception 'Notebook not found';
  end if;

  if not public.is_notebook_center_asset(_notebook.asset_code) then
    raise exception 'Notebook is not available for borrowing';
  end if;

  if _notebook.status <> 'available' then
    raise exception 'Notebook is not available';
  end if;

  if exists (
    select 1
    from public.borrow_logs bl
    where bl.notebook_id = _notebook_id
      and bl.return_confirmed_at is null
      and bl.status in ('pending', 'approved', 'returned')
  ) then
    raise exception 'Notebook is already in use';
  end if;

  insert into public.borrow_logs (
    notebook_id,
    user_id,
    reason,
    location,
    image_url,
    image_name,
    image_mime_type,
    image_size,
    status
  ) values (
    _notebook_id,
    _self_id,
    _reason,
    _location,
    _image_url,
    _image_name,
    _image_mime_type,
    _image_size,
    'pending'
  )
  returning * into _log;

  perform public.send_chat_message_to_it_staff(
    format(
      'User %s ยืม Notebook %s',
      public.get_profile_display_name(_self_id),
      _notebook.asset_code
    )
  );

  return _log;
end;
$$;

grant execute on function public.request_notebook_borrow(
  bigint,
  text,
  text,
  text,
  text,
  text,
  bigint
) to authenticated;

create or replace function public.approve_notebook_borrow_request(_log_id bigint)
returns public.borrow_logs
language plpgsql
security definer
set search_path = public
as $$
declare
  _log public.borrow_logs;
  _notebook public.notebooks;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if not public.is_it_staff() then
    raise exception 'Not authorized';
  end if;

  select *
  into _log
  from public.borrow_logs
  where id = _log_id
  for update;

  if _log.id is null then
    raise exception 'Borrow request not found';
  end if;

  if _log.status <> 'pending' then
    raise exception 'Borrow request is not pending';
  end if;

  select *
  into _notebook
  from public.notebooks
  where id = _log.notebook_id
  for update;

  if _notebook.id is null then
    raise exception 'Notebook not found';
  end if;

  if not public.is_notebook_center_asset(_notebook.asset_code) then
    raise exception 'Notebook is not available for borrowing';
  end if;

  if _notebook.status <> 'available' then
    raise exception 'Notebook is not available';
  end if;

  update public.borrow_logs
  set
    status = 'approved',
    approved_at = timezone('utc'::text, now()),
    approved_by = auth.uid(),
    borrow_time = timezone('utc'::text, now())
  where id = _log.id
  returning * into _log;

  update public.notebooks
  set
    status = 'borrowed',
    current_user_id = _log.user_id,
    borrow_time = _log.borrow_time
  where id = _notebook.id;

  perform public.send_chat_message_to_user(
    _log.user_id,
    format(
      'Notebook %s ได้รับอนุมัติให้ยืมแล้ว',
      _notebook.asset_code
    ),
    'text'
  );

  return _log;
end;
$$;

grant execute on function public.approve_notebook_borrow_request(bigint) to authenticated;

create or replace function public.request_notebook_return(_log_id bigint)
returns public.borrow_logs
language plpgsql
security definer
set search_path = public
as $$
declare
  _self_id uuid := auth.uid();
  _log public.borrow_logs;
  _notebook public.notebooks;
  _return_time timestamp with time zone := timezone('utc'::text, now());
begin
  if _self_id is null then
    raise exception 'Not authenticated';
  end if;

  select *
  into _log
  from public.borrow_logs
  where id = _log_id
  for update;

  if _log.id is null then
    raise exception 'Borrow log not found';
  end if;

  if _log.user_id <> _self_id then
    raise exception 'Not authorized';
  end if;

  if _log.status <> 'approved' then
    raise exception 'Notebook is not currently borrowed';
  end if;

  select *
  into _notebook
  from public.notebooks
  where id = _log.notebook_id
  for update;

  if _notebook.id is null then
    raise exception 'Notebook not found';
  end if;

  if not public.is_notebook_center_asset(_notebook.asset_code) then
    raise exception 'Notebook is not available for return';
  end if;

  update public.borrow_logs
  set
    status = 'returned',
    return_time = _return_time,
    duration = _return_time - coalesce(borrow_time, _return_time)
  where id = _log.id
  returning * into _log;

  perform public.send_chat_message_to_it_staff(
    format(
      'User %s คืน Notebook %s แล้ว',
      public.get_profile_display_name(_self_id),
      _notebook.asset_code
    )
  );

  return _log;
end;
$$;

grant execute on function public.request_notebook_return(bigint) to authenticated;

create or replace function public.confirm_notebook_return(_log_id bigint)
returns public.borrow_logs
language plpgsql
security definer
set search_path = public
as $$
declare
  _log public.borrow_logs;
  _notebook public.notebooks;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if not public.is_it_staff() then
    raise exception 'Not authorized';
  end if;

  select *
  into _log
  from public.borrow_logs
  where id = _log_id
  for update;

  if _log.id is null then
    raise exception 'Borrow log not found';
  end if;

  if _log.status <> 'returned' then
    raise exception 'Return is not pending confirmation';
  end if;

  select *
  into _notebook
  from public.notebooks
  where id = _log.notebook_id
  for update;

  if _notebook.id is null then
    raise exception 'Notebook not found';
  end if;

  if not public.is_notebook_center_asset(_notebook.asset_code) then
    raise exception 'Notebook is not available for return';
  end if;

  update public.borrow_logs
  set
    return_confirmed_at = timezone('utc'::text, now()),
    confirmed_by = auth.uid()
  where id = _log.id
  returning * into _log;

  update public.notebooks
  set
    status = 'available',
    current_user_id = null,
    borrow_time = null
  where id = _notebook.id;

  perform public.send_chat_message_to_user(
    _log.user_id,
    format(
      'Notebook %s คืนเรียบร้อยแล้ว',
      _notebook.asset_code
    ),
    'text'
  );

  return _log;
end;
$$;

grant execute on function public.confirm_notebook_return(bigint) to authenticated;

drop policy if exists notebooks_select_policy on public.notebooks;
create policy notebooks_select_policy
  on public.notebooks
  for select
  to authenticated
  using (public.is_it_staff() or public.is_notebook_center_asset(asset_code));

drop policy if exists notebooks_insert_policy on public.notebooks;
create policy notebooks_insert_policy
  on public.notebooks
  for insert
  to authenticated
  with check (public.is_it_staff());

drop policy if exists notebooks_update_policy on public.notebooks;
create policy notebooks_update_policy
  on public.notebooks
  for update
  to authenticated
  using (public.is_it_staff())
  with check (public.is_it_staff());

drop policy if exists notebooks_delete_policy on public.notebooks;
create policy notebooks_delete_policy
  on public.notebooks
  for delete
  to authenticated
  using (public.is_it_staff());

drop policy if exists borrow_logs_select_policy on public.borrow_logs;
create policy borrow_logs_select_policy
  on public.borrow_logs
  for select
  to authenticated
  using (user_id = auth.uid() or public.is_it_staff());

drop policy if exists borrow_logs_insert_policy on public.borrow_logs;
create policy borrow_logs_insert_policy
  on public.borrow_logs
  for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists borrow_logs_update_policy on public.borrow_logs;
create policy borrow_logs_update_policy
  on public.borrow_logs
  for update
  to authenticated
  using (public.is_it_staff() or user_id = auth.uid())
  with check (public.is_it_staff() or user_id = auth.uid());

drop policy if exists borrow_logs_delete_policy on public.borrow_logs;
create policy borrow_logs_delete_policy
  on public.borrow_logs
  for delete
  to authenticated
  using (public.is_it_staff());

grant select, insert, update on public.notebooks to authenticated;
grant select, insert, update on public.borrow_logs to authenticated;

grant usage, select on sequence public.notebooks_id_seq to authenticated;
grant usage, select on sequence public.borrow_logs_id_seq to authenticated;

insert into storage.buckets (id, name, public, file_size_limit)
values ('notebook-borrow-proof', 'notebook-borrow-proof', true, 20971520)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit;

drop policy if exists notebook_borrow_proof_select_policy on storage.objects;
create policy notebook_borrow_proof_select_policy
  on storage.objects
  for select
  to authenticated
  using (bucket_id = 'notebook-borrow-proof');

drop policy if exists notebook_borrow_proof_insert_policy on storage.objects;
create policy notebook_borrow_proof_insert_policy
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'notebook-borrow-proof'
    and (storage.foldername(name))[1] = 'borrow'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

drop policy if exists notebook_borrow_proof_update_policy on storage.objects;
create policy notebook_borrow_proof_update_policy
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'notebook-borrow-proof'
    and (storage.foldername(name))[1] = 'borrow'
    and (storage.foldername(name))[2] = auth.uid()::text
  )
  with check (
    bucket_id = 'notebook-borrow-proof'
    and (storage.foldername(name))[1] = 'borrow'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

drop policy if exists notebook_borrow_proof_delete_policy on storage.objects;
create policy notebook_borrow_proof_delete_policy
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'notebook-borrow-proof'
    and (storage.foldername(name))[1] = 'borrow'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'it_assets'
  ) then
    insert into public.notebooks (asset_code, model, status)
    select
      coalesce(
        nullif(asset_tag, ''),
        concat('NB-', lpad(id::text, 4, '0'))
      ) as asset_code,
      coalesce(nullif(model, ''), nullif(asset_name, ''), 'Notebook') as model,
      case
        when lower(coalesce(status, '')) in ('broken', 'repair', 'retired', 'lost') then 'repair'
        else 'available'
      end as status
    from public.it_assets
    where (
        lower(coalesce(asset_category, '')) like '%notebook%'
        or lower(coalesce(asset_name, '')) like '%notebook%'
        or lower(coalesce(model, '')) like '%notebook%'
        or lower(coalesce(asset_tag, '')) like 'nb-%'
      )
      and public.is_notebook_center_asset(
        coalesce(
          nullif(asset_tag, ''),
          concat('NB-', lpad(id::text, 4, '0'))
        )
      )
    on conflict (asset_code) do nothing;
  end if;
end
$$;

do $$
begin
  alter publication supabase_realtime add table public.notebooks;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.borrow_logs;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;
