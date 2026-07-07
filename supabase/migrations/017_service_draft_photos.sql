-- Draft photos for coach/physio service galleries (published stay in photos[])
alter table public.coach_services
  add column if not exists draft_photos text[] not null default '{}';

alter table public.physio_services
  add column if not exists draft_photos text[] not null default '{}';

comment on column public.coach_services.draft_photos is 'Unpublished service photos; move to photos[] on publish';
comment on column public.physio_services.draft_photos is 'Unpublished service photos; move to photos[] on publish';
