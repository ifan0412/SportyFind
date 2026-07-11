-- User verification (phone) + OAuth social connections (Instagram / Facebook / Threads)

alter table public.profiles
  add column if not exists phone_e164 text,
  add column if not exists phone_verified_at timestamptz;

comment on column public.profiles.phone_e164 is 'E.164 phone number after OTP verification';
comment on column public.profiles.phone_verified_at is 'When the user completed phone OTP verification';

create table if not exists public.profile_social_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  platform text not null check (platform in ('instagram', 'facebook', 'threads')),
  context text not null default 'profile' check (context in ('profile', 'physio')),
  external_id text not null,
  username text,
  profile_url text not null,
  display_name text,
  connected_at timestamptz not null default now(),
  unique (user_id, platform, context)
);

create index if not exists profile_social_connections_user_idx
  on public.profile_social_connections (user_id);

alter table public.profile_social_connections enable row level security;

drop policy if exists "Social connections are publicly readable" on public.profile_social_connections;
create policy "Social connections are publicly readable"
  on public.profile_social_connections
  for select
  using (true);

drop policy if exists "Users manage own social connections" on public.profile_social_connections;
create policy "Users manage own social connections"
  on public.profile_social_connections
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Sync legacy profile URL columns from connection rows (keeps public profile pages working)
create or replace function public.sync_social_connection_urls(
  p_user_id uuid,
  p_platform text,
  p_context text,
  p_profile_url text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_context = 'physio' then
    if p_platform = 'instagram' then
      update public.profiles set physio_instagram_url = p_profile_url where id = p_user_id;
    elsif p_platform = 'facebook' then
      update public.profiles set physio_facebook_url = p_profile_url where id = p_user_id;
    elsif p_platform = 'threads' then
      update public.profiles set physio_threads_url = p_profile_url where id = p_user_id;
    end if;
  else
    if p_platform = 'instagram' then
      update public.profiles set instagram_url = p_profile_url where id = p_user_id;
    elsif p_platform = 'facebook' then
      update public.profiles set facebook_url = p_profile_url where id = p_user_id;
    elsif p_platform = 'threads' then
      update public.profiles set threads_url = p_profile_url where id = p_user_id;
    end if;
  end if;
end;
$$;

create or replace function public.clear_social_connection_url(
  p_user_id uuid,
  p_platform text,
  p_context text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_context = 'physio' then
    if p_platform = 'instagram' then
      update public.profiles set physio_instagram_url = null where id = p_user_id;
    elsif p_platform = 'facebook' then
      update public.profiles set physio_facebook_url = null where id = p_user_id;
    elsif p_platform = 'threads' then
      update public.profiles set physio_threads_url = null where id = p_user_id;
    end if;
  else
    if p_platform = 'instagram' then
      update public.profiles set instagram_url = null where id = p_user_id;
    elsif p_platform = 'facebook' then
      update public.profiles set facebook_url = null where id = p_user_id;
    elsif p_platform = 'threads' then
      update public.profiles set threads_url = null where id = p_user_id;
    end if;
  end if;
end;
$$;

grant execute on function public.sync_social_connection_urls(uuid, text, text, text) to authenticated;
grant execute on function public.clear_social_connection_url(uuid, text, text) to authenticated;

create or replace function public.mark_phone_verified(p_phone_e164 text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  if p_phone_e164 is null or length(trim(p_phone_e164)) < 8 then
    return jsonb_build_object('success', false, 'message', '無效的電話號碼');
  end if;

  update public.profiles
  set
    phone_e164 = trim(p_phone_e164),
    phone_verified_at = now()
  where id = auth.uid();

  return jsonb_build_object('success', true);
end;
$$;

grant execute on function public.mark_phone_verified(text) to authenticated;
