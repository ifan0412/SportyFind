-- Keep profile full_name in sync with first_name + last_name after profile edits.

alter table public.profiles
  add column if not exists first_name text,
  add column if not exists last_name text;

create or replace function public.profiles_sync_full_name()
returns trigger
language plpgsql
as $$
declare
  v_composed text := nullif(
    trim(both from concat_ws(' ', NEW.first_name, NEW.last_name)),
    ''
  );
begin
  if v_composed is not null then
    NEW.full_name := v_composed;
  end if;
  return NEW;
end;
$$;

drop trigger if exists profiles_sync_full_name on public.profiles;

create trigger profiles_sync_full_name
  before insert or update of first_name, last_name, full_name
  on public.profiles
  for each row
  execute function public.profiles_sync_full_name();

-- Backfill rows where first/last were updated but full_name stayed at signup value.
update public.profiles p
set full_name = nullif(trim(both from concat_ws(' ', p.first_name, p.last_name)), '')
where nullif(trim(both from concat_ws(' ', p.first_name, p.last_name)), '') is not null
  and (
    p.full_name is null
    or p.full_name is distinct from nullif(trim(both from concat_ws(' ', p.first_name, p.last_name)), '')
  );

-- Admin user list: prefer live first + last over stale full_name.
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
    coalesce(
      nullif(trim(both from concat_ws(' ', p.first_name, p.last_name)), ''),
      nullif(trim(p.full_name), '')
    ) as full_name,
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
