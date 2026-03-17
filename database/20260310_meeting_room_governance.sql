-- Meeting room governance hardening:
-- 1) lifecycle fields for post-meeting minutes
-- 2) ownership-based RLS (owner + IT/Admin)
-- 3) data integrity and audit timestamps
-- Safe to run multiple times.

alter table if exists public.meeting_room_bookings
  add column if not exists created_by uuid,
  add column if not exists meeting_summary text,
  add column if not exists meeting_decisions text,
  add column if not exists action_items text,
  add column if not exists minutes_submitted_at timestamptz,
  add column if not exists updated_at timestamptz;

alter table if exists public.meeting_room_bookings
  alter column created_by set default auth.uid();

update public.meeting_room_bookings
set status = 'confirmed'
where coalesce(status, '') not in ('confirmed', 'completed', 'cancelled');

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'meeting_room_booking_status_check'
  ) then
    alter table public.meeting_room_bookings
      add constraint meeting_room_booking_status_check
      check (coalesce(status, 'confirmed') in ('confirmed', 'completed', 'cancelled'));
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'meeting_room_bookings_created_by_fkey'
  ) then
    alter table public.meeting_room_bookings
      add constraint meeting_room_bookings_created_by_fkey
      foreign key (created_by)
      references auth.users(id)
      on delete set null;
  end if;
end;
$$;

update public.meeting_room_bookings
set updated_at = coalesce(updated_at, created_at::timestamptz, now())
where updated_at is null;

create index if not exists meeting_room_bookings_created_by_idx
  on public.meeting_room_bookings (created_by);

create index if not exists meeting_room_bookings_status_booking_date_idx
  on public.meeting_room_bookings (status, booking_date);

create or replace function public.set_meeting_room_booking_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_meeting_room_booking_updated_at on public.meeting_room_bookings;
create trigger trg_meeting_room_booking_updated_at
before update on public.meeting_room_bookings
for each row
execute function public.set_meeting_room_booking_updated_at();

alter table if exists public.meeting_room_bookings enable row level security;

drop policy if exists "Authenticated users can view bookings" on public.meeting_room_bookings;
drop policy if exists "Authenticated users can create bookings" on public.meeting_room_bookings;
drop policy if exists "Authenticated users can update bookings" on public.meeting_room_bookings;
drop policy if exists "Authenticated users can delete bookings" on public.meeting_room_bookings;

drop policy if exists "Users can view meeting bookings" on public.meeting_room_bookings;
create policy "Users can view meeting bookings"
  on public.meeting_room_bookings
  for select
  using (auth.role() = 'authenticated');

drop policy if exists "Users can create own meeting bookings" on public.meeting_room_bookings;
create policy "Users can create own meeting bookings"
  on public.meeting_room_bookings
  for insert
  with check (
    auth.role() = 'authenticated'
    and coalesce(created_by, auth.uid()) = auth.uid()
  );

drop policy if exists "Owners or IT can update meeting bookings" on public.meeting_room_bookings;
create policy "Owners or IT can update meeting bookings"
  on public.meeting_room_bookings
  for update
  using (
    auth.role() = 'authenticated'
    and (
      created_by = auth.uid()
      or (
        created_by is null
        and lower(trim(coalesce(booked_by, ''))) = lower(trim(coalesce((
          select p.full_name
          from public.profiles p
          where p.id = auth.uid()
          limit 1
        ), '')))
      )
      or exists (
        select 1
        from public.profiles p
        where p.id = auth.uid()
          and p.role in ('it_support', 'admin')
      )
    )
  )
  with check (
    auth.role() = 'authenticated'
    and (
      created_by = auth.uid()
      or (
        created_by is null
        and lower(trim(coalesce(booked_by, ''))) = lower(trim(coalesce((
          select p.full_name
          from public.profiles p
          where p.id = auth.uid()
          limit 1
        ), '')))
      )
      or exists (
        select 1
        from public.profiles p
        where p.id = auth.uid()
          and p.role in ('it_support', 'admin')
      )
    )
  );

drop policy if exists "Owners or IT can delete meeting bookings" on public.meeting_room_bookings;
create policy "Owners or IT can delete meeting bookings"
  on public.meeting_room_bookings
  for delete
  using (
    auth.role() = 'authenticated'
    and (
      created_by = auth.uid()
      or (
        created_by is null
        and lower(trim(coalesce(booked_by, ''))) = lower(trim(coalesce((
          select p.full_name
          from public.profiles p
          where p.id = auth.uid()
          limit 1
        ), '')))
      )
      or exists (
        select 1
        from public.profiles p
        where p.id = auth.uid()
          and p.role in ('it_support', 'admin')
      )
    )
  );

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'meeting_room_bookings'
  ) then
    alter publication supabase_realtime add table public.meeting_room_bookings;
  end if;
end;
$$;
