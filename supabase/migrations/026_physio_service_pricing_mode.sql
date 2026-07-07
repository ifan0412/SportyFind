-- Physio service pricing: per hour, per session, or DM for quote

alter table public.physio_services
  add column if not exists pricing_mode text
    check (pricing_mode is null or pricing_mode in ('hourly', 'session', 'dm'));

comment on column public.physio_services.pricing_mode is
  'hourly = price per hour; session = price per session; dm = message for quote';

update public.physio_services
set pricing_mode = 'session'
where pricing_mode is null;
