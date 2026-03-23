-- Realign notebook rows with borrow_logs after manual inventory edits
-- left some rows stuck in status = 'borrowed' without a matching borrower.

with active_logs as (
  select distinct on (bl.notebook_id)
    bl.notebook_id,
    bl.user_id,
    bl.borrow_time
  from public.borrow_logs bl
  where bl.status in ('approved', 'returned')
    and bl.return_confirmed_at is null
  order by
    bl.notebook_id,
    coalesce(bl.return_time, bl.borrow_time, bl.approved_at, bl.requested_at) desc,
    bl.id desc
)
update public.notebooks n
set
  status = 'borrowed',
  current_user_id = active_logs.user_id,
  borrow_time = active_logs.borrow_time
from active_logs
where n.id = active_logs.notebook_id
  and (
    n.status is distinct from 'borrowed'
    or n.current_user_id is distinct from active_logs.user_id
    or n.borrow_time is distinct from active_logs.borrow_time
  );

update public.notebooks n
set
  status = case
    when n.status = 'borrowed' then 'available'
    else n.status
  end,
  current_user_id = null,
  borrow_time = null
where not exists (
  select 1
  from public.borrow_logs bl
  where bl.notebook_id = n.id
    and bl.status in ('approved', 'returned')
    and bl.return_confirmed_at is null
)
and (
  n.status = 'borrowed'
  or n.current_user_id is not null
  or n.borrow_time is not null
);
