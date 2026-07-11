-- Rate-limit phone OTP SMS sends (anti-spam / cost protection)

create table if not exists public.phone_otp_send_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  phone_e164 text not null,
  created_at timestamptz not null default now()
);

create index if not exists phone_otp_send_log_user_created_idx
  on public.phone_otp_send_log (user_id, created_at desc);

create index if not exists phone_otp_send_log_phone_created_idx
  on public.phone_otp_send_log (phone_e164, created_at desc);

alter table public.phone_otp_send_log enable row level security;

-- No direct client access; only security definer RPCs touch this table.

create or replace function public.check_phone_otp_send_allowed(p_phone_e164 text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_last_send timestamptz;
  v_user_today_count int;
  v_phone_today_count int;
  v_cooldown_seconds int;
  v_hk_today date := (now() at time zone 'Asia/Hong_Kong')::date;
begin
  if v_user_id is null then
    return jsonb_build_object('allowed', false, 'message', '請先登入');
  end if;

  if p_phone_e164 is null or length(trim(p_phone_e164)) < 8 then
    return jsonb_build_object('allowed', false, 'message', '無效的電話號碼');
  end if;

  select max(created_at) into v_last_send
  from public.phone_otp_send_log
  where user_id = v_user_id;

  if v_last_send is not null and v_last_send > now() - interval '30 seconds' then
    v_cooldown_seconds := ceil(extract(epoch from (v_last_send + interval '30 seconds' - now())))::int;
    return jsonb_build_object(
      'allowed', false,
      'message', format('請等待 %s 秒後再重發驗證碼', v_cooldown_seconds),
      'cooldown_seconds', v_cooldown_seconds
    );
  end if;

  select count(*)::int into v_user_today_count
  from public.phone_otp_send_log
  where user_id = v_user_id
    and (created_at at time zone 'Asia/Hong_Kong')::date = v_hk_today;

  if v_user_today_count >= 3 then
    return jsonb_build_object(
      'allowed', false,
      'message', '您今日發送驗證碼次數已達上限（3 次），請明天再試',
      'attempts_remaining', 0
    );
  end if;

  select count(*)::int into v_phone_today_count
  from public.phone_otp_send_log
  where phone_e164 = trim(p_phone_e164)
    and (created_at at time zone 'Asia/Hong_Kong')::date = v_hk_today;

  if v_phone_today_count >= 3 then
    return jsonb_build_object(
      'allowed', false,
      'message', '此手機號碼今日發送次數已達上限，請明天再試',
      'attempts_remaining', 0
    );
  end if;

  return jsonb_build_object(
    'allowed', true,
    'attempts_remaining', 3 - v_user_today_count
  );
end;
$$;

create or replace function public.record_phone_otp_send(p_phone_e164 text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  insert into public.phone_otp_send_log (user_id, phone_e164)
  values (auth.uid(), trim(p_phone_e164));
end;
$$;

grant execute on function public.check_phone_otp_send_allowed(text) to authenticated;
grant execute on function public.record_phone_otp_send(text) to authenticated;
