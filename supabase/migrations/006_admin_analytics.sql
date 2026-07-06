-- Site analytics page views + admin RPCs for user list & platform stats

-- ---------------------------------------------------------------------------
-- Page view tracking (first-party; no external analytics tool required)
-- ---------------------------------------------------------------------------

create table public.site_page_views (
  id uuid primary key default gen_random_uuid(),
  path text not null,
  session_id text,
  user_id uuid references auth.users (id) on delete set null,
  referrer text,
  user_agent text,
  created_at timestamptz not null default now()
);

comment on table public.site_page_views is 'First-party page view events for admin analytics dashboard';

create index site_page_views_created_at_idx on public.site_page_views (created_at desc);
create index site_page_views_path_idx on public.site_page_views (path);
create index site_page_views_session_id_idx on public.site_page_views (session_id);

alter table public.site_page_views enable row level security;

create policy "Anyone can record a page view"
  on public.site_page_views
  for insert
  with check (true);

create policy "Site admin can read page views"
  on public.site_page_views
  for select
  to authenticated
  using (public.is_site_admin());

-- ---------------------------------------------------------------------------
-- Admin: list registered users (email from auth.users)
-- ---------------------------------------------------------------------------

create or replace function public.admin_list_users()
returns table (
  id uuid,
  email text,
  full_name text,
  first_name text,
  last_name text,
  handle text,
  avatar_url text,
  created_at timestamptz,
  is_coach boolean,
  is_physio boolean,
  is_player boolean
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_site_admin() then
    raise exception 'not authorized';
  end if;

  return query
  select
    p.id,
    u.email::text,
    p.full_name,
    p.first_name,
    p.last_name,
    p.handle,
    p.avatar_url,
    p.created_at,
    coalesce(p.is_coach, false),
    coalesce(p.is_physio, false),
    coalesce(p.is_player, true)
  from public.profiles p
  join auth.users u on u.id = p.id
  order by p.created_at desc;
end;
$$;

-- ---------------------------------------------------------------------------
-- Admin: platform stats & trends (last N days)
-- ---------------------------------------------------------------------------

create or replace function public.admin_get_platform_stats(p_days int default 30)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_since timestamptz := now() - make_interval(days => greatest(p_days, 1));
  v_result jsonb;
begin
  if not public.is_site_admin() then
    raise exception 'not authorized';
  end if;

  select jsonb_build_object(
    'totals', jsonb_build_object(
      'users', (select count(*)::int from public.profiles),
      'events', (select count(*)::int from public.events),
      'teams', (select count(*)::int from public.teams),
      'content_posts', (select count(*)::int from public.content_posts where status = 'published'),
      'page_views', (select count(*)::int from public.site_page_views),
      'coaches', (select count(*)::int from public.profiles where coalesce(is_coach, false)),
      'physios', (select count(*)::int from public.profiles where coalesce(is_physio, false))
    ),
    'registrations_by_day', coalesce((
      select jsonb_agg(jsonb_build_object('date', d, 'count', c) order by d)
      from (
        select to_char(date_trunc('day', created_at), 'YYYY-MM-DD') as d, count(*)::int as c
        from public.profiles
        where created_at >= v_since
        group by 1
      ) sub
    ), '[]'::jsonb),
    'events_by_day', coalesce((
      select jsonb_agg(jsonb_build_object('date', d, 'count', c) order by d)
      from (
        select to_char(date_trunc('day', created_at), 'YYYY-MM-DD') as d, count(*)::int as c
        from public.events
        where created_at >= v_since
        group by 1
      ) sub
    ), '[]'::jsonb),
    'page_views_by_day', coalesce((
      select jsonb_agg(jsonb_build_object('date', d, 'count', c) order by d)
      from (
        select to_char(date_trunc('day', created_at), 'YYYY-MM-DD') as d, count(*)::int as c
        from public.site_page_views
        where created_at >= v_since
        group by 1
      ) sub
    ), '[]'::jsonb),
    'top_pages', coalesce((
      select jsonb_agg(jsonb_build_object('path', path, 'count', c) order by c desc)
      from (
        select path, count(*)::int as c
        from public.site_page_views
        where created_at >= v_since
        group by path
        order by c desc
        limit 10
      ) sub
    ), '[]'::jsonb),
    'period_days', p_days
  ) into v_result;

  return v_result;
end;
$$;

grant execute on function public.admin_list_users() to authenticated;
grant execute on function public.admin_get_platform_stats(int) to authenticated;
