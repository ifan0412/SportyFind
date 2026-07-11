-- Allow members to leave a team; notify team admin.

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
    'account_reactivated', 'admin_team_removed', 'admin_event_removed'
  ));

create or replace function public.leave_team(p_team_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_role text;
  v_admin_id uuid;
begin
  if v_user is null then
    return jsonb_build_object('success', false, 'message', '請先登入');
  end if;

  select role into v_role
  from public.team_members
  where team_id = p_team_id and user_id = v_user;

  if not found then
    return jsonb_build_object('success', false, 'message', '您不是此團隊成員');
  end if;

  if v_role = 'admin' then
    return jsonb_build_object(
      'success', false,
      'message', '管理員請至團隊管理頁面轉移職權，無法直接離開群組'
    );
  end if;

  delete from public.team_members
  where team_id = p_team_id and user_id = v_user;

  if v_role = 'pending' then
    return jsonb_build_object('success', true, 'message', '已取消加入申請');
  end if;

  select tm.user_id into v_admin_id
  from public.team_members tm
  where tm.team_id = p_team_id and tm.role = 'admin'
  limit 1;

  if v_admin_id is not null then
    insert into public.notifications (user_id, sender_id, type, is_read, team_id, push_eligible)
    values (v_admin_id, v_user, 'team_member_left', false, p_team_id, true);
  end if;

  return jsonb_build_object('success', true, 'message', '已離開群組');
end;
$$;

grant execute on function public.leave_team(uuid) to authenticated;
