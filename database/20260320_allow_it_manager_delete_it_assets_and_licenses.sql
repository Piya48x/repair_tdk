-- Allow IT Manager to hard-delete IT assets and licenses from the executive assets page.
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
            and p.role::text in ('admin', 'it_support', 'it_manager')
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
            and p.role::text in ('admin', 'it_support', 'it_manager')
        )
      );
  end if;
end;
$$;
