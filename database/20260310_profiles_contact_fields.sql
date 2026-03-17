do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'profiles'
  ) then
    alter table public.profiles
      add column if not exists phone text,
      add column if not exists location text;

    update public.profiles as p
    set
      phone = coalesce(nullif(p.phone, ''), nullif(u.raw_user_meta_data ->> 'phone', '')),
      location = coalesce(nullif(p.location, ''), nullif(u.raw_user_meta_data ->> 'location', ''))
    from auth.users as u
    where u.id = p.id
      and (
        ((p.phone is null or p.phone = '') and coalesce(u.raw_user_meta_data ->> 'phone', '') <> '')
        or
        ((p.location is null or p.location = '') and coalesce(u.raw_user_meta_data ->> 'location', '') <> '')
      );
  end if;
end
$$;
