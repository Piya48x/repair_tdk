-- Restore admin notebook borrow history / request queue on older notebook schema.
-- Run this file in Supabase SQL Editor to restore /admin-dashboard -> อนุมัติยืม-คืนโน้ตบุ๊ก

alter table public.borrow_logs
  add column if not exists return_image_url text,
  add column if not exists return_image_name text,
  add column if not exists return_image_mime_type text,
  add column if not exists return_image_size bigint;

create or replace function public.is_notebook_center_asset(_asset_code text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.notebooks n
    where upper(trim(coalesce(n.asset_code, ''))) = upper(trim(coalesce(_asset_code, '')))
  );
$$;

grant execute on function public.is_notebook_center_asset(text) to authenticated;

drop function if exists public.get_notebook_request_queue();

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
  user_avatar_url text,
  borrow_time timestamp with time zone,
  return_time timestamp with time zone,
  duration interval,
  reason text,
  location text,
  image_url text,
  image_name text,
  image_mime_type text,
  image_size bigint,
  return_image_url text,
  return_image_name text,
  return_image_mime_type text,
  return_image_size bigint,
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
    coalesce(
      nullif(to_jsonb(u) ->> 'avatar_url', ''),
      nullif(to_jsonb(u) ->> 'id_card_url', ''),
      ''
    ) as user_avatar_url,
    bl.borrow_time,
    bl.return_time,
    bl.duration,
    bl.reason,
    bl.location,
    bl.image_url,
    bl.image_name,
    bl.image_mime_type,
    bl.image_size,
    coalesce(bl.return_image_url, '') as return_image_url,
    bl.return_image_name,
    bl.return_image_mime_type,
    bl.return_image_size,
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

notify pgrst, 'reload schema';
