-- Allow IT Support / IT Manager to manage notebook inventory
-- and control which notebook rows are shown in Notebook Center.

alter table public.notebooks
  add column if not exists show_in_notebook_center boolean not null default true;

create or replace function public.is_notebook_admin()
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
      and lower(coalesce(to_jsonb(p) ->> 'role', '')) in ('admin', 'it_support', 'it_manager')
  );
$$;

grant execute on function public.is_notebook_admin() to authenticated;

drop function if exists public.get_notebook_dashboard();

create or replace function public.get_notebook_dashboard()
returns table (
  id bigint,
  asset_code text,
  model text,
  notes text,
  asset_image_url text,
  asset_image_name text,
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
    n.notes,
    coalesce(n.asset_image_url, '') as asset_image_url,
    coalesce(n.asset_image_name, '') as asset_image_name,
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
    select
      b.id,
      b.status,
      b.requested_at,
      b.reason,
      b.location,
      b.image_url
    from public.borrow_logs b
    where b.notebook_id = n.id
    order by b.requested_at desc
    limit 1
  ) ll on true
  where public.is_notebook_center_asset(n.asset_code)
    and (
      (
        coalesce(n.show_in_notebook_center, true)
        and n.status = 'available'
        and n.current_user_id is null
      )
      or (n.status = 'borrowed' and n.current_user_id = auth.uid())
    )
  order by
    case n.status
      when 'available' then 0
      when 'borrowed' then 1
      when 'repair' then 2
      else 3
    end,
    upper(coalesce(n.asset_code, ''));
$$;

grant execute on function public.get_notebook_dashboard() to authenticated;

notify pgrst, 'reload schema';
