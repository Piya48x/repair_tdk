-- Harden meeting room booking consistency and cross-account visibility.
-- Safe to run multiple times.

create extension if not exists btree_gist;

alter table if exists public.meeting_room_bookings enable row level security;

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

create index if not exists meeting_room_bookings_room_date_idx
  on public.meeting_room_bookings (room_name, booking_date);

do $$
declare
  has_constraint boolean;
  has_overlap boolean;
begin
  select exists(
    select 1
    from pg_constraint
    where conname = 'meeting_room_no_overlap'
  ) into has_constraint;

  if has_constraint then
    return;
  end if;

  select exists(
    select 1
    from public.meeting_room_bookings a
    join public.meeting_room_bookings b
      on a.id < b.id
     and a.room_name = b.room_name
     and a.booking_date = b.booking_date
     and coalesce(a.status, 'confirmed') <> 'cancelled'
     and coalesce(b.status, 'confirmed') <> 'cancelled'
     and a.start_time < b.end_time
     and a.end_time > b.start_time
  ) into has_overlap;

  if has_overlap then
    raise notice 'Skip add meeting_room_no_overlap: existing overlap rows detected.';
  else
    alter table public.meeting_room_bookings
      add constraint meeting_room_no_overlap
      exclude using gist (
        room_name with =,
        tsrange((booking_date + start_time), (booking_date + end_time), '[)') with &&
      )
      where (coalesce(status, 'confirmed') <> 'cancelled');
  end if;
end;
$$;
