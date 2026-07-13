-- Coach / physio dashboard: pick up to 2 services for public listing pages.

alter table public.coach_services
  add column if not exists show_on_listing boolean not null default false;

alter table public.physio_services
  add column if not exists show_on_listing boolean not null default false;

comment on column public.coach_services.show_on_listing is
  'When true (max 2 per coach), service appears on /coaches listing alongside is_active.';
comment on column public.physio_services.show_on_listing is
  'When true (max 2 per physio), service appears on /physio listing alongside is_active.';

-- Default: first two services per owner (by sort_order) are selected for listing.
with ranked_coach as (
  select id,
    row_number() over (
      partition by coach_id
      order by sort_order asc, created_at asc, id asc
    ) as rn
  from public.coach_services
)
update public.coach_services cs
set show_on_listing = true
from ranked_coach r
where cs.id = r.id
  and r.rn <= 2;

with ranked_physio as (
  select id,
    row_number() over (
      partition by physio_id
      order by sort_order asc, created_at asc, id asc
    ) as rn
  from public.physio_services
)
update public.physio_services ps
set show_on_listing = true
from ranked_physio r
where ps.id = r.id
  and r.rn <= 2;
