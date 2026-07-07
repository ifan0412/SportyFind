-- Separate rich athlete bio from plain profile bio
alter table public.profiles
  add column if not exists athlete_bio text;

comment on column public.profiles.athlete_bio is 'Rich text athlete bio shown under athlete tab';
