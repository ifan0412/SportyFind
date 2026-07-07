-- Individual event join mode: first-come-first-served vs host approval

alter table public.events
  add column if not exists approval_mode text
    check (approval_mode is null or approval_mode in ('fcfs', 'approval'));

comment on column public.events.approval_mode is
  'Individual events only: fcfs = auto going/waitlist; approval = pending until host approves';

update public.events
set approval_mode = 'fcfs'
where registration_type = 'individual' and approval_mode is null;

-- Widen notification types
alter table public.notifications
  drop constraint if exists notifications_type_check;

alter table public.notifications
  add constraint notifications_type_check
  check (type in (
    'friend_request', 'friend_accepted',
    'team_join_request', 'team_request_accepted', 'team_request_rejected',
    'event_registration', 'event_kicked', 'event_cancelled', 'event_accepted',
    'coach_enquiry', 'coach_review'
  ));

-- Notify registrant when host approves their application
create or replace function public.notify_event_accepted(p_event_id uuid, p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $func$
declare
  v_host uuid := auth.uid();
begin
  if v_host is null then
    raise exception 'Not authenticated';
  end if;

  if not exists (
    select 1 from public.events e
    where e.id = p_event_id
      and (e.creator_id = v_host or exists (
        select 1 from public.team_members tm
        where tm.team_id = e.organizer_team_id
          and tm.user_id = v_host
          and tm.role in ('admin', 'coach')
      ))
  ) then
    raise exception 'Not authorized';
  end if;

  insert into public.notifications (user_id, sender_id, type, is_read, event_id)
  values (p_user_id, v_host, 'event_accepted', false, p_event_id);
end;
$func$;

grant execute on function public.notify_event_accepted(uuid, uuid) to authenticated;

-- Individual RSVP: respect approval_mode (fcfs vs approval)
create or replace function public.upsert_individual_rsvp(
  p_event_id uuid,
  p_companion_count integer default 0,
  p_alias text default null,
  p_note text default null,
  p_reason text default null,
  p_cancel boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $func$
declare
  v_user uuid := auth.uid();
  v_event record;
  v_reg record;
  v_filled integer;
  v_slots_needed integer;
  v_new_status text;
  v_approval_mode text;
  v_is_late boolean;
  v_hours_to_start numeric;
begin
  if v_user is null then
    return jsonb_build_object('success', false, 'message', '請先登入');
  end if;

  select * into v_event from public.events where id = p_event_id;
  if not found then
    return jsonb_build_object('success', false, 'message', '找不到活動');
  end if;

  if v_event.registration_type is distinct from 'individual' then
    return jsonb_build_object('success', false, 'message', '此活動不開放個人報名');
  end if;

  v_approval_mode := coalesce(v_event.approval_mode, 'fcfs');

  select * into v_reg
  from public.event_registrations
  where event_id = p_event_id and user_id = v_user
  order by registered_at desc
  limit 1;

  if p_cancel then
    if v_reg is null or v_reg.status = 'cancelled' then
      return jsonb_build_object('success', false, 'message', '您尚未報名此活動');
    end if;

    v_hours_to_start := extract(epoch from (v_event.start_time - now())) / 3600.0;
    v_is_late := v_hours_to_start < coalesce(v_event.late_cancellation_hours, 24);

    update public.event_registrations
    set
      status = 'cancelled',
      companion_count = 0,
      last_updated_at = now(),
      has_late_infraction = case when v_is_late then true else coalesce(has_late_infraction, false) end
    where id = v_reg.id;

    return jsonb_build_object(
      'success', true,
      'message', case when v_is_late then '已退出活動（已標記臨場違規）' else '已退出活動' end
    );
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
    and lower(er.status) <> 'cancelled';

  v_slots_needed := 1 + coalesce(p_companion_count, 0);

  if v_approval_mode = 'approval' then
    v_new_status := 'pending';
  elsif v_reg is not null and lower(v_reg.status) in ('going', 'confirmed', 'accepted') then
    v_filled := v_filled - (1 + coalesce(v_reg.companion_count, 0));
    if v_event.max_capacity is not null and v_filled + v_slots_needed > v_event.max_capacity then
      v_new_status := 'waitlist';
    else
      v_new_status := 'going';
    end if;
  elsif v_event.max_capacity is not null and v_filled + v_slots_needed > v_event.max_capacity then
    v_new_status := 'waitlist';
  else
    v_new_status := 'going';
  end if;

  if v_reg is not null then
    if lower(v_reg.status) in ('kicked', 'rejected', 'cancelled') then
      update public.event_registrations
      set
        status = v_new_status,
        companion_count = coalesce(p_companion_count, 0),
        alias = nullif(trim(p_alias), ''),
        note = nullif(trim(p_note), ''),
        last_updated_at = now(),
        registered_at = now()
      where id = v_reg.id;
    elsif lower(v_reg.status) in ('pending', 'reviewing', 'waitlist', 'waiting') then
      update public.event_registrations
      set
        companion_count = coalesce(p_companion_count, 0),
        alias = nullif(trim(p_alias), ''),
        note = nullif(trim(p_note), ''),
        last_updated_at = now()
      where id = v_reg.id;
      v_new_status := lower(v_reg.status);
    else
      update public.event_registrations
      set
        companion_count = coalesce(p_companion_count, 0),
        alias = nullif(trim(p_alias), ''),
        note = nullif(trim(p_note), ''),
        last_updated_at = now()
      where id = v_reg.id;
      v_new_status := lower(v_reg.status);
    end if;
  else
    insert into public.event_registrations (
      event_id, user_id, status, companion_count, alias, note, registered_at, last_updated_at
    ) values (
      p_event_id,
      v_user,
      v_new_status,
      coalesce(p_companion_count, 0),
      nullif(trim(p_alias), ''),
      nullif(trim(p_note), ''),
      now(),
      now()
    );
  end if;

  return jsonb_build_object(
    'success', true,
    'message', case
      when v_new_status = 'pending' then '申請已送出，等候主辦審核'
      when v_new_status = 'waitlist' then '已排入候補名單'
      else '報名成功'
    end,
    'status', v_new_status
  );
end;
$func$;

grant execute on function public.upsert_individual_rsvp(uuid, integer, text, text, text, boolean) to authenticated;
