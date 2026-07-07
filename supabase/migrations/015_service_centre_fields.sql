-- Service centre names on profiles + per-service address for physio

alter table public.profiles
  add column if not exists coach_service_centre text;

alter table public.physio_services
  add column if not exists service_centre text,
  add column if not exists full_address text;
