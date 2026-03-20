-- Allow `broken` status for IT assets.
-- Safe to run multiple times.

do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'it_assets'
  ) then
    alter table public.it_assets
      drop constraint if exists it_assets_status_check;

    alter table public.it_assets
      add constraint it_assets_status_check
      check (status in ('in_use', 'assigned', 'spare', 'available', 'broken', 'repair', 'retired', 'lost'));
  end if;
end;
$$;
