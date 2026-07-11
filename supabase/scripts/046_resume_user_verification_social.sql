-- Safe to re-run if 046 partially applied (policies already existed).
-- Run in Supabase SQL Editor when migration 046 failed mid-way.

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
