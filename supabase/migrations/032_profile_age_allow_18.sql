-- Allow age 18 in profiles.age (0 = <18, 18–99 = age).

alter table public.profiles
  drop constraint if exists profiles_age_range_check;

alter table public.profiles
  add constraint profiles_age_range_check
  check (age is null or age = 0 or (age >= 18 and age <= 99));
