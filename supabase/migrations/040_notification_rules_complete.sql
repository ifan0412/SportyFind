-- Complete notification rules: event leave/kick, enquiry withdraw, reviews,
-- discussion social notifications, and push_eligible flag for future push.

alter table public.notifications
  add column if not exists push_eligible boolean not null default true;

alter table public.notifications
  drop constraint if exists notifications_type_check;

alter table public.notifications
  add constraint notifications_type_check
  check (type in (
    'friend_request', 'friend_accepted',
    'team_join_request', 'team_request_accepted', 'team_request_rejected',
    'event_registration', 'event_waitlist_signup', 'event_waitlist_promoted',
    'event_kicked', 'event_leave', 'event_cancelled', 'event_accepted', 'event_joined',
    'coach_enquiry', 'coach_enquiry_withdrawn', 'coach_review',
    'physio_enquiry', 'physio_enquiry_withdrawn', 'physio_review',
    'discussion_new_post', 'discussion_post_like', 'discussion_post_comment', 'discussion_comment_like'
  ));

-- Host: participant left the event.
create or replace function public.notify_event_leave(p_event_id uuid, p_leaver_id uuid default null)
returns void
language plpgsql
security definer
set search_path = public
as $func$
declare
  v_leaver uuid := coalesce(p_leaver_id, auth.uid());
  v_host uuid;
begin
  if v_leaver is null then
    return;
  end if;

  v_host := public.resolve_event_host_id(p_event_id);
  if v_host is null or v_host = v_leaver then
    return;
  end if;

  insert into public.notifications (user_id, sender_id, type, is_read, event_id, push_eligible)
  values (v_host, v_leaver, 'event_leave', false, p_event_id, true);
end;
$func$;

grant execute on function public.notify_event_leave(uuid, uuid) to authenticated;

-- Participant: removed by host.
create or replace function public.notify_event_kick(p_event_id uuid, p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $func$
declare
  v_host uuid := auth.uid();
begin
  if p_user_id is null then
    return;
  end if;

  insert into public.notifications (user_id, sender_id, type, is_read, event_id, push_eligible)
  values (p_user_id, v_host, 'event_kicked', false, p_event_id, true);
end;
$func$;

grant execute on function public.notify_event_kick(uuid, uuid) to authenticated;

-- Team join decision.
create or replace function public.notify_team_decision(
  p_team_id uuid,
  p_user_id uuid,
  p_approved boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $func$
begin
  if p_user_id is null then
    return;
  end if;

  insert into public.notifications (user_id, sender_id, type, is_read, team_id, push_eligible)
  values (
    p_user_id,
    auth.uid(),
    case when p_approved then 'team_request_accepted' else 'team_request_rejected' end,
    false,
    p_team_id,
    true
  );
end;
$func$;

grant execute on function public.notify_team_decision(uuid, uuid, boolean) to authenticated;

-- Notify host when a participant cancels via upsert_individual_rsvp.
create or replace function public.upsert_individual_rsvp(
  p_event_id uuid,
  p_companion_count integer default 0,
  p_alias text default null,
  p_note text default null,
  p_reason text default null,
  p_cancel boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $func$
declare
  v_user uuid := auth.uid();
  v_event record;
  v_reg record;
  v_filled integer;
  v_slots_needed integer;
  v_new_status text;
  v_approval_mode text;
  v_is_late boolean;
  v_hours_to_start numeric;
  v_user_gender text;
  v_req text;
  v_is_new_or_rejoin boolean;
  v_companion_count integer;
  v_is_event_creator boolean;
begin
  if v_user is null then
    return jsonb_build_object('success', false, 'message', '請先登入');
  end if;

  select * into v_event from public.events where id = p_event_id;
  if not found then
    return jsonb_build_object('success', false, 'message', '找不到活動');
  end if;

  if v_event.registration_type is distinct from 'individual' then
    return jsonb_build_object('success', false, 'message', '此活動不開放個人報名');
  end if;

  v_approval_mode := coalesce(v_event.approval_mode, 'fcfs');
  v_req := coalesce(v_event.gender_requirement, 'both');
  v_companion_count := greatest(coalesce(p_companion_count, 0), 0);
  v_is_event_creator := v_user = v_event.creator_id;

  select * into v_reg
  from public.event_registrations
  where event_id = p_event_id
    and user_id = v_user
  order by
    case
      when lower(coalesce(status, '')) not in ('cancelled', 'kicked', 'rejected') then 0
      else 1
    end,
    registered_at desc nulls last,
    id desc
  limit 1;

  if p_cancel then
    if v_reg is null or lower(coalesce(v_reg.status, '')) = 'cancelled' then
      return jsonb_build_object('success', false, 'message', '您尚未報名此活動');
    end if;

    v_hours_to_start := extract(epoch from (v_event.start_time - now())) / 3600.0;
    v_is_late := v_hours_to_start < coalesce(v_event.late_cancellation_hours, 24);

    update public.event_registrations
    set
      status = 'cancelled',
      companion_count = 0,
      last_updated_at = now(),
      has_late_infraction = case when v_is_late then true else coalesce(has_late_infraction, false) end
    where id = v_reg.id;

    perform public.notify_event_leave(p_event_id, v_user);

    return jsonb_build_object(
      'success', true,
      'message', case when v_is_late then '已退出活動（已標記臨場違規）' else '已退出活動' end
    );
  end if;

  if v_req <> 'both' then
    select gender into v_user_gender from public.profiles where id = v_user;
    if v_user_gender is null then
      return jsonb_build_object('success', false, 'message', '請先於個人檔案設定性別');
    end if;
    if v_user_gender is distinct from v_req then
      return jsonb_build_object(
        'success', false,
        'message', case
          when v_req = 'male' then '不符合性別要求：此活動僅限男性參加'
          when v_req = 'female' then '不符合性別要求：此活動僅限女性參加'
          else '不符合此活動的性別報名要求'
        end
      );
    end if;
  end if;

  select coalesce(sum(
    case
      when lower(er.status) in ('going', 'confirmed', 'accepted')
      then 1 + coalesce(er.companion_count, 0)
      else 0
    end
  ), 0) into v_filled
  from public.event_registrations er
  where er.event_id = p_event_id
    and lower(coalesce(er.status, '')) not in ('cancelled', 'kicked', 'rejected');

  v_slots_needed := 1 + v_companion_count;

  if v_is_event_creator then
    v_new_status := 'going';
  elsif v_approval_mode = 'approval' then
    v_new_status := 'pending';
  elsif v_reg is not null and lower(coalesce(v_reg.status, '')) in ('going', 'confirmed', 'accepted') then
    v_filled := v_filled - (1 + coalesce(v_reg.companion_count, 0));
    if v_event.max_capacity is not null and v_filled + v_slots_needed > v_event.max_capacity then
      v_new_status := 'waitlist';
    else
      v_new_status := 'going';
    end if;
  elsif v_event.max_capacity is not null and v_filled + v_slots_needed > v_event.max_capacity then
    v_new_status := 'waitlist';
  else
    v_new_status := 'going';
  end if;

  v_is_new_or_rejoin := v_reg is null
    or lower(coalesce(v_reg.status, '')) in ('kicked', 'rejected', 'cancelled');

  if not v_is_event_creator
     and coalesce(v_event.accepting_guests, true) = false
     and v_is_new_or_rejoin then
    if v_approval_mode = 'approval' then
      v_new_status := 'pending';
    else
      v_new_status := 'waitlist';
    end if;
  end if;

  if lower(v_new_status) in ('waitlist', 'waiting', 'queued') and v_companion_count > 0 then
    return jsonb_build_object(
      'success', false,
      'message', '候補名單不接受攜伴報名，請改為 0 位攜伴或等候正式名額釋出'
    );
  end if;

  if lower(v_new_status) in ('waitlist', 'waiting', 'queued') then
    v_companion_count := 0;
  end if;

  if v_reg is not null then
    if lower(coalesce(v_reg.status, '')) in ('kicked', 'rejected', 'cancelled') then
      update public.event_registrations
      set
        status = v_new_status,
        companion_count = v_companion_count,
        alias = nullif(trim(p_alias), ''),
        note = nullif(trim(p_note), ''),
        last_updated_at = now(),
        registered_at = now()
      where id = v_reg.id;
    elsif lower(coalesce(v_reg.status, '')) in ('pending', 'reviewing', 'waitlist', 'waiting', 'queued') then
      if lower(coalesce(v_reg.status, '')) in ('waitlist', 'waiting', 'queued') and v_companion_count > 0 then
        return jsonb_build_object(
          'success', false,
          'message', '候補名單不接受攜伴報名，請改為 0 位攜伴'
        );
      end if;
      update public.event_registrations
      set
        status = case when v_is_event_creator then 'going' else status end,
        companion_count = case
          when lower(coalesce(v_reg.status, '')) in ('waitlist', 'waiting', 'queued') then 0
          else v_companion_count
        end,
        alias = nullif(trim(p_alias), ''),
        note = nullif(trim(p_note), ''),
        last_updated_at = now()
      where id = v_reg.id;
      v_new_status := case
        when v_is_event_creator then 'going'
        else lower(v_reg.status)
      end;
    else
      update public.event_registrations
      set
        companion_count = v_companion_count,
        alias = nullif(trim(p_alias), ''),
        note = nullif(trim(p_note), ''),
        last_updated_at = now()
      where id = v_reg.id;
      v_new_status := lower(v_reg.status);
    end if;
  else
    begin
      insert into public.event_registrations (
        event_id, user_id, status, companion_count, alias, note, registered_at, last_updated_at
      ) values (
        p_event_id,
        v_user,
        v_new_status,
        v_companion_count,
        nullif(trim(p_alias), ''),
        nullif(trim(p_note), ''),
        now(),
        now()
      );
    exception
      when unique_violation then
        select * into v_reg
        from public.event_registrations
        where event_id = p_event_id
          and user_id = v_user
        order by registered_at desc nulls last, id desc
        limit 1;

        if v_reg is null then
          raise;
        end if;

        if lower(coalesce(v_reg.status, '')) in ('kicked', 'rejected', 'cancelled') then
          update public.event_registrations
          set
            status = v_new_status,
            companion_count = v_companion_count,
            alias = nullif(trim(p_alias), ''),
            note = nullif(trim(p_note), ''),
            last_updated_at = now(),
            registered_at = now()
          where id = v_reg.id;
        elsif lower(coalesce(v_reg.status, '')) in ('pending', 'reviewing', 'waitlist', 'waiting', 'queued') then
          update public.event_registrations
          set
            status = case when v_is_event_creator then 'going' else status end,
            companion_count = case
              when lower(coalesce(v_reg.status, '')) in ('waitlist', 'waiting', 'queued') then 0
              else v_companion_count
            end,
            alias = nullif(trim(p_alias), ''),
            note = nullif(trim(p_note), ''),
            last_updated_at = now()
          where id = v_reg.id;
          v_new_status := case
            when v_is_event_creator then 'going'
            else lower(v_reg.status)
          end;
        else
          update public.event_registrations
          set
            companion_count = v_companion_count,
            alias = nullif(trim(p_alias), ''),
            note = nullif(trim(p_note), ''),
            last_updated_at = now()
          where id = v_reg.id;
          v_new_status := lower(v_reg.status);
        end if;
    end;
  end if;

  return jsonb_build_object(
    'success', true,
    'message', case
      when v_is_event_creator then '報名成功'
      when coalesce(v_event.accepting_guests, true) = false and v_is_new_or_rejoin then
        case
          when v_new_status = 'pending' then '主辦已暫停接受報名，申請已列入審核名單'
          else '主辦已暫停接受報名，已排入候補名單'
        end
      when v_new_status = 'pending' then '申請已送出，等候主辦審核'
      when v_new_status = 'waitlist' then '已排入候補名單'
      else '報名成功'
    end,
    'status', v_new_status
  );
end;
$func$;

grant execute on function public.upsert_individual_rsvp(uuid, integer, text, text, text, boolean) to authenticated;

-- Enquiry withdraw: allow inquirers to delete their own rows.
drop policy if exists "Students can delete their enquiries" on public.coach_enquiries;
create policy "Students can delete their enquiries"
  on public.coach_enquiries
  for delete
  to authenticated
  using (auth.uid() = student_id);

drop policy if exists "Patients can delete their enquiries" on public.physio_enquiries;
create policy "Patients can delete their enquiries"
  on public.physio_enquiries
  for delete
  to authenticated
  using (auth.uid() = patient_id);

create or replace function public.trg_coach_enquiry_withdraw_notify()
returns trigger
language plpgsql
security definer
set search_path = public
as $func$
begin
  if auth.uid() = old.student_id and old.coach_id is distinct from old.student_id then
    insert into public.notifications (user_id, sender_id, type, is_read, push_eligible)
    values (old.coach_id, old.student_id, 'coach_enquiry_withdrawn', false, true);
  end if;
  return old;
end;
$func$;

drop trigger if exists trg_coach_enquiry_withdraw_notify on public.coach_enquiries;
create trigger trg_coach_enquiry_withdraw_notify
after delete on public.coach_enquiries
for each row
execute function public.trg_coach_enquiry_withdraw_notify();

create or replace function public.trg_physio_enquiry_withdraw_notify()
returns trigger
language plpgsql
security definer
set search_path = public
as $func$
begin
  if auth.uid() = old.patient_id and old.physio_id is distinct from old.patient_id then
    insert into public.notifications (user_id, sender_id, type, is_read, push_eligible)
    values (old.physio_id, old.patient_id, 'physio_enquiry_withdrawn', false, true);
  end if;
  return old;
end;
$func$;

drop trigger if exists trg_physio_enquiry_withdraw_notify on public.physio_enquiries;
create trigger trg_physio_enquiry_withdraw_notify
after delete on public.physio_enquiries
for each row
execute function public.trg_physio_enquiry_withdraw_notify();

-- Service reviews.
create or replace function public.trg_coach_review_notify()
returns trigger
language plpgsql
security definer
set search_path = public
as $func$
begin
  if new.coach_id is distinct from new.student_id then
    insert into public.notifications (user_id, sender_id, type, is_read, push_eligible)
    values (new.coach_id, new.student_id, 'coach_review', false, true);
  end if;
  return new;
end;
$func$;

drop trigger if exists trg_coach_review_notify on public.coach_reviews;
create trigger trg_coach_review_notify
after insert on public.coach_reviews
for each row
execute function public.trg_coach_review_notify();

create or replace function public.trg_physio_review_notify()
returns trigger
language plpgsql
security definer
set search_path = public
as $func$
begin
  if new.physio_id is distinct from new.patient_id then
    insert into public.notifications (user_id, sender_id, type, is_read, push_eligible)
    values (new.physio_id, new.patient_id, 'physio_review', false, true);
  end if;
  return new;
end;
$func$;

drop trigger if exists trg_physio_review_notify on public.physio_reviews;
create trigger trg_physio_review_notify
after insert on public.physio_reviews
for each row
execute function public.trg_physio_review_notify();

-- Discussion board notifications (in-app only; push_eligible = false).
create or replace function public.trg_discussion_new_post_notify()
returns trigger
language plpgsql
security definer
set search_path = public
as $func$
declare
  v_host uuid;
  v_admin record;
begin
  if new.context_type = 'event' then
    v_host := public.resolve_event_host_id(new.context_id);
    if v_host is not null and v_host is distinct from new.user_id then
      insert into public.notifications (user_id, sender_id, type, is_read, event_id, push_eligible)
      values (v_host, new.user_id, 'discussion_new_post', false, new.context_id, false);
    end if;
  elsif new.context_type = 'team' then
    for v_admin in
      select tm.user_id
      from public.team_members tm
      where tm.team_id = new.context_id
        and tm.role = 'admin'
        and tm.user_id is distinct from new.user_id
    loop
      insert into public.notifications (user_id, sender_id, type, is_read, team_id, push_eligible)
      values (v_admin.user_id, new.user_id, 'discussion_new_post', false, new.context_id, false);
    end loop;
  end if;
  return new;
end;
$func$;

drop trigger if exists trg_discussion_new_post_notify on public.discussion_posts;
create trigger trg_discussion_new_post_notify
after insert on public.discussion_posts
for each row
execute function public.trg_discussion_new_post_notify();

create or replace function public.trg_discussion_post_like_notify()
returns trigger
language plpgsql
security definer
set search_path = public
as $func$
declare
  v_post record;
begin
  select p.user_id, p.context_type, p.context_id
  into v_post
  from public.discussion_posts p
  where p.id = new.post_id;

  if not found or v_post.user_id = new.user_id then
    return new;
  end if;

  if v_post.context_type = 'event' then
    insert into public.notifications (user_id, sender_id, type, is_read, event_id, push_eligible)
    values (v_post.user_id, new.user_id, 'discussion_post_like', false, v_post.context_id, false);
  else
    insert into public.notifications (user_id, sender_id, type, is_read, team_id, push_eligible)
    values (v_post.user_id, new.user_id, 'discussion_post_like', false, v_post.context_id, false);
  end if;

  return new;
end;
$func$;

drop trigger if exists trg_discussion_post_like_notify on public.discussion_post_likes;
create trigger trg_discussion_post_like_notify
after insert on public.discussion_post_likes
for each row
execute function public.trg_discussion_post_like_notify();

create or replace function public.trg_discussion_post_comment_notify()
returns trigger
language plpgsql
security definer
set search_path = public
as $func$
declare
  v_post record;
begin
  select p.user_id, p.context_type, p.context_id
  into v_post
  from public.discussion_posts p
  where p.id = new.post_id;

  if not found or v_post.user_id = new.user_id then
    return new;
  end if;

  if v_post.context_type = 'event' then
    insert into public.notifications (user_id, sender_id, type, is_read, event_id, push_eligible)
    values (v_post.user_id, new.user_id, 'discussion_post_comment', false, v_post.context_id, false);
  else
    insert into public.notifications (user_id, sender_id, type, is_read, team_id, push_eligible)
    values (v_post.user_id, new.user_id, 'discussion_post_comment', false, v_post.context_id, false);
  end if;

  return new;
end;
$func$;

drop trigger if exists trg_discussion_post_comment_notify on public.discussion_comments;
create trigger trg_discussion_post_comment_notify
after insert on public.discussion_comments
for each row
execute function public.trg_discussion_post_comment_notify();

create or replace function public.trg_discussion_comment_like_notify()
returns trigger
language plpgsql
security definer
set search_path = public
as $func$
declare
  v_comment record;
  v_post record;
begin
  select c.user_id, c.post_id into v_comment
  from public.discussion_comments c
  where c.id = new.comment_id;

  if not found or v_comment.user_id = new.user_id then
    return new;
  end if;

  select p.context_type, p.context_id into v_post
  from public.discussion_posts p
  where p.id = v_comment.post_id;

  if not found then
    return new;
  end if;

  if v_post.context_type = 'event' then
    insert into public.notifications (user_id, sender_id, type, is_read, event_id, push_eligible)
    values (v_comment.user_id, new.user_id, 'discussion_comment_like', false, v_post.context_id, false);
  else
    insert into public.notifications (user_id, sender_id, type, is_read, team_id, push_eligible)
    values (v_comment.user_id, new.user_id, 'discussion_comment_like', false, v_post.context_id, false);
  end if;

  return new;
end;
$func$;

drop trigger if exists trg_discussion_comment_like_notify on public.discussion_comment_likes;
create trigger trg_discussion_comment_like_notify
after insert on public.discussion_comment_likes
for each row
execute function public.trg_discussion_comment_like_notify();

-- Mark existing event/social RPC notifications as push-eligible where applicable.
create or replace function public.notify_event_waitlist_signup(p_event_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $func$
declare
  v_registrant uuid := auth.uid();
  v_host uuid;
begin
  if v_registrant is null then
    raise exception 'Not authenticated';
  end if;

  v_host := public.resolve_event_host_id(p_event_id);
  if v_host is null or v_host = v_registrant then
    return;
  end if;

  insert into public.notifications (user_id, sender_id, type, is_read, event_id, push_eligible)
  values (v_host, v_registrant, 'event_waitlist_signup', false, p_event_id, true);
end;
$func$;

create or replace function public.notify_event_waitlist_promoted(p_event_id uuid, p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $func$
begin
  if p_user_id is null then
    return;
  end if;

  insert into public.notifications (user_id, sender_id, type, is_read, event_id, push_eligible)
  values (p_user_id, null, 'event_waitlist_promoted', false, p_event_id, true);
end;
$func$;

create or replace function public.notify_event_registration(p_event_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $func$
declare
  v_registrant uuid := auth.uid();
  v_host uuid;
begin
  if v_registrant is null then
    raise exception 'Not authenticated';
  end if;

  v_host := public.resolve_event_host_id(p_event_id);
  if v_host is null or v_host = v_registrant then
    return;
  end if;

  insert into public.notifications (user_id, sender_id, type, is_read, event_id, push_eligible)
  values (v_host, v_registrant, 'event_registration', false, p_event_id, true);
end;
$func$;

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

  insert into notifications (user_id, sender_id, type, is_read, push_eligible)
  values (v_coach_id, v_student, 'coach_enquiry', false, true);
end;
$func$;

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

  insert into notifications (user_id, sender_id, type, is_read, push_eligible)
  values (v_physio_id, v_patient, 'physio_enquiry', false, true);
end;
$func$;
