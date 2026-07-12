-- Direct message → in-app notification bell + push (one active notif per sender).

alter table public.notifications
  drop constraint if exists notifications_type_check;

alter table public.notifications
  add constraint notifications_type_check
  check (type in (
    'friend_request', 'friend_accepted',
    'team_join_request', 'team_request_accepted', 'team_request_rejected', 'team_member_left',
    'event_registration', 'event_waitlist_signup', 'event_waitlist_promoted',
    'event_kicked', 'event_leave', 'event_cancelled', 'event_accepted', 'event_joined',
    'coach_enquiry', 'coach_enquiry_withdrawn', 'coach_review',
    'physio_enquiry', 'physio_enquiry_withdrawn', 'physio_review',
    'discussion_new_post', 'discussion_post_like', 'discussion_post_comment', 'discussion_comment_like',
    'account_reactivated', 'admin_team_removed', 'admin_event_removed',
    'direct_message'
  ));

create or replace function public.notify_direct_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $func$
begin
  if NEW.receiver_id is null or NEW.sender_id is null or NEW.sender_id = NEW.receiver_id then
    return NEW;
  end if;

  delete from public.notifications
  where user_id = NEW.receiver_id
    and sender_id = NEW.sender_id
    and type = 'direct_message';

  insert into public.notifications (user_id, sender_id, type, is_read, push_eligible)
  values (NEW.receiver_id, NEW.sender_id, 'direct_message', false, true);

  return NEW;
end;
$func$;

drop trigger if exists messages_notify_direct_message on public.messages;

create trigger messages_notify_direct_message
  after insert on public.messages
  for each row
  execute function public.notify_direct_message();
