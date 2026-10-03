-- Install the reset RPC in a new migration.  It was originally appended to
-- 20260911_gatepass_vehicle_reports.sql after that migration had already been
-- deployed, so existing environments never received the function.
--
-- This intentionally leaves public.gatepass_vehicle_records untouched.
create or replace function public.reset_tdk_approved_registry()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  actor_role text := '';
  deleted_changes integer := 0;
  deleted_registry integer := 0;
  deleted_imports integer := 0;
begin
  select lower(trim(coalesce(to_jsonb(p) ->> 'role', '')))
  into actor_role
  from public.profiles p
  where p.id = auth.uid()
    and coalesce((to_jsonb(p) ->> 'is_active')::boolean, true);

  if actor_role not in ('it_support', 'security', 'admin') then
    raise exception 'You do not have permission to reset the TDK APPROVED registry' using errcode = '42501';
  end if;

  -- Delete dependent audit rows first, then the registry rows, then imports.
  delete from public.tdk_approved_registry_changes
  where id is not null;
  get diagnostics deleted_changes = row_count;

  delete from public.tdk_approved_registry
  where id is not null;
  get diagnostics deleted_registry = row_count;

  delete from public.tdk_approved_registry_imports
  where id is not null;
  get diagnostics deleted_imports = row_count;

  return jsonb_build_object(
    'deleted_changes', deleted_changes,
    'deleted_registry', deleted_registry,
    'deleted_imports', deleted_imports
  );
end;
$$;

revoke all on function public.reset_tdk_approved_registry() from public;
grant execute on function public.reset_tdk_approved_registry() to authenticated;

comment on function public.reset_tdk_approved_registry() is
  'Clears the TDK APPROVED master registry and its import history without deleting daily Gatepass records.';

-- Make the new RPC visible to PostgREST immediately after running this file
-- from the Supabase SQL Editor.
notify pgrst, 'reload schema';
