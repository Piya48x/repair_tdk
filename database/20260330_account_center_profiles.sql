-- Account Center enhancements:
-- 1. Track whether a profile is allowed to access the application.
-- 2. Create a public storage bucket for profile avatars.
-- 3. Allow self-service avatar writes and admin / IT support account management.

do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'profiles'
  ) then
    alter table public.profiles
      add column if not exists is_active boolean default true;

    update public.profiles
    set is_active = true
    where is_active is null;

    create index if not exists profiles_is_active_idx
      on public.profiles (is_active);
  end if;
end
$$;

do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'profiles'
  ) then
    if not exists (
      select 1
      from pg_policies
      where schemaname = 'public'
        and tablename = 'profiles'
        and policyname = 'profile_manager_insert_policy'
    ) then
      create policy profile_manager_insert_policy
        on public.profiles
        for insert
        to authenticated
        with check (
          auth.uid() = id
          or exists (
            select 1
            from public.profiles p
            where p.id = auth.uid()
              and lower(coalesce(to_jsonb(p) ->> 'role', '')) in ('it_support', 'admin')
          )
        );
    end if;

    if not exists (
      select 1
      from pg_policies
      where schemaname = 'public'
        and tablename = 'profiles'
        and policyname = 'profile_manager_update_policy'
    ) then
      create policy profile_manager_update_policy
        on public.profiles
        for update
        to authenticated
        using (
          auth.uid() = id
          or exists (
            select 1
            from public.profiles p
            where p.id = auth.uid()
              and lower(coalesce(to_jsonb(p) ->> 'role', '')) in ('it_support', 'admin')
          )
        )
        with check (
          auth.uid() = id
          or exists (
            select 1
            from public.profiles p
            where p.id = auth.uid()
              and lower(coalesce(to_jsonb(p) ->> 'role', '')) in ('it_support', 'admin')
          )
        );
    end if;

    if not exists (
      select 1
      from pg_policies
      where schemaname = 'public'
        and tablename = 'profiles'
        and policyname = 'profile_manager_delete_policy'
    ) then
      create policy profile_manager_delete_policy
        on public.profiles
        for delete
        to authenticated
        using (
          auth.uid() = id
          or exists (
            select 1
            from public.profiles p
            where p.id = auth.uid()
              and lower(coalesce(to_jsonb(p) ->> 'role', '')) in ('it_support', 'admin')
          )
        );
    end if;
  end if;
end
$$;

insert into storage.buckets (id, name, public, file_size_limit)
values ('profile-avatars', 'profile-avatars', true, 3145728)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'profile_avatars_select_policy'
  ) then
    create policy profile_avatars_select_policy
      on storage.objects
      for select
      to authenticated
      using (bucket_id = 'profile-avatars');
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'profile_avatars_insert_policy'
  ) then
    create policy profile_avatars_insert_policy
      on storage.objects
      for insert
      to authenticated
      with check (
        bucket_id = 'profile-avatars'
        and (
          (storage.foldername(name))[1] = auth.uid()::text
          or exists (
            select 1
            from public.profiles p
            where p.id = auth.uid()
              and lower(coalesce(to_jsonb(p) ->> 'role', '')) in ('it_support', 'admin')
          )
        )
      );
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'profile_avatars_update_policy'
  ) then
    create policy profile_avatars_update_policy
      on storage.objects
      for update
      to authenticated
      using (
        bucket_id = 'profile-avatars'
        and (
          (storage.foldername(name))[1] = auth.uid()::text
          or exists (
            select 1
            from public.profiles p
            where p.id = auth.uid()
              and lower(coalesce(to_jsonb(p) ->> 'role', '')) in ('it_support', 'admin')
          )
        )
      )
      with check (
        bucket_id = 'profile-avatars'
        and (
          (storage.foldername(name))[1] = auth.uid()::text
          or exists (
            select 1
            from public.profiles p
            where p.id = auth.uid()
              and lower(coalesce(to_jsonb(p) ->> 'role', '')) in ('it_support', 'admin')
          )
        )
      );
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'profile_avatars_delete_policy'
  ) then
    create policy profile_avatars_delete_policy
      on storage.objects
      for delete
      to authenticated
      using (
        bucket_id = 'profile-avatars'
        and (
          (storage.foldername(name))[1] = auth.uid()::text
          or exists (
            select 1
            from public.profiles p
            where p.id = auth.uid()
              and lower(coalesce(to_jsonb(p) ->> 'role', '')) in ('it_support', 'admin')
          )
        )
      );
  end if;
end
$$;
