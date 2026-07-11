-- SMS lifetime cap (3 sends/user) + admin review on 4th attempt + admin unlock

alter table public.profiles
  add column if not exists phone_sms_pending_admin_review boolean not null default false,
  add column if not exists phone_sms_review_requested_at timestamptz,
  add column if not exists phone_sms_admin_unlocked_at timestamptz;

comment on column public.profiles.phone_sms_pending_admin_review is 'User exceeded SMS OTP send limit; awaiting admin to unlock';
comment on column public.profiles.phone_sms_review_requested_at is 'When the user triggered the 4th+ SMS send attempt';
comment on column public.profiles.phone_sms_admin_unlocked_at is 'Last time an admin reset SMS verification attempts for this user';

create or replace function public.check_phone_otp_send_allowed(p_phone_e164 text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_last_send timestamptz;
  v_user_send_count int;
  v_cooldown_seconds int;
  v_pending_review boolean;
  v_max_sends constant int := 3;
begin
  if v_user_id is null then
    return jsonb_build_object('allowed', false, 'message', '請先登入');
  end if;

  if p_phone_e164 is null or length(trim(p_phone_e164)) < 8 then
    return jsonb_build_object('allowed', false, 'message', '無效的電話號碼');
  end if;

  select coalesce(p.phone_sms_pending_admin_review, false)
  into v_pending_review
  from public.profiles p
  where p.id = v_user_id;

  if v_pending_review then
    return jsonb_build_object(
      'allowed', false,
      'status', 'awaiting_admin_review',
      'message', '驗證碼請求次數過多，已暫停發送。請等候管理員審核後再試。',
      'attempts_remaining', 0
    );
  end if;

  select count(*)::int into v_user_send_count
  from public.phone_otp_send_log
  where user_id = v_user_id;

  if v_user_send_count >= v_max_sends then
    update public.profiles
    set
      phone_sms_pending_admin_review = true,
      phone_sms_review_requested_at = coalesce(phone_sms_review_requested_at, now())
    where id = v_user_id;

    return jsonb_build_object(
      'allowed', false,
      'status', 'awaiting_admin_review',
      'message', '驗證碼請求次數過多，已暫停發送。請等候管理員審核後再試。',
      'attempts_remaining', 0
    );
  end if;

  select max(created_at) into v_last_send
  from public.phone_otp_send_log
  where user_id = v_user_id;

  if v_last_send is not null and v_last_send > now() - interval '30 seconds' then
    v_cooldown_seconds := ceil(extract(epoch from (v_last_send + interval '30 seconds' - now())))::int;
    return jsonb_build_object(
      'allowed', false,
      'message', format('請等待 %s 秒後再重發驗證碼', v_cooldown_seconds),
      'cooldown_seconds', v_cooldown_seconds,
      'attempts_remaining', v_max_sends - v_user_send_count
    );
  end if;

  return jsonb_build_object(
    'allowed', true,
    'attempts_remaining', v_max_sends - v_user_send_count
  );
end;
$$;

create or replace function public.admin_unlock_phone_sms(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_site_admin() then
    raise exception 'not authorized';
  end if;

  if p_user_id is null then
    return jsonb_build_object('success', false, 'message', '缺少用戶 ID');
  end if;

  if not exists (select 1 from public.profiles where id = p_user_id) then
    return jsonb_build_object('success', false, 'message', '找不到此用戶');
  end if;

  delete from public.phone_otp_send_log where user_id = p_user_id;

  update public.profiles
  set
    phone_sms_pending_admin_review = false,
    phone_sms_review_requested_at = null,
    phone_sms_admin_unlocked_at = now()
  where id = p_user_id;

  return jsonb_build_object('success', true, 'message', '已解除 SMS 驗證限制，用戶可重新發送驗證碼（最多 3 次）');
end;
$$;

grant execute on function public.admin_unlock_phone_sms(uuid) to authenticated;

-- Extend admin user list with SMS review fields
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
  suspended_reason text,
  phone_sms_pending_admin_review boolean,
  phone_sms_review_requested_at timestamptz,
  phone_verified_at timestamptz
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
    p.suspended_reason,
    coalesce(p.phone_sms_pending_admin_review, false),
    p.phone_sms_review_requested_at,
    p.phone_verified_at
  from public.profiles p
  join auth.users u on u.id = p.id
  order by
    coalesce(p.phone_sms_pending_admin_review, false) desc,
    p.phone_sms_review_requested_at desc nulls last,
    p.created_at desc;
end;
$$;

grant execute on function public.admin_list_users() to authenticated;
