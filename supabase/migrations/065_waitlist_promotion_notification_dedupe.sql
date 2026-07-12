-- Idempotent fix: one joiner alert on waitlist promotion, no stale signup copies.

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

  v_host := public.resolve_event_host_id(p_event_id);

  delete from public.notifications
  where event_id = p_event_id
    and user_id = p_user_id
    and type in ('event_registration', 'event_waitlist_joined', 'event_waitlist_signup');

  insert into public.notifications (user_id, sender_id, type, is_read, event_id, push_eligible)
  values (p_user_id, v_host, 'event_waitlist_promoted', false, p_event_id, true);

  if v_host is null or v_host = p_user_id then
    return;
  end if;

  insert into public.notifications (user_id, sender_id, type, is_read, event_id, push_eligible)
  values (v_host, p_user_id, 'event_waitlist_promoted_host', false, p_event_id, true);
end;
$func$;

-- Ensure auto-promote only updates status; trigger sends promotion alerts once.
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
end;
$func$;

grant execute on function public.notify_event_waitlist_promoted(uuid, uuid) to authenticated;
grant execute on function public.promote_event_waitlist(uuid) to authenticated;
