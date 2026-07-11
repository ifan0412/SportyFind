-- User feedback / inquiry / report submissions

create table if not exists public.feedback_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  category text not null check (category in ('feedback', 'inquiry', 'report')),
  message text not null check (char_length(message) between 10 and 5000),
  sender_name text,
  sender_email text,
  email_sent_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists feedback_submissions_created_at_idx
  on public.feedback_submissions (created_at desc);

create index if not exists feedback_submissions_user_id_idx
  on public.feedback_submissions (user_id);

alter table public.feedback_submissions enable row level security;

create policy "Users can insert own feedback"
  on public.feedback_submissions
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can read own feedback"
  on public.feedback_submissions
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Admins can read all feedback"
  on public.feedback_submissions
  for select
  to authenticated
  using (public.is_site_admin());
