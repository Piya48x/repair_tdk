-- Extend notebook inventory management for executive/admin screens.
-- Adds asset images, notes, broader notebook-center visibility, and admin-only CRUD.

alter table public.notebooks
  add column if not exists asset_image_url text,
  add column if not exists asset_image_name text,
  add column if not exists asset_image_mime_type text,
  add column if not exists asset_image_size bigint,
  add column if not exists notes text;

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
      and lower(coalesce(to_jsonb(p) ->> 'role', '')) = 'admin'
  );
$$;

grant execute on function public.is_notebook_admin() to authenticated;

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

drop policy if exists notebooks_insert_policy on public.notebooks;
create policy notebooks_insert_policy
  on public.notebooks
  for insert
  to authenticated
  with check (public.is_notebook_admin());

drop policy if exists notebooks_update_policy on public.notebooks;
create policy notebooks_update_policy
  on public.notebooks
  for update
  to authenticated
  using (public.is_notebook_admin())
  with check (public.is_notebook_admin());

drop policy if exists notebooks_delete_policy on public.notebooks;
create policy notebooks_delete_policy
  on public.notebooks
  for delete
  to authenticated
  using (public.is_notebook_admin());

insert into storage.buckets (id, name, public, file_size_limit)
values ('notebook-assets', 'notebook-assets', true, 10485760)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit;

drop policy if exists notebook_assets_select_policy on storage.objects;
create policy notebook_assets_select_policy
  on storage.objects
  for select
  to authenticated
  using (bucket_id = 'notebook-assets');

drop policy if exists notebook_assets_insert_policy on storage.objects;
create policy notebook_assets_insert_policy
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'notebook-assets'
    and public.is_notebook_admin()
    and coalesce((storage.foldername(name))[1], '') = 'assets'
  );

drop policy if exists notebook_assets_update_policy on storage.objects;
create policy notebook_assets_update_policy
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'notebook-assets'
    and public.is_notebook_admin()
  )
  with check (
    bucket_id = 'notebook-assets'
    and public.is_notebook_admin()
  );

drop policy if exists notebook_assets_delete_policy on storage.objects;
create policy notebook_assets_delete_policy
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'notebook-assets'
    and public.is_notebook_admin()
  );

notify pgrst, 'reload schema';
