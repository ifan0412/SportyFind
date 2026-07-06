-- Multi-select physio service types per service item

alter table public.physio_services
  add column if not exists service_types text[] not null default '{}';

-- Backfill from legacy single service_type column
update public.physio_services
set service_types = array[service_type]
where service_type is not null
  and service_type <> ''
  and (service_types is null or service_types = '{}');

create index if not exists physio_services_service_types_idx
  on public.physio_services using gin (service_types);
