-- Align sport categories + physio_services.sport_category
-- Safe to re-run

-- Legacy DBs may have sports without icon column
alter table public.sports add column if not exists icon text;

insert into public.sports (name)
values
  ('volleyball'),
  ('basketball'),
  ('soccer'),
  ('tennis'),
  ('badminton'),
  ('pickleball'),
  ('gym'),
  ('running'),
  ('boxing'),
  ('yoga')
on conflict (name) do nothing;

update public.sports
set icon = name
where name in (
  'volleyball', 'basketball', 'soccer', 'tennis', 'badminton',
  'pickleball', 'gym', 'running', 'boxing', 'yoga'
)
and (icon is null or icon = '');

alter table public.physio_services
  add column if not exists sport_category text;

-- Normalize legacy coach_services sport_category strings → slugs
update public.coach_services set sport_category = 'volleyball'
  where lower(trim(sport_category)) in ('volleyball', '排球');

update public.coach_services set sport_category = 'basketball'
  where lower(trim(sport_category)) in ('basketball', '籃球');

update public.coach_services set sport_category = 'soccer'
  where lower(trim(sport_category)) in ('soccer', 'football', '足球')
     or sport_category ilike '%soccer%'
     or sport_category ilike '%football%';

update public.coach_services set sport_category = 'tennis'
  where lower(trim(sport_category)) in ('tennis', '網球');

update public.coach_services set sport_category = 'badminton'
  where lower(trim(sport_category)) in ('badminton', '羽毛球');

update public.coach_services set sport_category = 'pickleball'
  where lower(trim(sport_category)) in ('pickleball', '匹克球');

update public.coach_services set sport_category = 'gym'
  where lower(trim(sport_category)) in ('gym', 'fitness', '健身')
     or sport_category ilike '%gym%'
     or sport_category ilike '%fitness%';

update public.coach_services set sport_category = 'running'
  where lower(trim(sport_category)) in ('running', 'marathon', '路跑')
     or sport_category ilike '%running%'
     or sport_category ilike '%marathon%';

update public.coach_services set sport_category = 'boxing'
  where lower(trim(sport_category)) in ('boxing', '拳擊');

update public.coach_services set sport_category = 'yoga'
  where lower(trim(sport_category)) in ('yoga', '瑜伽');

create index if not exists coach_services_sport_category_idx
  on public.coach_services using btree (sport_category);

create index if not exists physio_services_sport_category_idx
  on public.physio_services using btree (sport_category);
