-- SEO content / blog posts + single site admin (CMS)

-- ---------------------------------------------------------------------------
-- Admin helper — only fkyian@gmail.com may manage content
-- ---------------------------------------------------------------------------

create or replace function public.is_site_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    lower(auth.jwt() ->> 'email') = lower('fkyian@gmail.com'),
    false
  );
$$;

-- ---------------------------------------------------------------------------
-- content_posts
-- ---------------------------------------------------------------------------

create table public.content_posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  excerpt text,
  body text not null default '',
  cover_image_url text,
  category text not null default 'general'
    check (category in ('players', 'coaches', 'teams', 'events', 'physio', 'general')),
  sport text,
  status text not null default 'draft'
    check (status in ('draft', 'published')),
  links jsonb not null default '[]'::jsonb,
  meta_title text,
  meta_description text,
  author_id uuid references auth.users (id) on delete set null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.content_posts is 'SEO knowledge / blog articles managed via site admin CMS';
comment on column public.content_posts.category is 'Platform function area: players, coaches, teams, events, physio, general';
comment on column public.content_posts.links is 'Array of {label, url} call-to-action links';

create index content_posts_status_idx on public.content_posts (status);
create index content_posts_category_idx on public.content_posts (category);
create index content_posts_sport_idx on public.content_posts (sport);
create index content_posts_published_at_idx on public.content_posts (published_at desc nulls last);
create index content_posts_slug_idx on public.content_posts (slug);

create trigger content_posts_set_updated_at
before update on public.content_posts
for each row
execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.content_posts enable row level security;

create policy "Published content is publicly readable"
  on public.content_posts
  for select
  using (status = 'published');

create policy "Site admin can read all content"
  on public.content_posts
  for select
  to authenticated
  using (public.is_site_admin());

create policy "Site admin can insert content"
  on public.content_posts
  for insert
  to authenticated
  with check (public.is_site_admin());

create policy "Site admin can update content"
  on public.content_posts
  for update
  to authenticated
  using (public.is_site_admin())
  with check (public.is_site_admin());

create policy "Site admin can delete content"
  on public.content_posts
  for delete
  to authenticated
  using (public.is_site_admin());
