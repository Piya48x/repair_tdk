-- Access Request workflow schema for IT Service Desk.
-- Safe to run multiple times.

create extension if not exists "uuid-ossp";

create table if not exists public.access_requests (
  id uuid primary key default uuid_generate_v4(),
  requester_user_id uuid not null references auth.users(id) on delete cascade,
  requester_name text not null,
  department text,
  system_name text not null,
  access_type text not null,
  reason text not null,
  urgency text not null default 'normal',
  approver text not null,
  status text not null default 'Pending Approval',
  processed_by uuid references auth.users(id),
  processed_by_name text,
  processed_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint access_requests_access_type_check check (access_type in ('Read', 'Write', 'Admin')),
  constraint access_requests_status_check check (status in ('Pending Approval', 'Approved', 'Rejected', 'Completed')),
  constraint access_requests_urgency_check check (urgency in ('low', 'normal', 'high', 'urgent'))
);

create index if not exists access_requests_requester_idx
  on public.access_requests (requester_user_id, created_at desc);

create index if not exists access_requests_status_idx
  on public.access_requests (status, created_at desc);

create or replace function public.set_access_requests_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists access_requests_set_updated_at on public.access_requests;
create trigger access_requests_set_updated_at
before update on public.access_requests
for each row
execute function public.set_access_requests_updated_at();

alter table public.access_requests enable row level security;

drop policy if exists "Users can view own access requests" on public.access_requests;
create policy "Users can view own access requests"
  on public.access_requests
  for select
  using (
    auth.uid() = requester_user_id
    or exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role in ('it_support', 'admin')
    )
  );

drop policy if exists "Users can create own access requests" on public.access_requests;
create policy "Users can create own access requests"
  on public.access_requests
  for insert
  with check (auth.uid() = requester_user_id);

drop policy if exists "IT can update access requests" on public.access_requests;
create policy "IT can update access requests"
  on public.access_requests
  for update
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role in ('it_support', 'admin')
    )
  )
  with check (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role in ('it_support', 'admin')
    )
  );

drop policy if exists "Admins can delete access requests" on public.access_requests;
create policy "Admins can delete access requests"
  on public.access_requests
  for delete
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
    )
  );

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'access_requests'
  ) then
    alter publication supabase_realtime add table public.access_requests;
  end if;
end;
$$;
