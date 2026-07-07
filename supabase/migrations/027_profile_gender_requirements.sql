-- Profile gender (private) and team/event join eligibility

alter table public.profiles
  add column if not exists gender text
    check (gender is null or gender in ('male', 'female'));

comment on column public.profiles.gender is
  'male or female; shown on cards and joiner lists for team/event hosts';

alter table public.teams
  add column if not exists gender_requirement text not null default 'both'
    check (gender_requirement in ('male', 'female', 'both'));

comment on column public.teams.gender_requirement is
  'Who may request to join: male, female, or both';

alter table public.events
  add column if not exists gender_requirement text not null default 'both'
    check (gender_requirement in ('male', 'female', 'both'));

comment on column public.events.gender_requirement is
  'Who may register: male, female, or both';

-- Sync profile fields from auth metadata on signup (incl. gender)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    first_name,
    last_name,
    full_name,
    handle,
    is_player,
    is_coach,
    is_physio,
    roles_confirmed,
    gender
  )
  values (
    new.id,
    nullif(new.raw_user_meta_data->>'first_name', ''),
    nullif(new.raw_user_meta_data->>'last_name', ''),
    nullif(new.raw_user_meta_data->>'full_name', ''),
    nullif(new.raw_user_meta_data->>'handle', ''),
    coalesce((new.raw_user_meta_data->>'is_player')::boolean, true),
    coalesce((new.raw_user_meta_data->>'is_coach')::boolean, false),
    coalesce((new.raw_user_meta_data->>'is_physio')::boolean, false),
    coalesce((new.raw_user_meta_data->>'roles_confirmed')::boolean, false),
    case
      when new.raw_user_meta_data->>'gender' in ('male', 'female')
      then new.raw_user_meta_data->>'gender'
      else null
    end
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

-- Enforce gender on team join requests
create or replace function public.enforce_team_member_gender()
returns trigger
language plpgsql
as $$
declare
  v_req text;
  v_gender text;
begin
  select coalesce(gender_requirement, 'both') into v_req
  from public.teams where id = new.team_id;

  if v_req = 'both' then
    return new;
  end if;

  select gender into v_gender from public.profiles where id = new.user_id;

  if v_gender is null then
    raise exception '請先於個人檔案設定性別';
  end if;

  if v_gender is distinct from v_req then
    raise exception '不符合此隊伍的性別報名要求';
  end if;

  return new;
end;
$$;

drop trigger if exists team_members_gender_check on public.team_members;
create trigger team_members_gender_check
  before insert on public.team_members
  for each row
  execute function public.enforce_team_member_gender();

-- Individual event RSVP: respect gender_requirement
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
