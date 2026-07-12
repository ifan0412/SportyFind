-- Friend request / accepted → in-app bell + push dispatch trigger.

create or replace function public.notify_friendship_request()
returns trigger
language plpgsql
security definer
set search_path = public
as $func$
begin
  if NEW.status = 'pending' and NEW.sender_id is distinct from NEW.receiver_id then
    delete from public.notifications
    where user_id = NEW.receiver_id
      and sender_id = NEW.sender_id
      and type = 'friend_request';

    insert into public.notifications (user_id, sender_id, type, is_read, friendship_id, push_eligible)
    values (NEW.receiver_id, NEW.sender_id, 'friend_request', false, NEW.id, true);
  end if;

  return NEW;
end;
$func$;

drop trigger if exists friendships_notify_friend_request on public.friendships;

create trigger friendships_notify_friend_request
  after insert on public.friendships
  for each row
  execute function public.notify_friendship_request();

create or replace function public.notify_friendship_accepted()
returns trigger
language plpgsql
security definer
set search_path = public
as $func$
begin
  if OLD.status = 'pending' and NEW.status = 'accepted' and NEW.sender_id is distinct from NEW.receiver_id then
    delete from public.notifications
    where friendship_id = NEW.id
      and type = 'friend_request';

    insert into public.notifications (user_id, sender_id, type, is_read, friendship_id, push_eligible)
    values (NEW.sender_id, NEW.receiver_id, 'friend_accepted', false, NEW.id, true);
  end if;

  return NEW;
end;
$func$;

drop trigger if exists friendships_notify_friend_accepted on public.friendships;

create trigger friendships_notify_friend_accepted
  after update on public.friendships
  for each row
  execute function public.notify_friendship_accepted();
