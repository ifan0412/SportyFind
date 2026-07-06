-- Physio services stack (mirrors coach_services) + HK district columns
-- Safe to re-run: uses IF NOT EXISTS / IF NOT EXISTS guards

-- ---------------------------------------------------------------------------
-- physio_services
-- ---------------------------------------------------------------------------

create table if not exists public.physio_services (
  id uuid primary key default gen_random_uuid(),
  physio_id uuid not null references public.profiles (id) on delete cascade,
  title text not null default '',
  service_type text not null default '運動復健',
  sport_category text,
  session_rate numeric(10, 2) not null default 0
    check (session_rate >= 0),
  location text,
  districts text[] not null default '{}',
  subdistricts text[] not null default '{}',
  description text default '',
  photos text[] not null default '{}',
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Backfill columns if table existed from an older manual schema
alter table public.physio_services
  add column if not exists location text,
  add column if not exists sport_category text,
  add column if not exists districts text[] not null default '{}',
  add column if not exists subdistricts text[] not null default '{}',
  add column if not exists photos text[] not null default '{}',
  add column if not exists is_active boolean not null default false,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create index if not exists physio_services_physio_id_idx
  on public.physio_services using btree (physio_id);

create index if not exists physio_services_districts_idx
  on public.physio_services using gin (districts);

comment on table public.physio_services is 'Per-physio treatment/service offerings';
comment on column public.physio_services.districts is 'HK district ids — shown on listing cards';
comment on column public.physio_services.subdistricts is 'HK sub-district ids — shown on service detail page';

-- Legacy 5-region location → district ids
update public.physio_services
set districts = array['yau-tsim-mong']
where (districts = '{}' or districts is null)
  and location = '九龍區 (Kowloon)';

update public.physio_services
set districts = array['central-western','wan-chai','eastern','southern']
where (districts = '{}' or districts is null)
  and location = '港島區 (Hong Kong Island)';

update public.physio_services
set districts = array['sha-tin','tuen-mun','yuen-long','north','tai-po','sai-kung','kwai-tsing','tsuen-wan']
where (districts = '{}' or districts is null)
  and location = '新界區 (New Territories)';

update public.physio_services
set districts = array['islands']
where (districts = '{}' or districts is null)
  and location = '離島區 (Outlying Islands)';

update public.physio_services
set districts = array[
  'central-western','wan-chai','eastern','southern',
  'yau-tsim-mong','sham-shui-po','kowloon-city','wong-tai-sin','kwun-tong',
  'tsuen-wan','tuen-mun','yuen-long','north','tai-po','sha-tin','sai-kung','kwai-tsing','islands'
]
where (districts = '{}' or districts is null)
  and location = '全港 / 現場可議';

-- ---------------------------------------------------------------------------
-- physio_enquiries
-- ---------------------------------------------------------------------------

create table if not exists public.physio_enquiries (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.physio_services (id) on delete cascade,
  physio_id uuid not null references public.profiles (id) on delete cascade,
  patient_id uuid not null references public.profiles (id) on delete cascade,
  message text not null,
  status text not null default 'pending'
    check (status in ('pending', 'seen', 'contacted')),
  created_at timestamptz not null default now()
);

create index if not exists physio_enquiries_physio_id_idx
  on public.physio_enquiries using btree (physio_id);

create index if not exists physio_enquiries_service_id_idx
  on public.physio_enquiries using btree (service_id);

-- ---------------------------------------------------------------------------
-- physio_reviews
-- ---------------------------------------------------------------------------

create table if not exists public.physio_reviews (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.physio_services (id) on delete cascade,
  physio_id uuid not null references public.profiles (id) on delete cascade,
  patient_id uuid not null references public.profiles (id) on delete cascade,
  rating integer not null check (rating >= 1 and rating <= 5),
  comment text,
  created_at timestamptz not null default now()
);

create index if not exists physio_reviews_service_id_idx
  on public.physio_reviews using btree (service_id);

-- ---------------------------------------------------------------------------
-- updated_at trigger
-- ---------------------------------------------------------------------------

drop trigger if exists physio_services_set_updated_at on public.physio_services;

create trigger physio_services_set_updated_at
before update on public.physio_services
for each row
execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.physio_services enable row level security;
alter table public.physio_enquiries enable row level security;
alter table public.physio_reviews enable row level security;

-- physio_services
drop policy if exists "Active physio services are publicly readable" on public.physio_services;
create policy "Active physio services are publicly readable"
  on public.physio_services for select
  using (is_active = true);

drop policy if exists "Physios can read their own services" on public.physio_services;
create policy "Physios can read their own services"
  on public.physio_services for select
  to authenticated
  using (auth.uid() = physio_id);

drop policy if exists "Physios can insert their own services" on public.physio_services;
create policy "Physios can insert their own services"
  on public.physio_services for insert
  to authenticated
  with check (auth.uid() = physio_id);

drop policy if exists "Physios can update their own services" on public.physio_services;
create policy "Physios can update their own services"
  on public.physio_services for update
  to authenticated
  using (auth.uid() = physio_id)
  with check (auth.uid() = physio_id);

drop policy if exists "Physios can delete their own services" on public.physio_services;
create policy "Physios can delete their own services"
  on public.physio_services for delete
  to authenticated
  using (auth.uid() = physio_id);

-- physio_enquiries
drop policy if exists "Patients can create physio enquiries" on public.physio_enquiries;
create policy "Patients can create physio enquiries"
  on public.physio_enquiries for insert
  to authenticated
  with check (auth.uid() = patient_id);

drop policy if exists "Physios can read their enquiries" on public.physio_enquiries;
create policy "Physios can read their enquiries"
  on public.physio_enquiries for select
  to authenticated
  using (auth.uid() = physio_id or auth.uid() = patient_id);

drop policy if exists "Physios can update their enquiries" on public.physio_enquiries;
create policy "Physios can update their enquiries"
  on public.physio_enquiries for update
  to authenticated
  using (auth.uid() = physio_id)
  with check (auth.uid() = physio_id);

drop policy if exists "Physios can delete their enquiries" on public.physio_enquiries;
create policy "Physios can delete their enquiries"
  on public.physio_enquiries for delete
  to authenticated
  using (auth.uid() = physio_id);

-- physio_reviews
drop policy if exists "Physio reviews are publicly readable" on public.physio_reviews;
create policy "Physio reviews are publicly readable"
  on public.physio_reviews for select
  using (true);

drop policy if exists "Patients can create physio reviews" on public.physio_reviews;
create policy "Patients can create physio reviews"
  on public.physio_reviews for insert
  to authenticated
  with check (auth.uid() = patient_id);

drop policy if exists "Physios can delete reviews on their services" on public.physio_reviews;
create policy "Physios can delete reviews on their services"
  on public.physio_reviews for delete
  to authenticated
  using (auth.uid() = physio_id);
