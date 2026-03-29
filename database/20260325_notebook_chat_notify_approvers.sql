-- Send notebook borrow/return chat notifications to all notebook approvers,
-- including executive users.

create or replace function public.send_chat_message_to_it_staff(_message text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  recipient record;
begin
  if auth.uid() is null then
    return;
  end if;

  if trim(coalesce(_message, '')) = '' then
    return;
  end if;

  for recipient in
    select p.id
    from public.profiles p
    where p.id <> auth.uid()
      and lower(coalesce(to_jsonb(p) ->> 'role', '')) in ('it_support', 'admin', 'it_manager', 'executive')
  loop
    perform public.send_chat_message_to_user(recipient.id, _message, 'text');
  end loop;
end;
$$;

grant execute on function public.send_chat_message_to_it_staff(text) to authenticated;

notify pgrst, 'reload schema';
