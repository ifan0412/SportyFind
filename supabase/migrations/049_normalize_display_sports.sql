-- Drop invalid legacy display_sports tags (e.g. SWIMMING) and normalize known slugs.
-- Safe to re-run.

create or replace function public.normalize_display_sport_slug(raw text)
returns text
language plpgsql
immutable
as $$
declare
  key text := lower(trim(raw));
begin
  if key = '' then return null; end if;
  if key in (
    'volleyball', 'basketball', 'soccer', 'tennis', 'badminton',
    'pickleball', 'gym', 'running', 'boxing', 'yoga'
  ) then return key; end if;
  if key in ('football', '足球', 'soccer / football', 'football / soccer') then return 'soccer'; end if;
  if key in ('排球') then return 'volleyball'; end if;
  if key in ('籃球') then return 'basketball'; end if;
  if key in ('網球') then return 'tennis'; end if;
  if key in ('羽毛球') then return 'badminton'; end if;
  if key in ('匹克球') then return 'pickleball'; end if;
  if key in ('fitness', '健身', 'gym / fitness') then return 'gym'; end if;
  if key in ('marathon', '路跑', 'running / marathon') then return 'running'; end if;
  if key in ('拳擊') then return 'boxing'; end if;
  if key in ('瑜伽') then return 'yoga'; end if;
  return null;
end;
$$;

update public.profiles p
set display_sports = coalesce(
  (
    select array_agg(slug order by first_idx)
    from (
      select slug, min(idx) as first_idx
      from unnest(coalesce(p.display_sports, '{}'::text[])) with ordinality as t(raw, idx)
      cross join lateral (select public.normalize_display_sport_slug(raw) as slug) n
      where slug is not null
      group by slug
      order by min(idx)
      limit 3
    ) cleaned
  ),
  '{}'::text[]
)
where display_sports is not null
  and exists (
    select 1
    from unnest(display_sports) raw
    where public.normalize_display_sport_slug(raw) is distinct from raw
       or public.normalize_display_sport_slug(raw) is null
  );

drop function if exists public.normalize_display_sport_slug(text);
