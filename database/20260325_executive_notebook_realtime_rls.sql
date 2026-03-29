-- Allow executive notebook approvers to receive realtime changes from borrow_logs.

drop policy if exists borrow_logs_select_policy on public.borrow_logs;
create policy borrow_logs_select_policy
  on public.borrow_logs
  for select
  to authenticated
  using (
    user_id = auth.uid()
    or public.is_notebook_approver()
  );

notify pgrst, 'reload schema';
