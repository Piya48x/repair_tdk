-- Allow IT Support / Admin to set another member password from Account Center.
-- This runs as a SECURITY DEFINER function and enforces role checks internally.

create extension if not exists pgcrypto with schema extensions;

create or replace function public.set_managed_account_password(
  _target_user_id uuid,
  _next_password text
)
returns boolean
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  _actor_id uuid := auth.uid();
  _actor_role text := '';
  _password text := coalesce(_next_password, '');
begin
  if _actor_id is null then
    raise exception 'Authentication required.'
      using errcode = '42501';
  end if;

  if _target_user_id is null then
    raise exception 'Target user is required.';
  end if;

  if _target_user_id = _actor_id then
    raise exception 'Use the self-service password panel to change your own password.';
  end if;

  if char_length(_password) < 8 then
    raise exception 'Password must be at least 8 characters.';
  end if;

  select lower(coalesce(to_jsonb(p) ->> 'role', ''))
  into _actor_role
  from public.profiles p
  where p.id = _actor_id;

  if _actor_role not in ('it_support', 'admin') then
    raise exception 'Only IT Support or Admin can change other member passwords.'
      using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.profiles p
    where p.id = _target_user_id
  ) then
    raise exception 'Target member profile not found.';
  end if;

  update auth.users u
  set
    encrypted_password = extensions.crypt(_password, extensions.gen_salt('bf')),
    updated_at = now()
  where u.id = _target_user_id;

  if not found then
    raise exception 'Target auth account not found.';
  end if;

  return true;
end;
$$;

revoke all on function public.set_managed_account_password(uuid, text) from public;
grant execute on function public.set_managed_account_password(uuid, text) to authenticated;
