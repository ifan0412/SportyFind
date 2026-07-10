-- Beta security hardening: suspension field protection, suspended write block, profile privacy RPC

-- ---------------------------------------------------------------------------
-- Prevent non-admins from modifying suspension / moderation fields
-- ---------------------------------------------------------------------------

create or replace function public.profiles_guard_sensitive_columns()
returns trigger
language plpgsql
as $$
begin
  if public.is_site_admin() then
    return NEW;
  end if;

  if TG_OP = 'UPDATE' then
    if NEW.is_suspended is distinct from OLD.is_suspended
       or NEW.suspended_at is distinct from OLD.suspended_at
       or NEW.suspended_reason is distinct from OLD.suspended_reason
       or NEW.reactivated_at is distinct from OLD.reactivated_at then
      raise exception 'not authorized to modify suspension fields';
    end if;
  end if;

  return NEW;
end;
$$;

drop trigger if exists profiles_guard_sensitive_columns on public.profiles;

create trigger profiles_guard_sensitive_columns
  before update on public.profiles
  for each row
  execute function public.profiles_guard_sensitive_columns();

-- ---------------------------------------------------------------------------
-- Block suspended users from updating their own profile
-- ---------------------------------------------------------------------------

drop policy if exists "Users can update their own profile" on public.profiles;

create policy "Users can update their own profile"
  on public.profiles
  for update
  to authenticated
  using (
    auth.uid() = id
    and not public.is_profile_suspended(auth.uid())
  )
  with check (
    auth.uid() = id
    and not public.is_profile_suspended(auth.uid())
  );

-- ---------------------------------------------------------------------------
-- Friendship helper for contact redaction
-- ---------------------------------------------------------------------------

create or replace function public.profiles_are_friends(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when a is null or b is null or a = b then false
    else exists (
      select 1
      from public.friendships f
      where f.status = 'accepted'
        and (
          (f.sender_id = a and f.receiver_id = b)
          or (f.sender_id = b and f.receiver_id = a)
        )
    )
  end;
$$;

grant execute on function public.profiles_are_friends(uuid, uuid) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Public profile fetch with server-side contact redaction
-- ---------------------------------------------------------------------------

create or replace function public.get_profile_for_viewer(p_profile_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_viewer uuid := auth.uid();
  v_profile public.profiles%rowtype;
  v_is_owner boolean;
  v_is_friend boolean;
  v_result jsonb;
begin
  select * into v_profile
  from public.profiles
  where id = p_profile_id;

  if not found then
    return null;
  end if;

  v_is_owner := v_viewer is not null and v_viewer = p_profile_id;
  v_is_friend := v_is_owner or public.profiles_are_friends(v_viewer, p_profile_id);
  v_result := to_jsonb(v_profile);

  if not v_is_owner then
    v_result := v_result
      - 'is_suspended'
      - 'suspended_at'
      - 'suspended_reason'
      - 'reactivated_at';
  end if;

  if not v_is_friend then
    if coalesce(v_profile.player_email_friends_only, false) then
      v_result := jsonb_set(v_result, '{contact_email}', 'null'::jsonb, false);
    end if;
    if coalesce(v_profile.player_phone_friends_only, false) then
      v_result := jsonb_set(v_result, '{contact_phone}', 'null'::jsonb, false);
    end if;
    if coalesce(v_profile.player_whatsapp_friends_only, false) then
      v_result := jsonb_set(v_result, '{player_whatsapp}', 'null'::jsonb, false);
    end if;
  end if;

  if not v_is_owner then
    if not coalesce(v_profile.is_address_public, true) then
      v_result := jsonb_set(v_result, '{address}', 'null'::jsonb, false);
    end if;
    if not coalesce(v_profile.physio_is_address_public, true) then
      v_result := jsonb_set(v_result, '{physio_address}', 'null'::jsonb, false);
    end if;
  end if;

  return v_result;
end;
$$;

grant execute on function public.get_profile_for_viewer(uuid) to anon, authenticated;
