-- Remove seeded dummy network profiles (Unsplash stock avatars + mock UUIDs).
-- Safe to run multiple times.

create or replace function public.admin_cleanup_seed_profiles()
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_ids uuid[] := array[
    '6acfc050-e424-4eda-8684-871241a9a8b1'::uuid,
    'eded7050-ecae-4f6c-9764-57baa0568c0e'::uuid,
    '08a1fd9f-612a-4aaf-9756-773f9fa8ef7c'::uuid,
    '5d739c8d-80d4-4c63-ba4c-c40d7fe6fc40'::uuid,
    '610c7727-614e-41f4-ada0-1a874b561607'::uuid,
    '22222222-2222-4222-a222-222222222222'::uuid,
    '33333333-3333-4333-a333-333333333333'::uuid,
    '44444444-4444-4444-a444-444444444444'::uuid,
    '55555555-5555-4555-a555-555555555555'::uuid,
    '11111111-1111-4111-a111-111111111111'::uuid
  ];
  v_id uuid;
  v_profiles int := 0;
  v_auth int := 0;
  v_cnt int;
begin
  if auth.uid() is not null and not public.is_site_admin() then
    raise exception 'not authorized';
  end if;

  foreach v_id in array v_ids loop
    delete from auth.users where id = v_id;
    get diagnostics v_cnt = row_count;
    if v_cnt > 0 then
      v_auth := v_auth + 1;
    else
      delete from public.profiles where id = v_id;
      get diagnostics v_cnt = row_count;
      if v_cnt > 0 then
        v_profiles := v_profiles + 1;
      end if;
    end if;
  end loop;

  return jsonb_build_object(
    'success', true,
    'deleted_auth_users', v_auth,
    'deleted_orphan_profiles', v_profiles
  );
end;
$$;

grant execute on function public.admin_cleanup_seed_profiles() to authenticated;

-- Run cleanup immediately when this migration is applied
select public.admin_cleanup_seed_profiles();
