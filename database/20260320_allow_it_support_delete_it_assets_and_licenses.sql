-- Allow IT Support to hard-delete IT assets and licenses (same as admin).
-- Safe to run multiple times.

do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'it_assets'
  ) then
    drop policy if exists "IT can delete IT assets" on public.it_assets;
    create policy "IT can delete IT assets"
      on public.it_assets
      for delete
      using (
        exists (
          select 1
          from public.profiles p
          where p.id = auth.uid()
            and p.role::text in ('admin', 'it_support')
        )
      );
  end if;

  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'it_licenses'
  ) then
    drop policy if exists "IT can delete licenses" on public.it_licenses;
    create policy "IT can delete licenses"
      on public.it_licenses
      for delete
      using (
        exists (
          select 1
          from public.profiles p
          where p.id = auth.uid()
            and p.role::text in ('admin', 'it_support')
        )
      );
  end if;
end;
$$;
