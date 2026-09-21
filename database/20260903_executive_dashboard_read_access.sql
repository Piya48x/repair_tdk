-- Give IT managers and executives a complete read-only view for management dashboards.
-- Existing insert, update, approval, and delete permissions are unchanged.

begin;

drop policy if exists "Users can view own access requests" on public.access_requests;
create policy "Users can view own access requests"
  on public.access_requests
  for select
  using (
    auth.uid() = requester_user_id
    or exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and lower(p.role::text) in ('it_support', 'it_manager', 'executive', 'admin')
    )
  );

notify pgrst, 'reload schema';

commit;
