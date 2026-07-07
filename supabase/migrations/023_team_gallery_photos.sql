-- Team public photo gallery (URLs stored after upload to team-assets bucket)
alter table public.teams
  add column if not exists gallery_photos jsonb not null default '[]'::jsonb;

comment on column public.teams.gallery_photos is 'Ordered public URLs for team media gallery';
