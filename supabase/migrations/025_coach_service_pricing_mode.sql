-- Coach service pricing: per hour, per session, or DM for quote

alter table public.coach_services
  add column if not exists pricing_mode text
    check (pricing_mode is null or pricing_mode in ('hourly', 'session', 'dm'));

comment on column public.coach_services.pricing_mode is
  'hourly = price per hour; session = price per session; dm = message for quote';

update public.coach_services
set pricing_mode = 'hourly'
where pricing_mode is null;
