-- Profile-level physio service tags (multi-select on management page)

alter table public.profiles
  add column if not exists physio_service_tags text[] not null default '{}';

-- Backfill from legacy comma-separated text field
update public.profiles
set physio_service_tags = (
  select coalesce(array_agg(trim(x)), '{}')
  from unnest(string_to_array(physio_services_offered, '、')) as x
  where trim(x) <> ''
)
where physio_services_offered is not null
  and physio_services_offered <> ''
  and (physio_service_tags is null or physio_service_tags = '{}');

create index if not exists profiles_physio_service_tags_idx
  on public.profiles using gin (physio_service_tags);
