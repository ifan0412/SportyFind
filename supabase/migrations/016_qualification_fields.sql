-- Coach / physio qualification tags (selectable) + free-text custom qualification

alter table public.profiles
  add column if not exists coach_qualification_tags text[] not null default '{}',
  add column if not exists coach_qualification_custom text,
  add column if not exists physio_qualification_tags text[] not null default '{}',
  add column if not exists physio_qualification_custom text;

create index if not exists profiles_coach_qualification_tags_idx
  on public.profiles using gin (coach_qualification_tags);

create index if not exists profiles_physio_qualification_tags_idx
  on public.profiles using gin (physio_qualification_tags);
