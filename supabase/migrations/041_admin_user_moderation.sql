-- Site admin: user suspension, team/event moderation

alter table public.profiles
  add column if not exists is_suspended boolean not null default false,
  add column if not exists suspended_at timestamptz,
  add column if not exists suspended_reason text,
  add column if not exists reactivated_at timestamptz;

create index if not exists profiles_is_suspended_idx
  on public.profiles (is_suspended)
  where is_suspended = true;

alter table public.notifications
  drop constraint if exists notifications_type_check;

alter table public.notifications
  add constraint notifications_type_check
  check (type in (
    'friend_request', 'friend_accepted',
    'team_join_request', 'team_request_accepted', 'team_request_rejected',
    'event_registration', 'event_waitlist_signup', 'event_waitlist_promoted',
    'event_kicked', 'event_leave', 'event_cancelled', 'event_accepted', 'event_joined',
    'coach_enquiry', 'coach_enquiry_withdrawn', 'coach_review',
    'physio_enquiry', 'physio_enquiry_withdrawn', 'physio_review',
    'discussion_new_post', 'discussion_post_like', 'discussion_post_comment', 'discussion_comment_like',
    'account_reactivated', 'admin_team_removed', 'admin_event_removed'
  ));

create or replace function public.is_profile_suspended(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select p.is_suspended from public.profiles p where p.id = p_user_id),
    false
  );
$$;

grant execute on function public.is_profile_suspended(uuid) to authenticated;

-- Extend user list for admin dashboard (return type changed — must drop first)
drop function if exists public.admin_list_users();

create or replace function public.admin_list_users()
returns table (
  id uuid,
  email text,
  full_name text,
  first_name text,
  last_name text,
  handle text,
  avatar_url text,
  created_at timestamptz,
  is_coach boolean,
  is_physio boolean,
  is_player boolean,
  is_suspended boolean,
  suspended_at timestamptz,
  suspended_reason text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_site_admin() then
    raise exception 'not authorized';
  end if;

  return query
  select
    p.id,
    u.email::text,
    p.full_name,
    p.first_name,
    p.last_name,
    p.handle,
    p.avatar_url,
    p.created_at,
    coalesce(p.is_coach, false),
    coalesce(p.is_physio, false),
    coalesce(p.is_player, true),
    coalesce(p.is_suspended, false),
    p.suspended_at,
    p.suspended_reason
  from public.profiles p
  join auth.users u on u.id = p.id
  order by p.created_at desc;
end;
$$;

grant execute on function public.admin_list_users() to authenticated;

create or replace function public.admin_suspend_user(
  p_user_id uuid,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  v_target_email text;
begin
  if not public.is_site_admin() then
    raise exception 'not authorized';
  end if;

  if p_user_id is null then
    return jsonb_build_object('success', false, 'message', '缺少用戶 ID');
  end if;

  if p_user_id = auth.uid() then
    return jsonb_build_object('success', false, 'message', '無法暫停自己的帳戶');
  end if;

  select lower(u.email::text) into v_target_email
  from auth.users u
  where u.id = p_user_id;

  if v_target_email is null then
    return jsonb_build_object('success', false, 'message', '找不到此用戶');
  end if;

  if v_target_email = lower('fkyian@gmail.com') then
    return jsonb_build_object('success', false, 'message', '無法暫停網站管理員帳戶');
  end if;

  update public.profiles
  set
    is_suspended = true,
    suspended_at = now(),
    suspended_reason = nullif(trim(p_reason), ''),
    reactivated_at = null
  where id = p_user_id;

  if not found then
    return jsonb_build_object('success', false, 'message', '找不到用戶檔案');
  end if;

  return jsonb_build_object('success', true, 'message', '已暫停用戶帳戶');
end;
$$;

create or replace function public.admin_reactivate_user(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
begin
  if not public.is_site_admin() then
    raise exception 'not authorized';
  end if;

  if p_user_id is null then
    return jsonb_build_object('success', false, 'message', '缺少用戶 ID');
  end if;

  update public.profiles
  set
    is_suspended = false,
    reactivated_at = now(),
    suspended_at = null,
    suspended_reason = null
  where id = p_user_id;

  if not found then
    return jsonb_build_object('success', false, 'message', '找不到用戶檔案');
  end if;

  select u.email::text into v_email
  from auth.users u
  where u.id = p_user_id;

  insert into public.notifications (user_id, sender_id, type, is_read, push_eligible)
  values (p_user_id, auth.uid(), 'account_reactivated', false, true);

  return jsonb_build_object(
    'success', true,
    'message', '已恢復用戶帳戶',
    'email', v_email
  );
end;
$$;

grant execute on function public.admin_suspend_user(uuid, text) to authenticated;
grant execute on function public.admin_reactivate_user(uuid) to authenticated;

-- List teams for admin moderation
create or replace function public.admin_list_teams()
returns table (
  id uuid,
  name_en text,
  name_zh text,
  sport_category text,
  created_at timestamptz,
  created_by uuid,
  member_count bigint
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_site_admin() then
    raise exception 'not authorized';
  end if;

  return query
  select
    t.id,
    t.name_en,
    t.name_zh,
    t.sport_category,
    t.created_at,
    t.created_by,
    (select count(*)::bigint from public.team_members tm where tm.team_id = t.id) as member_count
  from public.teams t
  order by t.created_at desc;
end;
$$;

-- List events for admin moderation
create or replace function public.admin_list_events()
returns table (
  id uuid,
  title text,
  start_time timestamptz,
  creator_id uuid,
  host_name text,
  registration_count bigint,
  status text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_site_admin() then
    raise exception 'not authorized';
  end if;

  return query
  select
    e.id,
    e.title,
    e.start_time,
    e.creator_id,
    coalesce(p.full_name, p.first_name || ' ' || p.last_name) as host_name,
    (
      select count(*)::bigint
      from public.event_registrations er
      where er.event_id = e.id
        and lower(coalesce(er.status, '')) not in ('cancelled', 'kicked', 'rejected')
    ) as registration_count,
    coalesce(e.status::text, 'published') as status
  from public.events e
  left join public.profiles p on p.id = e.creator_id
  order by e.start_time desc nulls last, e.created_at desc;
end;
$$;

grant execute on function public.admin_list_teams() to authenticated;
grant execute on function public.admin_list_events() to authenticated;

create or replace function public.admin_delete_team(p_team_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_team record;
  v_admin record;
begin
  if not public.is_site_admin() then
    raise exception 'not authorized';
  end if;

  select * into v_team from public.teams where id = p_team_id;
  if not found then
    return jsonb_build_object('success', false, 'message', '找不到此群組');
  end if;

  for v_admin in
    select distinct tm.user_id
    from public.team_members tm
    where tm.team_id = p_team_id
      and tm.role = 'admin'
  loop
    insert into public.notifications (user_id, sender_id, type, is_read, team_id, push_eligible)
    values (v_admin.user_id, auth.uid(), 'admin_team_removed', false, p_team_id, true);
  end loop;

  if v_team.created_by is not null
     and not exists (
       select 1 from public.team_members tm
       where tm.team_id = p_team_id and tm.user_id = v_team.created_by and tm.role = 'admin'
     ) then
    insert into public.notifications (user_id, sender_id, type, is_read, team_id, push_eligible)
    values (v_team.created_by, auth.uid(), 'admin_team_removed', false, p_team_id, true);
  end if;

  update public.notifications set team_id = null where team_id = p_team_id;

  delete from public.team_members where team_id = p_team_id;
  delete from public.teams where id = p_team_id;

  return jsonb_build_object('success', true, 'message', '已移除群組並通知管理員');
end;
$$;

create or replace function public.admin_delete_event(p_event_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event record;
  v_host uuid;
  v_reg record;
begin
  if not public.is_site_admin() then
    raise exception 'not authorized';
  end if;

  select * into v_event from public.events where id = p_event_id;
  if not found then
    return jsonb_build_object('success', false, 'message', '找不到此活動');
  end if;

  v_host := public.resolve_event_host_id(p_event_id);

  for v_reg in
    select er.user_id
    from public.event_registrations er
    where er.event_id = p_event_id
      and lower(coalesce(er.status, '')) not in ('cancelled', 'kicked', 'rejected')
  loop
    insert into public.notifications (user_id, sender_id, type, is_read, event_id, push_eligible)
    values (v_reg.user_id, auth.uid(), 'event_cancelled', false, null, true);
  end loop;

  if v_host is not null then
    insert into public.notifications (user_id, sender_id, type, is_read, event_id, push_eligible)
    values (v_host, auth.uid(), 'admin_event_removed', false, null, true);
  end if;

  update public.notifications set event_id = null where event_id = p_event_id;

  delete from public.discussion_posts
  where context_type = 'event' and context_id = p_event_id;

  delete from public.event_registrations where event_id = p_event_id;
  delete from public.events where id = p_event_id;

  return jsonb_build_object('success', true, 'message', '已移除活動並通知主辦方與參加者');
exception
  when others then
    return jsonb_build_object('success', false, 'message', SQLERRM);
end;
$$;

grant execute on function public.admin_delete_team(uuid) to authenticated;
grant execute on function public.admin_delete_event(uuid) to authenticated;
