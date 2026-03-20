-- Walk-in / manual ticket support for admin dashboard.
-- Safe to run multiple times.

alter table if exists public.tickets
  add column if not exists created_by uuid references auth.users(id),
  add column if not exists channel text,
  add column if not exists start_time timestamp with time zone default timezone('utc'::text, now()) not null,
  add column if not exists end_time timestamp with time zone,
  add column if not exists resolution_note text;

create index if not exists tickets_created_by_idx
  on public.tickets (created_by);

create index if not exists tickets_channel_idx
  on public.tickets (channel);
