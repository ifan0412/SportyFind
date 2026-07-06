-- Allow authenticated users to permanently delete their own account
create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = public
as $func$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  delete from auth.users where id = v_uid;
end;
$func$;

grant execute on function public.delete_own_account() to authenticated;
