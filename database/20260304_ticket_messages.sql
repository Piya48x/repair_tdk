-- Ticket case chat messages
-- Run this script in Supabase SQL editor once.

create table if not exists public.ticket_messages (
  id bigint generated always as identity primary key,
  ticket_id text not null,
  sender_id uuid,
  sender_name text not null,
  sender_role text,
  sender_avatar_url text,
  message text,
  image_url text,
  created_at timestamp with time zone not null default timezone('utc'::text, now()),
  updated_at timestamp with time zone not null default timezone('utc'::text, now()),
  constraint ticket_messages_content_check
    check (
      (message is not null and length(trim(message)) > 0)
      or image_url is not null
    )
);

create index if not exists ticket_messages_ticket_id_idx
  on public.ticket_messages (ticket_id);

create index if not exists ticket_messages_created_at_idx
  on public.ticket_messages (created_at);

alter table public.ticket_messages enable row level security;

create or replace function public.can_access_ticket_chat(_ticket_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    exists (
      select 1
      from public.tickets t
      where t.id::text = _ticket_id
        and (
          t.creator_id = auth.uid()
          or t.assigned_to = auth.uid()
        )
    )
    or exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role in ('it_support', 'admin')
    );
$$;

grant execute on function public.can_access_ticket_chat(text) to authenticated;

create or replace function public.get_ticket_chat_profiles(_ticket_id text, _user_ids uuid[])
returns table (
  id uuid,
  full_name text,
  role text,
  employee_code text,
  avatar_url text,
  id_card_url text
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.can_access_ticket_chat(_ticket_id) then
    return;
  end if;

  return query
  select
    p.id,
    p.full_name,
    p.role,
    p.employee_code,
    p.avatar_url,
    p.id_card_url
  from public.profiles p
  where p.id = any(_user_ids);
end;
$$;

grant execute on function public.get_ticket_chat_profiles(text, uuid[]) to authenticated;

create policy if not exists "ticket_messages_select_policy"
on public.ticket_messages
for select
using (
  exists (
    select 1
    from public.tickets t
    where t.id::text = ticket_messages.ticket_id
      and (
        t.creator_id = auth.uid()
        or t.assigned_to = auth.uid()
      )
  )
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('it_support', 'admin')
  )
);

create policy if not exists "ticket_messages_insert_policy"
on public.ticket_messages
for insert
with check (
  exists (
    select 1
    from public.tickets t
    where t.id::text = ticket_messages.ticket_id
      and (
        t.creator_id = auth.uid()
        or t.assigned_to = auth.uid()
      )
  )
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('it_support', 'admin')
  )
);

create policy if not exists "ticket_messages_delete_own_policy"
on public.ticket_messages
for delete
using (sender_id = auth.uid());

-- Ensure table is included in Supabase Realtime publication.
do $$
begin
  alter publication supabase_realtime add table public.ticket_messages;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;
