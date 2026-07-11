-- Site admin: permanently delete a user account (auth + cascaded profile data)

create or replace function public.admin_delete_user(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_email text;
  v_deleted int;
begin
  if not public.is_site_admin() then
    raise exception 'not authorized';
  end if;

  if p_user_id is null then
    return jsonb_build_object('success', false, 'message', '缺少用戶 ID');
  end if;

  if p_user_id = auth.uid() then
    return jsonb_build_object('success', false, 'message', '無法刪除自己的帳號，請使用帳戶設定');
  end if;

  select u.email::text into v_email
  from auth.users u
  where u.id = p_user_id;

  if v_email is null then
    delete from public.profiles where id = p_user_id;
    get diagnostics v_deleted = row_count;
    if v_deleted > 0 then
      return jsonb_build_object('success', true, 'message', '已刪除孤立檔案');
    end if;
    return jsonb_build_object('success', false, 'message', '找不到此用戶');
  end if;

  delete from auth.users where id = p_user_id;

  return jsonb_build_object('success', true, 'message', '已永久刪除用戶');
exception
  when others then
    return jsonb_build_object('success', false, 'message', SQLERRM);
end;
$$;

grant execute on function public.admin_delete_user(uuid) to authenticated;
