-- Web push subscriptions + profile push preferences

alter table public.profiles
  add column if not exists push_reminder_dismissed_at timestamptz,
  add column if not exists push_preferences jsonb not null default '{}'::jsonb;

comment on column public.profiles.push_reminder_dismissed_at is
  'When the user dismissed the push reminder banner (do not show again).';
comment on column public.profiles.push_preferences is
  'Push notification category toggles and master enable flag.';

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, endpoint)
);

create index if not exists push_subscriptions_user_id_idx
  on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

drop policy if exists "Users manage own push subscriptions" on public.push_subscriptions;

create policy "Users manage own push subscriptions"
  on public.push_subscriptions
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Push dispatch: run migration 057 (pg_net trigger). Dashboard webhooks optional.
-- After deploy, configure public.push_dispatch_config in SQL Editor (see 057).
