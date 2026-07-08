-- Physio enquiry bell notifications (mirrors coach_enquiry flow)

alter table public.notifications
  drop constraint if exists notifications_type_check;

alter table public.notifications
  add constraint notifications_type_check
  check (type in (
    'friend_request', 'friend_accepted',
    'team_join_request', 'team_request_accepted', 'team_request_rejected',
    'event_registration', 'event_kicked', 'event_cancelled', 'event_accepted', 'event_joined',
    'coach_enquiry', 'coach_review',
    'physio_enquiry',
    'physio_review'
  ));

create or replace function public.notify_physio_enquiry(p_service_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $func$
declare
  v_patient uuid := auth.uid();
  v_physio_id uuid;
begin
  if v_patient is null then
    raise exception 'Not authenticated';
  end if;

  select physio_id into v_physio_id from physio_services where id = p_service_id;
  if not found then
    raise exception 'Service not found';
  end if;

  if v_physio_id = v_patient then
    return;
  end if;

  if not exists (
    select 1 from physio_enquiries
    where service_id = p_service_id and patient_id = v_patient
  ) then
    raise exception 'No enquiry found for this service';
  end if;

  insert into notifications (user_id, sender_id, type, is_read)
  values (v_physio_id, v_patient, 'physio_enquiry', false);
end;
$func$;

grant execute on function public.notify_physio_enquiry(uuid) to authenticated;

-- Enforce inquiry message length at DB level
alter table public.coach_enquiries
  drop constraint if exists coach_enquiries_message_length_check;
alter table public.coach_enquiries
  add constraint coach_enquiries_message_length_check
  check (char_length(message) <= 100);

alter table public.physio_enquiries
  drop constraint if exists physio_enquiries_message_length_check;
alter table public.physio_enquiries
  add constraint physio_enquiries_message_length_check
  check (char_length(message) <= 100);
