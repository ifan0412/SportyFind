-- HK districts on events (listing filter + creation)

alter table public.events
  add column if not exists districts text[] not null default '{}',
  add column if not exists subdistricts text[] not null default '{}';

create index if not exists events_districts_idx
  on public.events using gin (districts);

comment on column public.events.districts is 'HK district ids — event venue area for filtering';
comment on column public.events.subdistricts is 'HK sub-district ids — optional detail';
