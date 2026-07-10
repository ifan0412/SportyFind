-- Fix waitlist promotion notifications and prevent self/host misrouting.

alter table public.notifications
  drop constraint if exists notifications_type_check;

alter table public.notifications
  add constraint notifications_type_check
  check (type in (
    'friend_request', 'friend_accepted',
    'team_join_request', 'team_request_accepted', 'team_request_rejected',
    'event_registration', 'event_waitlist_signup', 'event_waitlist_promoted',
    'event_kicked', 'event_cancelled', 'event_accepted', 'event_joined',
    'coach_enquiry', 'coach_review',
    'physio_enquiry', 'physio_review'
  ));

create or replace function public.resolve_event_host_id(p_event_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    e.creator_id,
    (
      select tm.user_id
      from public.team_members tm
      where tm.team_id = e.organizer_team_id
        and tm.role in ('admin', 'coach')
      order by case tm.role when 'admin' then 0 else 1 end, tm.joined_at
      limit 1
    )
  )
  from public.events e
  where e.id = p_event_id;
$$;

grant execute on function public.resolve_event_host_id(uuid) to authenticated;

-- Host: someone joined the waitlist (not a confirmed slot yet).
create or replace function public.notify_event_waitlist_signup(p_event_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $func$
declare
  v_registrant uuid := auth.uid();
  v_host uuid;
begin
  if v_registrant is null then
    raise exception 'Not authenticated';
  end if;

  v_host := public.resolve_event_host_id(p_event_id);
  if v_host is null or v_host = v_registrant then
    return;
  end if;

  insert into public.notifications (user_id, sender_id, type, is_read, event_id)
  values (v_host, v_registrant, 'event_waitlist_signup', false, p_event_id);
end;
$func$;

grant execute on function public.notify_event_waitlist_signup(uuid) to authenticated;

-- Participant: promoted from waitlist to confirmed.
create or replace function public.notify_event_waitlist_promoted(p_event_id uuid, p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $func$
begin
  if p_user_id is null then
    return;
  end if;

  insert into public.notifications (user_id, sender_id, type, is_read, event_id)
  values (p_user_id, null, 'event_waitlist_promoted', false, p_event_id);
end;
$func$;

grant execute on function public.notify_event_waitlist_promoted(uuid, uuid) to authenticated;

create or replace function public.notify_event_registration(p_event_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $func$
declare
  v_registrant uuid := auth.uid();
  v_host uuid;
begin
  if v_registrant is null then
    raise exception 'Not authenticated';
  end if;

  v_host := public.resolve_event_host_id(p_event_id);
  if v_host is null or v_host = v_registrant then
    return;
  end if;

  insert into public.notifications (user_id, sender_id, type, is_read, event_id)
  values (v_host, v_registrant, 'event_registration', false, p_event_id);
end;
$func$;

grant execute on function public.notify_event_registration(uuid) to authenticated;

create or replace function public.notify_event_joined(p_event_id uuid, p_user_id uuid)
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

  v_host := public.resolve_event_host_id(p_event_id);

  insert into public.notifications (user_id, sender_id, type, is_read, event_id)
  values (p_user_id, v_host, 'event_joined', false, p_event_id);
end;
$func$;

grant execute on function public.notify_event_joined(uuid, uuid) to authenticated;

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
