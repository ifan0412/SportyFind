-- Fix waitlist signup/promotion notifications: correct recipients, copy, and trigger coverage.

alter table public.notifications
  drop constraint if exists notifications_type_check;

alter table public.notifications
  add constraint notifications_type_check
  check (type in (
    'friend_request', 'friend_accepted',
    'team_join_request', 'team_request_accepted', 'team_request_rejected', 'team_member_left',
    'event_registration', 'event_waitlist_signup', 'event_waitlist_joined',
    'event_waitlist_promoted', 'event_waitlist_promoted_host',
    'event_kicked', 'event_leave', 'event_cancelled', 'event_accepted', 'event_joined',
    'coach_enquiry', 'coach_enquiry_withdrawn', 'coach_review',
    'physio_enquiry', 'physio_enquiry_withdrawn', 'physio_review',
    'discussion_new_post', 'discussion_post_like', 'discussion_post_comment', 'discussion_comment_like',
    'account_reactivated', 'admin_team_removed', 'admin_event_removed',
    'direct_message'
  ));

-- Host: someone joined the waitlist. Joiner: confirmation they are on the waitlist.
create or replace function public.notify_event_waitlist_signup(
  p_event_id uuid,
  p_registrant_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $func$
declare
  v_registrant uuid := coalesce(p_registrant_id, auth.uid());
  v_host uuid;
begin
  if v_registrant is null then
    return;
  end if;

  v_host := public.resolve_event_host_id(p_event_id);
  if v_host is null or v_host = v_registrant then
    return;
  end if;

  insert into public.notifications (user_id, sender_id, type, is_read, event_id, push_eligible)
  values (v_host, v_registrant, 'event_waitlist_signup', false, p_event_id, true);

  insert into public.notifications (user_id, sender_id, type, is_read, event_id, push_eligible)
  values (v_registrant, v_host, 'event_waitlist_joined', false, p_event_id, true);
end;
$func$;

grant execute on function public.notify_event_waitlist_signup(uuid, uuid) to authenticated;
grant execute on function public.notify_event_waitlist_signup(uuid) to authenticated;

create or replace function public.notify_event_registration(
  p_event_id uuid,
  p_registrant_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $func$
declare
  v_registrant uuid := coalesce(p_registrant_id, auth.uid());
  v_host uuid;
begin
  if v_registrant is null then
    return;
  end if;

  v_host := public.resolve_event_host_id(p_event_id);
  if v_host is null or v_host = v_registrant then
    return;
  end if;

  -- Host-only alert; never send registration copy to the joiner.
  insert into public.notifications (user_id, sender_id, type, is_read, event_id, push_eligible)
  values (v_host, v_registrant, 'event_registration', false, p_event_id, true);
end;
$func$;

grant execute on function public.notify_event_registration(uuid, uuid) to authenticated;
grant execute on function public.notify_event_registration(uuid) to authenticated;

-- Joiner promoted from waitlist + host alert.
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

  -- Remove stale/misrouted signup alerts so promotion shows a single clear message.
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

grant execute on function public.notify_event_waitlist_promoted(uuid, uuid) to authenticated;

-- Auto-promote without inline notify; registration trigger sends promotion alerts.
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

grant execute on function public.promote_event_waitlist(uuid) to authenticated;

create or replace function public.trg_promote_waitlist_on_registration_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $func$
declare
  v_event record;
  v_was_confirmed boolean;
  v_now_confirmed boolean;
  v_was_waitlist boolean;
begin
  if tg_op <> 'UPDATE' or new.event_id is null then
    return new;
  end if;

  if lower(coalesce(old.status, '')) = lower(coalesce(new.status, '')) then
    return new;
  end if;

  select * into v_event from public.events where id = new.event_id;
  if not found then
    return new;
  end if;

  if v_event.registration_type is distinct from 'individual' then
    return new;
  end if;

  if coalesce(v_event.approval_mode, 'fcfs') <> 'fcfs' then
    return new;
  end if;

  v_was_confirmed := lower(coalesce(old.status, '')) in ('going', 'confirmed', 'accepted');
  v_now_confirmed := lower(coalesce(new.status, '')) in ('going', 'confirmed', 'accepted');
  v_was_waitlist := lower(coalesce(old.status, '')) in ('waitlist', 'waiting', 'queued');

  if v_was_waitlist and v_now_confirmed then
    perform public.notify_event_waitlist_promoted(new.event_id, new.user_id);
  elsif v_was_confirmed and not v_now_confirmed then
    if lower(coalesce(new.status, '')) in ('cancelled', 'kicked', 'rejected') then
      perform public.notify_event_leave(new.event_id, old.user_id);
    end if;

    perform public.promote_event_waitlist(new.event_id);
  end if;

  return new;
end;
$func$;

drop trigger if exists trg_event_registration_promote_waitlist on public.event_registrations;

create trigger trg_event_registration_promote_waitlist
after update of status on public.event_registrations
for each row
execute function public.trg_promote_waitlist_on_registration_change();

-- Dispatch signup notifications from RPC (not client) to avoid wrong type / missing host alerts.
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
  v_is_new_or_rejoin boolean;
  v_companion_count integer;
  v_is_event_creator boolean;
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
  v_companion_count := greatest(coalesce(p_companion_count, 0), 0);
  v_is_event_creator := v_user = v_event.creator_id;

  select * into v_reg
  from public.event_registrations
  where event_id = p_event_id
    and user_id = v_user
  order by
    case
      when lower(coalesce(status, '')) not in ('cancelled', 'kicked', 'rejected') then 0
      else 1
    end,
    registered_at desc nulls last,
    id desc
  limit 1;

  if p_cancel then
    if v_reg is null or lower(coalesce(v_reg.status, '')) = 'cancelled' then
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
    and lower(coalesce(er.status, '')) not in ('cancelled', 'kicked', 'rejected');

  v_slots_needed := 1 + v_companion_count;

  if v_is_event_creator then
    v_new_status := 'going';
  elsif v_approval_mode = 'approval' then
    v_new_status := 'pending';
  elsif v_reg is not null and lower(coalesce(v_reg.status, '')) in ('going', 'confirmed', 'accepted') then
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

  v_is_new_or_rejoin := v_reg is null
    or lower(coalesce(v_reg.status, '')) in ('kicked', 'rejected', 'cancelled');

  if not v_is_event_creator
     and coalesce(v_event.accepting_guests, true) = false
     and v_is_new_or_rejoin then
    if v_approval_mode = 'approval' then
      v_new_status := 'pending';
    else
      v_new_status := 'waitlist';
    end if;
  end if;

  if lower(v_new_status) in ('waitlist', 'waiting', 'queued') and v_companion_count > 0 then
    return jsonb_build_object(
      'success', false,
      'message', '候補名單不接受攜伴報名，請改為 0 位攜伴或等候正式名額釋出'
    );
  end if;

  if lower(v_new_status) in ('waitlist', 'waiting', 'queued') then
    v_companion_count := 0;
  end if;

  if v_reg is not null then
    if lower(coalesce(v_reg.status, '')) in ('kicked', 'rejected', 'cancelled') then
      update public.event_registrations
      set
        status = v_new_status,
        companion_count = v_companion_count,
        alias = nullif(trim(p_alias), ''),
        note = nullif(trim(p_note), ''),
        last_updated_at = now(),
        registered_at = now()
      where id = v_reg.id;
    elsif lower(coalesce(v_reg.status, '')) in ('pending', 'reviewing', 'waitlist', 'waiting', 'queued') then
      if lower(coalesce(v_reg.status, '')) in ('waitlist', 'waiting', 'queued') and v_companion_count > 0 then
        return jsonb_build_object(
          'success', false,
          'message', '候補名單不接受攜伴報名，請改為 0 位攜伴'
        );
      end if;
      update public.event_registrations
      set
        status = case when v_is_event_creator then 'going' else status end,
        companion_count = case
          when lower(coalesce(v_reg.status, '')) in ('waitlist', 'waiting', 'queued') then 0
          else v_companion_count
        end,
        alias = nullif(trim(p_alias), ''),
        note = nullif(trim(p_note), ''),
        last_updated_at = now()
      where id = v_reg.id;
      v_new_status := case
        when v_is_event_creator then 'going'
        else lower(v_reg.status)
      end;
    else
      update public.event_registrations
      set
        companion_count = v_companion_count,
        alias = nullif(trim(p_alias), ''),
        note = nullif(trim(p_note), ''),
        last_updated_at = now()
      where id = v_reg.id;
      v_new_status := lower(v_reg.status);
    end if;
  else
    begin
      insert into public.event_registrations (
        event_id, user_id, status, companion_count, alias, note, registered_at, last_updated_at
      ) values (
        p_event_id,
        v_user,
        v_new_status,
        v_companion_count,
        nullif(trim(p_alias), ''),
        nullif(trim(p_note), ''),
        now(),
        now()
      );
    exception
      when unique_violation then
        select * into v_reg
        from public.event_registrations
        where event_id = p_event_id
          and user_id = v_user
        order by registered_at desc nulls last, id desc
        limit 1;

        if v_reg is null then
          raise;
        end if;

        if lower(coalesce(v_reg.status, '')) in ('kicked', 'rejected', 'cancelled') then
          update public.event_registrations
          set
            status = v_new_status,
            companion_count = v_companion_count,
            alias = nullif(trim(p_alias), ''),
            note = nullif(trim(p_note), ''),
            last_updated_at = now(),
            registered_at = now()
          where id = v_reg.id;
        elsif lower(coalesce(v_reg.status, '')) in ('pending', 'reviewing', 'waitlist', 'waiting', 'queued') then
          update public.event_registrations
          set
            status = case when v_is_event_creator then 'going' else status end,
            companion_count = case
              when lower(coalesce(v_reg.status, '')) in ('waitlist', 'waiting', 'queued') then 0
              else v_companion_count
            end,
            alias = nullif(trim(p_alias), ''),
            note = nullif(trim(p_note), ''),
            last_updated_at = now()
          where id = v_reg.id;
          v_new_status := case
            when v_is_event_creator then 'going'
            else lower(v_reg.status)
          end;
        else
          update public.event_registrations
          set
            companion_count = v_companion_count,
            alias = nullif(trim(p_alias), ''),
            note = nullif(trim(p_note), ''),
            last_updated_at = now()
          where id = v_reg.id;
          v_new_status := lower(v_reg.status);
        end if;
    end;
  end if;

  if not v_is_event_creator and v_is_new_or_rejoin then
    if lower(v_new_status) in ('waitlist', 'waiting', 'queued') then
      perform public.notify_event_waitlist_signup(p_event_id, v_user);
    elsif lower(v_new_status) in ('going', 'confirmed', 'accepted', 'pending', 'reviewing')
      and not (
        v_reg is not null
        and lower(coalesce(v_reg.status, '')) in ('waitlist', 'waiting', 'queued')
      ) then
      perform public.notify_event_registration(p_event_id, v_user);
    end if;
  end if;

  return jsonb_build_object(
    'success', true,
    'message', case
      when v_is_event_creator then '報名成功'
      when coalesce(v_event.accepting_guests, true) = false and v_is_new_or_rejoin then
        case
          when v_new_status = 'pending' then '主辦已暫停接受報名，申請已列入審核名單'
          else '主辦已暫停接受報名，已排入候補名單'
        end
      when v_new_status = 'pending' then '申請已送出，等候主辦審核'
      when v_new_status = 'waitlist' then '已排入候補名單'
      else '報名成功'
    end,
    'status', v_new_status
  );
end;
$func$;

grant execute on function public.upsert_individual_rsvp(uuid, integer, text, text, text, boolean) to authenticated;
