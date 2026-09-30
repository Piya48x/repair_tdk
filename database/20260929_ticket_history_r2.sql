begin;

alter table public.tickets
  add column if not exists archive_object_key text,
  add column if not exists archived_at timestamptz;

create index if not exists tickets_archived_at_idx
  on public.tickets (archived_at desc)
  where archived_at is not null;

comment on column public.tickets.archive_object_key is
  'Private Cloudflare R2 object key containing the closed ticket JSON snapshot.';

comment on column public.tickets.archived_at is
  'UTC timestamp when the latest closed ticket snapshot was archived to R2.';

notify pgrst, 'reload schema';

commit;
