alter table public.borrow_logs
  add column if not exists return_image_url text,
  add column if not exists return_image_name text,
  add column if not exists return_image_mime_type text,
  add column if not exists return_image_size bigint;

create or replace function public.request_notebook_return(
  _log_id bigint,
  _return_image_url text,
  _return_image_name text default null,
  _return_image_mime_type text default null,
  _return_image_size bigint default null
)
returns public.borrow_logs
language plpgsql
security definer
set search_path = public
as $$
declare
  _self_id uuid := auth.uid();
  _log public.borrow_logs;
  _notebook public.notebooks;
  _return_time timestamp with time zone := timezone('utc'::text, now());
begin
  if _self_id is null then
    raise exception 'Not authenticated';
  end if;

  select *
  into _log
  from public.borrow_logs
  where id = _log_id
  for update;

  if _log.id is null then
    raise exception 'Borrow log not found';
  end if;

  if _log.user_id <> _self_id then
    raise exception 'Not authorized';
  end if;

  if _log.status <> 'approved' then
    raise exception 'Notebook is not currently borrowed';
  end if;

  select *
  into _notebook
  from public.notebooks
  where id = _log.notebook_id
  for update;

  if _notebook.id is null then
    raise exception 'Notebook not found';
  end if;

  if not public.is_notebook_center_asset(_notebook.asset_code) then
    raise exception 'Notebook is not available for return';
  end if;

  if trim(coalesce(_return_image_url, '')) = '' then
    raise exception 'Notebook return photo is required';
  end if;

  update public.borrow_logs
  set
    status = 'returned',
    return_time = _return_time,
    duration = _return_time - coalesce(borrow_time, _return_time),
    return_image_url = _return_image_url,
    return_image_name = _return_image_name,
    return_image_mime_type = _return_image_mime_type,
    return_image_size = _return_image_size
  where id = _log.id
  returning * into _log;

  perform public.send_chat_message_to_it_staff(
    format(
      'User %s คืน Notebook %s แล้ว',
      public.get_profile_display_name(_self_id),
      _notebook.asset_code
    )
  );

  return _log;
end;
$$;

grant execute on function public.request_notebook_return(
  bigint,
  text,
  text,
  text,
  bigint
) to authenticated;

update public.borrow_logs bl
set
  return_image_url = format(
    'https://ankhxyssvpnxnqlrtrxa.supabase.co/storage/v1/object/public/notebook-borrow-proof/%s',
    matched.name
  ),
  return_image_name = coalesce(
    bl.return_image_name,
    nullif(regexp_replace(split_part(matched.name, '/', 3), '^[0-9]+_return_', ''), '')
  )
from lateral (
  select
    o.name,
    abs(
      coalesce(nullif(substring(split_part(o.name, '/', 3) from '^[0-9]{10,}'), ''), '0')::bigint
      - (extract(epoch from coalesce(bl.return_time, bl.return_confirmed_at, bl.requested_at)) * 1000)::bigint
    ) as diff_ms
  from storage.objects o
  where o.bucket_id = 'notebook-borrow-proof'
    and o.name like format('borrow/%s/%%', bl.user_id::text)
    and o.name ilike '%_return_%'
    and (
      coalesce(bl.return_image_name, '') = ''
      or o.name ilike format(
        '%%%s',
        regexp_replace(bl.return_image_name, '[^a-zA-Z0-9._-]', '_', 'g')
      )
    )
  order by
    case
      when coalesce(bl.return_image_name, '') <> ''
        and o.name ilike format(
          '%%%s',
          regexp_replace(bl.return_image_name, '[^a-zA-Z0-9._-]', '_', 'g')
        )
      then 0
      else 1
    end,
    diff_ms asc,
    o.name desc
  limit 1
) matched
where bl.status = 'returned'
  and coalesce(bl.return_image_url, '') = ''
  and matched.diff_ms <= 86400000;
