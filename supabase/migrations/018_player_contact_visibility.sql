-- Player contact channels + per-field visibility scope
alter table public.profiles
  add column if not exists player_whatsapp text,
  add column if not exists player_phone_friends_only boolean not null default false,
  add column if not exists player_whatsapp_friends_only boolean not null default false;

comment on column public.profiles.player_whatsapp is 'Player WhatsApp contact';
comment on column public.profiles.player_phone_friends_only is 'If true, player phone is visible to friends only';
comment on column public.profiles.player_whatsapp_friends_only is 'If true, player WhatsApp is visible to friends only';
