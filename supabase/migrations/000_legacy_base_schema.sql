-- Legacy tables/columns that predate the numbered migration history.
-- Runs after 001 + 002 (see scripts/combine-migrations.mjs ordering).
-- Safe to re-run on staging: IF NOT EXISTS guards throughout.

-- ---------------------------------------------------------------------------
-- profiles — columns referenced before later migrations add them
-- ---------------------------------------------------------------------------

alter table public.profiles
  add column if not exists first_name text,
  add column if not exists last_name text,
  add column if not exists handle text,
  add column if not exists headline text,
  add column if not exists avatar_url text,
  add column if not exists is_player boolean default true,
  add column if not exists is_coach boolean default false,
  add column if not exists is_physio boolean default false,
  add column if not exists roles_confirmed boolean default false,
  add column if not exists physio_services_offered text,
  add column if not exists display_sports text[] not null default '{}';

-- ---------------------------------------------------------------------------
-- events — columns used by RPCs before incremental migrations
-- ---------------------------------------------------------------------------

alter table public.events
  add column if not exists creator_id uuid references public.profiles (id) on delete set null,
  add column if not exists organizer_team_id uuid,
  add column if not exists sport_category text,
  add column if not exists event_type text,
  add column if not exists registration_type text,
  add column if not exists location_name text,
  add column if not exists location_address text,
  add column if not exists start_time timestamptz,
  add column if not exists end_time timestamptz,
  add column if not exists max_capacity integer,
  add column if not exists fee numeric(10, 2) default 0,
  add column if not exists late_cancellation_hours integer default 24,
  add column if not exists accepting_guests boolean default true;

update public.events
set creator_id = created_by
where creator_id is null and created_by is not null;

-- ---------------------------------------------------------------------------
-- user_sports — created_at used by 019_card_sort_order backfill
-- ---------------------------------------------------------------------------

alter table public.user_sports
  add column if not exists created_at timestamptz not null default now();

-- ---------------------------------------------------------------------------
-- friendships
-- ---------------------------------------------------------------------------

create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles (id) on delete cascade,
  receiver_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'rejected')),
  created_at timestamptz not null default now(),
  unique (sender_id, receiver_id)
);

create index if not exists friendships_sender_id_idx on public.friendships (sender_id);
create index if not exists friendships_receiver_id_idx on public.friendships (receiver_id);

alter table public.friendships enable row level security;

-- ---------------------------------------------------------------------------
-- messages
-- ---------------------------------------------------------------------------

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles (id) on delete cascade,
  receiver_id uuid not null references public.profiles (id) on delete cascade,
  content text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists messages_sender_receiver_idx
  on public.messages (sender_id, receiver_id, created_at desc);

alter table public.messages enable row level security;

-- ---------------------------------------------------------------------------
-- teams + members
-- ---------------------------------------------------------------------------

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  name_en text not null,
  name_zh text,
  sport_category text not null,
  recruitment_status text not null default 'open'
    check (recruitment_status in ('open', 'invite_only', 'closed')),
  created_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  est_year integer,
  location_region text,
  logo_url text,
  cover_url text,
  bio text,
  gallery_photos text[] not null default '{}',
  social_links jsonb not null default '{}'::jsonb,
  sport_metadata jsonb not null default '{}'::jsonb,
  gender_requirement text not null default 'both'
    check (gender_requirement in ('male', 'female', 'both'))
);

create index if not exists teams_created_by_idx on public.teams (created_by);
create index if not exists teams_sport_category_idx on public.teams (sport_category);

alter table public.events
  drop constraint if exists events_organizer_team_id_fkey;

alter table public.events
  add constraint events_organizer_team_id_fkey
  foreign key (organizer_team_id) references public.teams (id) on delete set null;

create table if not exists public.team_members (
  team_id uuid not null references public.teams (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null default 'player'
    check (role in ('admin', 'coach', 'captain', 'player', 'pending')),
  joined_at timestamptz not null default now(),
  primary key (team_id, user_id)
);

create index if not exists team_members_user_id_idx on public.team_members (user_id);

alter table public.teams enable row level security;
alter table public.team_members enable row level security;

-- ---------------------------------------------------------------------------
-- event_registrations
-- ---------------------------------------------------------------------------

create table if not exists public.event_registrations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending',
  companion_count integer not null default 0,
  alias text,
  note text,
  reason text,
  has_late_infraction boolean not null default false,
  registered_at timestamptz not null default now(),
  last_updated_at timestamptz not null default now()
);

create index if not exists event_registrations_event_id_idx
  on public.event_registrations (event_id);
create index if not exists event_registrations_user_id_idx
  on public.event_registrations (user_id);
create unique index if not exists event_registrations_event_user_uidx
  on public.event_registrations (event_id, user_id);

alter table public.event_registrations enable row level security;

-- ---------------------------------------------------------------------------
-- coach services stack (mirrors physio_services in 010)
-- ---------------------------------------------------------------------------

create table if not exists public.coach_services (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles (id) on delete cascade,
  title text not null default '',
  sport_category text,
  hourly_rate numeric(10, 2) not null default 0 check (hourly_rate >= 0),
  location text,
  districts text[] not null default '{}',
  subdistricts text[] not null default '{}',
  description text default '',
  photos text[] not null default '{}',
  draft_photos text[] not null default '{}',
  is_active boolean not null default false,
  sort_order integer not null default 0,
  teaching_experience_years integer
    check (teaching_experience_years is null or teaching_experience_years >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists coach_services_coach_id_idx
  on public.coach_services using btree (coach_id);

create table if not exists public.coach_enquiries (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.coach_services (id) on delete cascade,
  coach_id uuid not null references public.profiles (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  message text not null,
  status text not null default 'pending'
    check (status in ('pending', 'seen', 'contacted')),
  created_at timestamptz not null default now()
);

create index if not exists coach_enquiries_coach_id_idx on public.coach_enquiries (coach_id);
create index if not exists coach_enquiries_service_id_idx on public.coach_enquiries (service_id);

create table if not exists public.coach_reviews (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.coach_services (id) on delete cascade,
  coach_id uuid not null references public.profiles (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  rating integer not null check (rating >= 1 and rating <= 5),
  comment text,
  created_at timestamptz not null default now()
);

create index if not exists coach_reviews_service_id_idx on public.coach_reviews (service_id);

drop trigger if exists coach_services_set_updated_at on public.coach_services;
create trigger coach_services_set_updated_at
before update on public.coach_services
for each row
execute function public.set_updated_at();

alter table public.coach_services enable row level security;
alter table public.coach_enquiries enable row level security;
alter table public.coach_reviews enable row level security;

drop policy if exists "Active coach services are publicly readable" on public.coach_services;
create policy "Active coach services are publicly readable"
  on public.coach_services for select
  using (is_active = true);

drop policy if exists "Coaches can read their own services" on public.coach_services;
create policy "Coaches can read their own services"
  on public.coach_services for select
  to authenticated
  using (auth.uid() = coach_id);

drop policy if exists "Coaches can insert their own services" on public.coach_services;
create policy "Coaches can insert their own services"
  on public.coach_services for insert
  to authenticated
  with check (auth.uid() = coach_id);

drop policy if exists "Coaches can update their own services" on public.coach_services;
create policy "Coaches can update their own services"
  on public.coach_services for update
  to authenticated
  using (auth.uid() = coach_id)
  with check (auth.uid() = coach_id);

drop policy if exists "Coaches can delete their own services" on public.coach_services;
create policy "Coaches can delete their own services"
  on public.coach_services for delete
  to authenticated
  using (auth.uid() = coach_id);

drop policy if exists "Students can create coach enquiries" on public.coach_enquiries;
create policy "Students can create coach enquiries"
  on public.coach_enquiries for insert
  to authenticated
  with check (auth.uid() = student_id);

drop policy if exists "Coaches can read their enquiries" on public.coach_enquiries;
create policy "Coaches can read their enquiries"
  on public.coach_enquiries for select
  to authenticated
  using (auth.uid() = coach_id or auth.uid() = student_id);

drop policy if exists "Coach reviews are publicly readable" on public.coach_reviews;
create policy "Coach reviews are publicly readable"
  on public.coach_reviews for select
  using (true);

drop policy if exists "Students can create coach reviews" on public.coach_reviews;
create policy "Students can create coach reviews"
  on public.coach_reviews for insert
  to authenticated
  with check (auth.uid() = student_id);

-- ---------------------------------------------------------------------------
-- notifications
-- ---------------------------------------------------------------------------

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  sender_id uuid references public.profiles (id) on delete set null,
  type text not null,
  is_read boolean not null default false,
  friendship_id uuid references public.friendships (id) on delete cascade,
  team_id uuid references public.teams (id) on delete cascade,
  event_id uuid references public.events (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint notifications_type_check check (type in (
    'friend_request', 'friend_accepted',
    'team_join_request', 'team_request_accepted', 'team_request_rejected',
    'event_registration', 'event_kicked', 'event_cancelled'
  ))
);

create index if not exists notifications_user_id_idx on public.notifications (user_id, created_at desc);
create index if not exists notifications_is_read_idx on public.notifications (user_id, is_read);

alter table public.notifications enable row level security;

drop policy if exists "Users can read their notifications" on public.notifications;
create policy "Users can read their notifications"
  on public.notifications for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can update their notifications" on public.notifications;
create policy "Users can update their notifications"
  on public.notifications for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their notifications" on public.notifications;
create policy "Users can delete their notifications"
  on public.notifications for delete
  to authenticated
  using (auth.uid() = user_id);
