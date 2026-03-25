alter table public.it_work_records
  add column if not exists start_time timestamptz,
  add column if not exists end_time timestamptz,
  add column if not exists duration_minutes integer not null default 0;

update public.it_work_records
set
  start_time = coalesce(start_time, performed_at, created_at),
  performed_at = coalesce(start_time, performed_at, created_at)
where start_time is null
   or performed_at is null;

update public.it_work_records
set duration_minutes = case
  when start_time is not null and end_time is not null and end_time >= start_time
    then greatest(floor(extract(epoch from (end_time - start_time)) / 60)::integer, 0)
  else 0
end;

create index if not exists idx_it_work_records_start_time
  on public.it_work_records (start_time desc);

create index if not exists idx_it_work_records_created_by
  on public.it_work_records (created_by);

create index if not exists idx_it_work_records_department
  on public.it_work_records (department);

create or replace function public.set_it_work_records_updated_at()
returns trigger
language plpgsql
as $$
begin
  if new.start_time is null then
    new.start_time = coalesce(new.performed_at, timezone('utc', now()));
  end if;

  new.performed_at = coalesce(new.start_time, new.performed_at, timezone('utc', now()));

  if new.end_time is not null and new.start_time is not null and new.end_time < new.start_time then
    raise exception 'end_time must be greater than or equal to start_time';
  end if;

  if new.start_time is not null and new.end_time is not null then
    new.duration_minutes = greatest(
      floor(extract(epoch from (new.end_time - new.start_time)) / 60)::integer,
      0
    );
  else
    new.duration_minutes = 0;
  end if;

  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

notify pgrst, 'reload schema';
