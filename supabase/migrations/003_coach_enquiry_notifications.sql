-- Coach enquiry bell notifications + realtime for review deletions
-- Run in Supabase SQL Editor or via Supabase CLI migrations

-- Step 1: widen notifications.type check to include coach_enquiry
alter table public.notifications
  drop constraint if exists notifications_type_check;

-- Step 2: re-add constraint with coach_enquiry (and event_cancelled)
alter table public.notifications
  add constraint notifications_type_check
  check (type in (
    'friend_request', 'friend_accepted',
    'team_join_request', 'team_request_accepted', 'team_request_rejected',
    'event_registration', 'event_kicked', 'event_cancelled',
    'coach_enquiry'
  ));

-- Step 3: RPC to notify coach when a student sends an enquiry
create or replace function public.notify_coach_enquiry(p_service_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $func$
declare
  v_student uuid := auth.uid();
  v_coach_id uuid;
begin
  if v_student is null then
    raise exception 'Not authenticated';
  end if;

  select coach_id into v_coach_id from coach_services where id = p_service_id;
  if not found then
    raise exception 'Service not found';
  end if;

  if v_coach_id = v_student then
    return;
  end if;

  if not exists (
    select 1 from coach_enquiries
    where service_id = p_service_id and student_id = v_student
  ) then
    raise exception 'No enquiry found for this service';
  end if;

  insert into notifications (user_id, sender_id, type, is_read)
  values (v_coach_id, v_student, 'coach_enquiry', false);
end;
$func$;

grant execute on function public.notify_coach_enquiry(uuid) to authenticated;

-- Enable realtime DELETE/INSERT events on coach_reviews (for public service page sync)
alter publication supabase_realtime add table public.coach_reviews;

-- Allow coaches to delete enquiries sent to them
drop policy if exists "Coaches can delete their enquiries" on public.coach_enquiries;
create policy "Coaches can delete their enquiries"
  on public.coach_enquiries
  for delete
  to authenticated
  using (auth.uid() = coach_id);
