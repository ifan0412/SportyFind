-- Site-wide popup announcements (admin-managed)

create table public.site_popup_announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content_type text not null default 'text'
    check (content_type in ('text', 'image')),
  text_content text,
  image_desktop_url text,
  image_mobile_url text,
  target_pages text[] not null default '{}'::text[],
  dismiss_mode text not null default 'session'
    check (dismiss_mode in ('session', 'user', 'until_end')),
  activation_mode text not null default 'manual'
    check (activation_mode in ('manual', 'scheduled')),
  status text not null default 'draft'
    check (status in ('draft', 'published', 'archived')),
  is_live boolean not null default false,
  starts_at timestamptz,
  ends_at timestamptz,
  author_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.site_popup_announcements is 'Admin-managed pop-up announcements for homepage and listing pages';
comment on column public.site_popup_announcements.title is 'Internal admin label';
comment on column public.site_popup_announcements.dismiss_mode is 'session | user | until_end (re-shows until schedule/manual off)';
comment on column public.site_popup_announcements.activation_mode is 'manual (is_live toggle) | scheduled (starts_at/ends_at)';

create index site_popup_announcements_status_idx
  on public.site_popup_announcements (status);

create index site_popup_announcements_live_idx
  on public.site_popup_announcements (is_live)
  where status = 'published';

create trigger site_popup_announcements_set_updated_at
before update on public.site_popup_announcements
for each row
execute function public.set_updated_at();

alter table public.site_popup_announcements enable row level security;

create policy "Published popups are publicly readable"
  on public.site_popup_announcements
  for select
  using (status = 'published');

create policy "Site admin can read all popups"
  on public.site_popup_announcements
  for select
  to authenticated
  using (public.is_site_admin());

create policy "Site admin can insert popups"
  on public.site_popup_announcements
  for insert
  to authenticated
  with check (public.is_site_admin());

create policy "Site admin can update popups"
  on public.site_popup_announcements
  for update
  to authenticated
  using (public.is_site_admin())
  with check (public.is_site_admin());

create policy "Site admin can delete popups"
  on public.site_popup_announcements
  for delete
  to authenticated
  using (public.is_site_admin());
