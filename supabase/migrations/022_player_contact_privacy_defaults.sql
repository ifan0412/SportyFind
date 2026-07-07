-- Player contact: hidden from public by default; opt-in to show publicly.
alter table public.profiles
  add column if not exists player_email_friends_only boolean not null default true;

alter table public.profiles
  alter column player_phone_friends_only set default true;

alter table public.profiles
  alter column player_whatsapp_friends_only set default true;

comment on column public.profiles.player_email_friends_only is 'If true, player email is visible to friends only (not public)';
