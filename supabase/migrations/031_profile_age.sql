-- Profile age bracket (0 = <18, 18–99 = age) and optional public display.

alter table public.profiles
  add column if not exists age smallint,
  add column if not exists show_age boolean not null default false;

alter table public.profiles
  drop constraint if exists profiles_age_range_check;

alter table public.profiles
  add constraint profiles_age_range_check
  check (age is null or age = 0 or (age >= 18 and age <= 99));

comment on column public.profiles.age is '0 = <18; 18–99 = displayed age.';
comment on column public.profiles.show_age is 'When true, age is shown on public profile card.';
