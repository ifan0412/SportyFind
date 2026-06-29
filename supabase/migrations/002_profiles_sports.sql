-- Pro Sports Network: profiles, sports master list, user_sports bridge
-- Run in Supabase SQL Editor or via Supabase CLI

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  bio text,
  location text,
  created_at timestamptz not null default now()
);

comment on table public.profiles is 'Public athlete/member profiles linked to auth users';

-- ---------------------------------------------------------------------------
-- sports (master list)
-- ---------------------------------------------------------------------------

create table public.sports (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  icon text
);

comment on table public.sports is 'Canonical list of supported sports';

-- ---------------------------------------------------------------------------
-- user_sports (bridge)
-- ---------------------------------------------------------------------------

create table public.user_sports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  sport_id uuid not null references public.sports (id) on delete cascade,
  metadata jsonb not null default '{}'::jsonb,
  unique (user_id, sport_id)
);

comment on table public.user_sports is 'Sport expertise entries with sport-specific JSON metadata';

create index user_sports_user_id_idx on public.user_sports using btree (user_id);
create index user_sports_sport_id_idx on public.user_sports using btree (sport_id);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.sports enable row level security;
alter table public.user_sports enable row level security;

-- sports: public read
create policy "Sports are publicly readable"
  on public.sports
  for select
  using (true);

-- profiles: public read; owner write
create policy "Profiles are publicly readable"
  on public.profiles
  for select
  using (true);

create policy "Users can insert their own profile"
  on public.profiles
  for insert
  to authenticated
  with check (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles
  for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- user_sports: public read; owner write/modify
create policy "User sports are publicly readable"
  on public.user_sports
  for select
  using (true);

create policy "Users can insert their own sports"
  on public.user_sports
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update their own sports"
  on public.user_sports
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own sports"
  on public.user_sports
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Secure auto-profile trigger on registration
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

grant execute on function public.handle_new_user() to supabase_auth_admin;

-- ---------------------------------------------------------------------------
-- Idempotent seed data
-- ---------------------------------------------------------------------------

insert into public.sports (name, icon)
values
  ('Volleyball', 'volleyball'),
  ('Tennis', 'tennis')
on conflict (name) do nothing;
