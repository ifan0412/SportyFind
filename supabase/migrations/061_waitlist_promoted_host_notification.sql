-- Waitlist promotion: notify joiner + host with correct copy (joiner joined from waitlist).

alter table public.notifications
  drop constraint if exists notifications_type_check;

alter table public.notifications
  add constraint notifications_type_check
  check (type in (
    'friend_request', 'friend_accepted',
    'team_join_request', 'team_request_accepted', 'team_request_rejected', 'team_member_left',
    'event_registration', 'event_waitlist_signup', 'event_waitlist_promoted', 'event_waitlist_promoted_host',
    'event_kicked', 'event_leave', 'event_cancelled', 'event_accepted', 'event_joined',
    'coach_enquiry', 'coach_enquiry_withdrawn', 'coach_review',
    'physio_enquiry', 'physio_enquiry_withdrawn', 'physio_review',
    'discussion_new_post', 'discussion_post_like', 'discussion_post_comment', 'discussion_comment_like',
    'account_reactivated', 'admin_team_removed', 'admin_event_removed',
    'direct_message'
  ));

create or replace function public.notify_event_waitlist_promoted(p_event_id uuid, p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $func$
declare
  v_host uuid;
begin
  if p_user_id is null then
    return;
  end if;

  insert into public.notifications (user_id, sender_id, type, is_read, event_id, push_eligible)
  values (p_user_id, null, 'event_waitlist_promoted', false, p_event_id, true);

  v_host := public.resolve_event_host_id(p_event_id);
  if v_host is null or v_host = p_user_id then
    return;
  end if;

  insert into public.notifications (user_id, sender_id, type, is_read, event_id, push_eligible)
  values (v_host, p_user_id, 'event_waitlist_promoted_host', false, p_event_id, true);
end;
$func$;

grant execute on function public.notify_event_waitlist_promoted(uuid, uuid) to authenticated;

-- Ensure auto-promotion uses the same notifier (not event_joined).
create or replace function public.promote_event_waitlist(p_event_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $func$
declare
  v_event record;
  v_filled integer;
  v_promoted record;
  v_promoted_slots integer;
begin
  select * into v_event from public.events where id = p_event_id;
  if not found then
    return;
  end if;

  if v_event.registration_type is distinct from 'individual' then
    return;
  end if;

  if coalesce(v_event.approval_mode, 'fcfs') <> 'fcfs' then
    return;
  end if;

  select coalesce(sum(
    case
      when lower(er.status) in ('going', 'confirmed', 'accepted')
      then 1 + coalesce(er.companion_count, 0)
      else 0
    end
  ), 0) into v_filled
  from public.event_registrations er
  where er.event_id = p_event_id
    and lower(coalesce(er.status, '')) not in ('cancelled', 'kicked', 'rejected');

  select er.* into v_promoted
  from public.event_registrations er
  where er.event_id = p_event_id
    and lower(coalesce(er.status, '')) in ('waitlist', 'waiting', 'queued')
  order by er.registered_at asc
  limit 1;

  if not found then
    return;
  end if;

  v_promoted_slots := 1 + coalesce(v_promoted.companion_count, 0);
  if v_event.max_capacity is not null and v_filled + v_promoted_slots > v_event.max_capacity then
    return;
  end if;

  update public.event_registrations
  set status = 'going', last_updated_at = now()
  where id = v_promoted.id;

  perform public.notify_event_waitlist_promoted(p_event_id, v_promoted.user_id);
end;
$func$;

grant execute on function public.promote_event_waitlist(uuid) to authenticated;
