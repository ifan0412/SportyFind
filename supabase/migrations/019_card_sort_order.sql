-- Manual display order for athlete cards and service cards
alter table public.user_sports
  add column if not exists sort_order integer not null default 0;

alter table public.coach_services
  add column if not exists sort_order integer not null default 0;

alter table public.physio_services
  add column if not exists sort_order integer not null default 0;

with ranked as (
  select id, row_number() over (partition by user_id order by created_at asc, id asc) as rn
  from public.user_sports
)
update public.user_sports us
set sort_order = ranked.rn
from ranked
where us.id = ranked.id;

with ranked as (
  select id, row_number() over (partition by coach_id order by created_at asc, id asc) as rn
  from public.coach_services
)
update public.coach_services cs
set sort_order = ranked.rn
from ranked
where cs.id = ranked.id;

with ranked as (
  select id, row_number() over (partition by physio_id order by created_at asc, id asc) as rn
  from public.physio_services
)
update public.physio_services ps
set sort_order = ranked.rn
from ranked
where ps.id = ranked.id;
