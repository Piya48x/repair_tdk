-- Add report roles for enum-based profile role columns.
-- Safe to run multiple times.

do $$
begin
  if exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'user_role'
  ) then
    alter type public.user_role add value if not exists 'it_manager';
    alter type public.user_role add value if not exists 'executive';
  end if;
end;
$$;
