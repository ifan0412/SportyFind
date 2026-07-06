-- Multi-select categories & sports for content_posts

alter table public.content_posts
  add column if not exists categories text[] not null default '{}',
  add column if not exists sports text[] not null default '{}';

-- Migrate legacy single-value columns
update public.content_posts
set
  categories = case
    when categories = '{}' and category is not null then array[category]
    else categories
  end,
  sports = case
    when sports = '{}' and sport is not null and sport <> '' then array[sport]
    else sports
  end
where category is not null or sport is not null;

update public.content_posts
set categories = array['general']
where categories = '{}' or categories is null;

alter table public.content_posts drop column if exists category;
alter table public.content_posts drop column if exists sport;

create index if not exists content_posts_categories_idx on public.content_posts using gin (categories);
create index if not exists content_posts_sports_idx on public.content_posts using gin (sports);

drop index if exists content_posts_category_idx;
drop index if exists content_posts_sport_idx;

comment on column public.content_posts.categories is 'Platform areas: players, coaches, teams, events, physio, general (multi-select)';
comment on column public.content_posts.sports is 'Sport tags (multi-select, optional)';

-- Refresh seed article with multiple tags
update public.content_posts
set
  categories = array['players', 'coaches', 'general'],
  sports = array['Gym / Fitness', 'Running / Marathon'],
  updated_at = now()
where slug = 'how-to-lose-belly-fat-safely';
