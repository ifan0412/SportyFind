-- Fix events sport validation, waitlist promotion notifications, and host registration notify RPC

-- ---------------------------------------------------------------------------
-- 1. Events sport_category / sports sync (fixes check_valid_sports on create)
-- ---------------------------------------------------------------------------

alter table public.events drop constraint if exists check_valid_sports;

alter table public.events drop constraint if exists events_sport_category_check;
alter table public.events
  add constraint events_sport_category_check
  check (
    sport_category is null
    or sport_category in (
      'volleyball', 'basketball', 'soccer', 'tennis', 'badminton',
      'pickleball', 'gym', 'running', 'boxing', 'yoga'
    )
  );

-- Keep legacy sports[] column in sync when present (some environments validate it).
do $migrate$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'events'
      and column_name = 'sports'
  ) then
    execute $func$
      create or replace function public.sync_event_sports_from_category()
      returns trigger
      language plpgsql
      as $body$
      begin
        if new.sport_category is not null then
          new.sports := array[new.sport_category];
        end if;
        return new;
      end;
      $body$;
    $func$;

    execute 'drop trigger if exists events_sync_sports_from_category on public.events';
    execute '
      create trigger events_sync_sports_from_category
        before insert or update of sport_category on public.events
        for each row
        execute function public.sync_event_sports_from_category()
    ';
  end if;
end;
$migrate$;

-- ---------------------------------------------------------------------------
-- 2. Notification types
-- ---------------------------------------------------------------------------

alter table public.notifications
  drop constraint if exists notifications_type_check;

alter table public.notifications
  add constraint notifications_type_check
  check (type in (
    'friend_request', 'friend_accepted',
    'team_join_request', 'team_request_accepted', 'team_request_rejected',
    'event_registration', 'event_kicked', 'event_cancelled', 'event_accepted',
    'event_joined',
    'coach_enquiry', 'coach_review'
  ));

-- Notify event host when someone registers (new join / waitlist signup).
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

  select coalesce(e.creator_id, tm.user_id)
  into v_host
  from public.events e
  left join lateral (
    select tm.user_id
    from public.team_members tm
    where tm.team_id = e.organizer_team_id
      and tm.role in ('admin', 'coach')
    order by case tm.role when 'admin' then 0 else 1 end, tm.joined_at
    limit 1
  ) tm on true
  where e.id = p_event_id;

  if v_host is null then
    return;
  end if;

  if v_host = v_registrant then
    return;
  end if;

  insert into public.notifications (user_id, sender_id, type, is_read, event_id)
  values (v_host, v_registrant, 'event_registration', false, p_event_id);
end;
$func$;

grant execute on function public.notify_event_registration(uuid) to authenticated;

-- Notify participant when they are promoted from waitlist or otherwise confirmed.
create or replace function public.notify_event_joined(p_event_id uuid, p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $func$
declare
  v_host uuid;
begin
  select coalesce(e.creator_id, tm.user_id)
  into v_host
  from public.events e
  left join lateral (
    select tm.user_id
    from public.team_members tm
    where tm.team_id = e.organizer_team_id
      and tm.role in ('admin', 'coach')
    order by case tm.role when 'admin' then 0 else 1 end, tm.joined_at
    limit 1
  ) tm on true
  where e.id = p_event_id;

  if v_host is null then
    v_host := auth.uid();
  end if;

  insert into public.notifications (user_id, sender_id, type, is_read, event_id)
  values (p_user_id, coalesce(v_host, p_user_id), 'event_joined', false, p_event_id);
end;
$func$;

grant execute on function public.notify_event_joined(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Individual RSVP: promote waitlist on cancel + correct notifications
-- ---------------------------------------------------------------------------

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
  v_user_gender text;
  v_req text;
  v_promoted record;
  v_promoted_slots integer;
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
  v_req := coalesce(v_event.gender_requirement, 'both');

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

    -- Promote earliest waitlist entry when a confirmed slot opens (FCFS only).
    if v_approval_mode = 'fcfs' then
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

      select er.* into v_promoted
      from public.event_registrations er
      where er.event_id = p_event_id
        and lower(er.status) in ('waitlist', 'waiting', 'queued')
      order by er.registered_at asc
      limit 1;

      if found then
        v_promoted_slots := 1 + coalesce(v_promoted.companion_count, 0);
        if v_event.max_capacity is null or v_filled + v_promoted_slots <= v_event.max_capacity then
          update public.event_registrations
          set status = 'going', last_updated_at = now()
          where id = v_promoted.id;

          perform public.notify_event_joined(p_event_id, v_promoted.user_id);
        end if;
      end if;
    end if;

    return jsonb_build_object(
      'success', true,
      'message', case when v_is_late then '已退出活動（已標記臨場違規）' else '已退出活動' end
    );
  end if;

  if v_req <> 'both' then
    select gender into v_user_gender from public.profiles where id = v_user;
    if v_user_gender is null then
      return jsonb_build_object('success', false, 'message', '請先於個人檔案設定性別');
    end if;
    if v_user_gender is distinct from v_req then
      return jsonb_build_object(
        'success', false,
        'message', case
          when v_req = 'male' then '不符合性別要求：此活動僅限男性參加'
          when v_req = 'female' then '不符合性別要求：此活動僅限女性參加'
          else '不符合此活動的性別報名要求'
        end
      );
    end if;
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
