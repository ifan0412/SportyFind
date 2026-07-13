-- Multi-select skill levels per coach service (beginner / intermediate / advanced)

alter table public.coach_services
  add column if not exists skill_levels text[] not null default '{}';

comment on column public.coach_services.skill_levels is
  'Target learner levels: beginner, intermediate, advanced';

create index if not exists coach_services_skill_levels_idx
  on public.coach_services using gin (skill_levels);
