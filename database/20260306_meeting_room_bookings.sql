-- Meeting Room Booking schema for organization-wide room availability.
-- Safe to run multiple times.

create extension if not exists "uuid-ossp";

create table if not exists public.meeting_room_bookings (
  id uuid primary key default uuid_generate_v4(),
  room_name text not null,
  title text,
  booked_by text,
  booking_date date not null,
  start_time time not null,
  end_time time not null,
  status text default 'confirmed',
  created_at timestamp default now(),
  constraint meeting_room_booking_time_check check (end_time > start_time)
);

create index if not exists idx_booking_date
  on public.meeting_room_bookings (booking_date);

alter table public.meeting_room_bookings enable row level security;

drop policy if exists "Authenticated users can view bookings" on public.meeting_room_bookings;
create policy "Authenticated users can view bookings"
  on public.meeting_room_bookings
  for select
  using (auth.role() = 'authenticated');

drop policy if exists "Authenticated users can create bookings" on public.meeting_room_bookings;
create policy "Authenticated users can create bookings"
  on public.meeting_room_bookings
  for insert
  with check (auth.role() = 'authenticated');

drop policy if exists "Authenticated users can update bookings" on public.meeting_room_bookings;
create policy "Authenticated users can update bookings"
  on public.meeting_room_bookings
  for update
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

drop policy if exists "Authenticated users can delete bookings" on public.meeting_room_bookings;
create policy "Authenticated users can delete bookings"
  on public.meeting_room_bookings
  for delete
  using (auth.role() = 'authenticated');

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
