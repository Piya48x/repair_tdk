alter table public.it_work_records
  add column if not exists requester_profile_id uuid,
  add column if not exists requester_employee_code text not null default '',
  add column if not exists footage_start_at timestamptz,
  add column if not exists footage_end_at timestamptz,
  add column if not exists approval_status text not null default 'not_required',
  add column if not exists approved_by_name text not null default '';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'it_work_records_approval_status_check'
      and conrelid = 'public.it_work_records'::regclass
  ) then
    alter table public.it_work_records
      add constraint it_work_records_approval_status_check
      check (approval_status in ('not_required', 'pending', 'approved', 'rejected'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'it_work_records_footage_range_check'
      and conrelid = 'public.it_work_records'::regclass
  ) then
    alter table public.it_work_records
      add constraint it_work_records_footage_range_check
      check (
        footage_start_at is null
        or footage_end_at is null
        or footage_end_at >= footage_start_at
      );
  end if;
end;
$$;

create index if not exists idx_it_work_records_requester_profile
  on public.it_work_records (requester_profile_id);

create index if not exists idx_it_work_records_camera_footage
  on public.it_work_records (footage_start_at desc)
  where job_type = 'camera_view_request';

comment on column public.it_work_records.requester_profile_id is
  'Profile selected as the requester, when available.';

comment on column public.it_work_records.requester_employee_code is
  'Employee code captured with the requester name for audit history.';

comment on column public.it_work_records.footage_start_at is
  'Beginning of the CCTV footage window requested for review.';

comment on column public.it_work_records.footage_end_at is
  'End of the CCTV footage window requested for review.';

comment on column public.it_work_records.approval_status is
  'Approval state for CCTV viewing requests; not_required for ordinary IT work records.';

comment on column public.it_work_records.approved_by_name is
  'Name of the person who approved or rejected the CCTV viewing request.';

notify pgrst, 'reload schema';
