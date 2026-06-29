-- Pro Sports Network: events & coaches tables
-- Run in Supabase SQL Editor or via Supabase CLI migrations

-- ---------------------------------------------------------------------------
-- Events
-- ---------------------------------------------------------------------------

create table public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  sport text,
  location text,
  event_date timestamptz,
  status text not null default 'draft'
    check (status in ('draft', 'published', 'cancelled')),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.events is 'Matches, tournaments, and other sports events';
comment on column public.events.status is 'draft = hidden; published = visible; cancelled = no longer active';

create index events_title_idx on public.events using btree (title);
create index events_sport_idx on public.events using btree (sport);
create index events_event_date_idx on public.events using btree (event_date);
create index events_status_idx on public.events using btree (status);
create index events_created_by_idx on public.events using btree (created_by);

-- ---------------------------------------------------------------------------
-- Coaches
-- ---------------------------------------------------------------------------

create table public.coaches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  full_name text not null,
  bio text,
  sport text,
  certifications text[] default '{}',
  hourly_rate numeric(10, 2)
    check (hourly_rate is null or hourly_rate >= 0),
  is_verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.coaches is 'Professional coach profiles linked to auth users';

create index coaches_sport_idx on public.coaches using btree (sport);
create index coaches_full_name_idx on public.coaches using btree (full_name);
create index coaches_is_verified_idx on public.coaches using btree (is_verified);

-- ---------------------------------------------------------------------------
-- updated_at trigger (shared)
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger events_set_updated_at
before update on public.events
for each row
execute function public.set_updated_at();

create trigger coaches_set_updated_at
before update on public.coaches
for each row
execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.events enable row level security;
alter table public.coaches enable row level security;

-- Events: anyone can read published events; owners manage their own
create policy "Published events are publicly readable"
  on public.events
  for select
  using (status = 'published');

create policy "Users can read their own events"
  on public.events
  for select
  to authenticated
  using (auth.uid() = created_by);

create policy "Authenticated users can create events"
  on public.events
  for insert
  to authenticated
  with check (auth.uid() = created_by);

create policy "Users can update their own events"
  on public.events
  for update
  to authenticated
  using (auth.uid() = created_by)
  with check (auth.uid() = created_by);

create policy "Users can delete their own events"
  on public.events
  for delete
  to authenticated
  using (auth.uid() = created_by);

-- Coaches: public discovery; each user manages their own profile
create policy "Coaches are publicly readable"
  on public.coaches
  for select
  using (true);

create policy "Users can create their own coach profile"
  on public.coaches
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update their own coach profile"
  on public.coaches
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own coach profile"
  on public.coaches
  for delete
  to authenticated
  using (auth.uid() = user_id);
