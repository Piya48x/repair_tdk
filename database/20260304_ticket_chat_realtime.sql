-- Ticket chat realtime + notification-ready setup for Supabase
-- Safe to run multiple times in Supabase SQL Editor.

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
  updated_at timestamp with time zone not null default timezone('utc'::text, now())
);

alter table public.ticket_messages
  add column if not exists sender_id uuid,
  add column if not exists sender_name text,
  add column if not exists sender_role text,
  add column if not exists sender_avatar_url text,
  add column if not exists message text,
  add column if not exists image_url text,
  add column if not exists created_at timestamp with time zone default timezone('utc'::text, now()),
  add column if not exists updated_at timestamp with time zone default timezone('utc'::text, now());

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'ticket_messages_content_check'
      and conrelid = 'public.ticket_messages'::regclass
  ) then
    alter table public.ticket_messages
      add constraint ticket_messages_content_check
      check (
        (message is not null and length(trim(message)) > 0)
        or image_url is not null
      );
  end if;
end $$;

create index if not exists ticket_messages_ticket_id_idx
  on public.ticket_messages (ticket_id);

create index if not exists ticket_messages_created_at_idx
  on public.ticket_messages (created_at);

alter table public.ticket_messages enable row level security;
alter table public.ticket_messages replica identity full;

create or replace function public.set_ticket_message_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$;

drop trigger if exists trg_ticket_messages_set_updated_at on public.ticket_messages;
create trigger trg_ticket_messages_set_updated_at
before update on public.ticket_messages
for each row
execute function public.set_ticket_message_updated_at();

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

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'ticket_messages'
      and policyname = 'ticket_messages_select_policy'
  ) then
    create policy ticket_messages_select_policy
      on public.ticket_messages
      for select
      using (public.can_access_ticket_chat(ticket_id));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'ticket_messages'
      and policyname = 'ticket_messages_insert_policy'
  ) then
    create policy ticket_messages_insert_policy
      on public.ticket_messages
      for insert
      with check (public.can_access_ticket_chat(ticket_id));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'ticket_messages'
      and policyname = 'ticket_messages_update_own_policy'
  ) then
    create policy ticket_messages_update_own_policy
      on public.ticket_messages
      for update
      using (sender_id = auth.uid())
      with check (sender_id = auth.uid());
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'ticket_messages'
      and policyname = 'ticket_messages_delete_own_policy'
  ) then
    create policy ticket_messages_delete_own_policy
      on public.ticket_messages
      for delete
      using (sender_id = auth.uid());
  end if;
end $$;

-- Ensure table is part of Supabase Realtime publication.
do $$
begin
  alter publication supabase_realtime add table public.ticket_messages;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;

-- Bucket for chat images (used by Upload/Capture in chat UI)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'ticket-attachments',
  'ticket-attachments',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'storage_ticket_attachments_select'
  ) then
    create policy storage_ticket_attachments_select
      on storage.objects
      for select
      to public
      using (bucket_id = 'ticket-attachments');
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'storage_ticket_attachments_insert'
  ) then
    create policy storage_ticket_attachments_insert
      on storage.objects
      for insert
      to authenticated
      with check (
        bucket_id = 'ticket-attachments'
        and (storage.foldername(name))[1] = 'chat'
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'storage_ticket_attachments_update'
  ) then
    create policy storage_ticket_attachments_update
      on storage.objects
      for update
      to authenticated
      using (bucket_id = 'ticket-attachments' and owner = auth.uid())
      with check (bucket_id = 'ticket-attachments' and owner = auth.uid());
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'storage_ticket_attachments_delete'
  ) then
    create policy storage_ticket_attachments_delete
      on storage.objects
      for delete
      to authenticated
      using (bucket_id = 'ticket-attachments' and owner = auth.uid());
  end if;
end $$;
