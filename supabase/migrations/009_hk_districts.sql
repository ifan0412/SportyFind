-- HK 18 districts + sub-districts for coaches, services, and profiles

-- profiles: coach service areas + teaching experience
alter table public.profiles
  add column if not exists coach_districts text[] not null default '{}',
  add column if not exists coach_subdistricts text[] not null default '{}',
  add column if not exists coach_teaching_experience_years integer
    check (coach_teaching_experience_years is null or coach_teaching_experience_years >= 0);

-- profiles: general HK location (athletes / shared)
alter table public.profiles
  add column if not exists districts text[] not null default '{}',
  add column if not exists subdistricts text[] not null default '{}';

-- physio parallel fields
alter table public.profiles
  add column if not exists physio_districts text[] not null default '{}',
  add column if not exists physio_subdistricts text[] not null default '{}';

-- coach_services: per-course service areas + optional per-course experience
alter table public.coach_services
  add column if not exists districts text[] not null default '{}',
  add column if not exists subdistricts text[] not null default '{}',
  add column if not exists teaching_experience_years integer
    check (teaching_experience_years is null or teaching_experience_years >= 0);

-- migrate legacy single location on coach_services
update public.coach_services
set districts = array['yau-tsim-mong']
where (districts = '{}' or districts is null)
  and location = '九龍區 (Kowloon)';

update public.coach_services
set districts = array['central-western','wan-chai','eastern','southern']
where (districts = '{}' or districts is null)
  and location = '港島區 (Hong Kong Island)';

update public.coach_services
set districts = array['sha-tin','tuen-mun','yuen-long','north','tai-po','sai-kung','kwai-tsing','tsuen-wan']
where (districts = '{}' or districts is null)
  and location = '新界區 (New Territories)';

update public.coach_services
set districts = array['islands']
where (districts = '{}' or districts is null)
  and location = '離島區 (Outlying Islands)';

update public.coach_services
set districts = array[
  'central-western','wan-chai','eastern','southern',
  'yau-tsim-mong','sham-shui-po','kowloon-city','wong-tai-sin','kwun-tong',
  'tsuen-wan','tuen-mun','yuen-long','north','tai-po','sha-tin','sai-kung','kwai-tsing','islands'
]
where (districts = '{}' or districts is null)
  and location = '全港 / 現場可議';

create index if not exists coach_services_districts_idx on public.coach_services using gin (districts);
create index if not exists profiles_coach_districts_idx on public.profiles using gin (coach_districts);

comment on column public.profiles.coach_districts is 'HK district ids — coach名片 service areas';
comment on column public.profiles.coach_subdistricts is 'HK sub-district ids — coach名片';
comment on column public.coach_services.districts is 'HK district ids — shown on listing cards';
comment on column public.coach_services.subdistricts is 'HK sub-district ids — shown on service detail page';
