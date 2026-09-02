-- Account Center duplicate checks and normalized profile identity protection.
-- Safe to run multiple times. Existing duplicate rows are reported and left intact
-- so the migration can still complete; the Account Center will flag them for review.

begin;

create or replace function public.check_managed_account_duplicates(
  _email text,
  _employee_code text,
  _exclude_user_id uuid default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, auth
as $$
declare
  actor_role text := '';
  normalized_email text := lower(trim(coalesce(_email, '')));
  normalized_employee_code text := upper(trim(coalesce(_employee_code, '')));
  email_exists boolean := false;
  employee_code_exists boolean := false;
begin
  if auth.uid() is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;

  select lower(coalesce(to_jsonb(p) ->> 'role', ''))
  into actor_role
  from public.profiles p
  where p.id = auth.uid();

  if actor_role not in ('it_support', 'admin') then
    raise exception 'Only IT Support or Admin can check managed accounts.'
      using errcode = '42501';
  end if;

  if normalized_email <> '' then
    select (
      exists (
        select 1
        from public.profiles p
        where (_exclude_user_id is null or p.id <> _exclude_user_id)
          and lower(trim(coalesce(p.email, ''))) = normalized_email
      )
      or exists (
        select 1
        from auth.users u
        where (_exclude_user_id is null or u.id <> _exclude_user_id)
          and lower(trim(coalesce(u.email, ''))) = normalized_email
      )
    ) into email_exists;
  end if;

  if normalized_employee_code <> '' then
    select (
      exists (
        select 1
        from public.profiles p
        where (_exclude_user_id is null or p.id <> _exclude_user_id)
          and upper(trim(coalesce(p.employee_code, ''))) = normalized_employee_code
      )
      or exists (
        select 1
        from auth.users u
        where (_exclude_user_id is null or u.id <> _exclude_user_id)
          and upper(trim(coalesce(u.raw_user_meta_data ->> 'employee_code', ''))) = normalized_employee_code
      )
    ) into employee_code_exists;
  end if;

  return jsonb_build_object(
    'email_exists', email_exists,
    'employee_code_exists', employee_code_exists
  );
end;
$$;

revoke all on function public.check_managed_account_duplicates(text, text, uuid) from public;
grant execute on function public.check_managed_account_duplicates(text, text, uuid) to authenticated;

do $$
begin
  if not exists (
    select lower(trim(email))
    from public.profiles
    where length(trim(coalesce(email, ''))) > 0
    group by lower(trim(email))
    having count(*) > 1
  ) then
    create unique index if not exists profiles_email_normalized_unique_idx
      on public.profiles (lower(trim(email)))
      where length(trim(coalesce(email, ''))) > 0;
  else
    raise notice 'Skipped profiles_email_normalized_unique_idx because duplicate profile emails already exist.';
  end if;

  if not exists (
    select upper(trim(employee_code))
    from public.profiles
    where length(trim(coalesce(employee_code, ''))) > 0
    group by upper(trim(employee_code))
    having count(*) > 1
  ) then
    create unique index if not exists profiles_employee_code_normalized_unique_idx
      on public.profiles (upper(trim(employee_code)))
      where length(trim(coalesce(employee_code, ''))) > 0;
  else
    raise notice 'Skipped profiles_employee_code_normalized_unique_idx because duplicate employee codes already exist.';
  end if;
end
$$;

comment on function public.check_managed_account_duplicates(text, text, uuid) is
  'Returns duplicate email and employee-code flags for Account Center managers without exposing auth.users.';

notify pgrst, 'reload schema';

commit;
