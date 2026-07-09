-- Unified discussion board: posts, flat comments, likes (events + teams).

create table if not exists public.discussion_posts (
  id uuid primary key default gen_random_uuid(),
  context_type text not null check (context_type in ('event', 'team')),
  context_id uuid not null,
  user_id uuid not null references public.profiles (id) on delete cascade,
  tag text not null default 'general',
  content text not null check (char_length(content) between 1 and 500),
  created_at timestamptz not null default now()
);

create index if not exists discussion_posts_context_idx
  on public.discussion_posts (context_type, context_id, created_at desc);

create table if not exists public.discussion_post_likes (
  post_id uuid not null references public.discussion_posts (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table if not exists public.discussion_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.discussion_posts (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  content text not null check (char_length(content) between 1 and 300),
  created_at timestamptz not null default now()
);

create index if not exists discussion_comments_post_idx
  on public.discussion_comments (post_id, created_at asc);

create table if not exists public.discussion_comment_likes (
  comment_id uuid not null references public.discussion_comments (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (comment_id, user_id)
);

-- Migrate legacy event_comments when present.
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'event_comments'
  ) then
    insert into public.discussion_posts (context_type, context_id, user_id, tag, content, created_at)
    select
      'event',
      event_id,
      user_id,
      coalesce(nullif(tag, ''), 'general'),
      content,
      created_at
    from public.event_comments ec
    where not exists (
      select 1 from public.discussion_posts dp
      where dp.context_type = 'event'
        and dp.context_id = ec.event_id
        and dp.user_id = ec.user_id
        and dp.content = ec.content
        and dp.created_at = ec.created_at
    );
  end if;
end $$;

alter table public.discussion_posts enable row level security;
alter table public.discussion_post_likes enable row level security;
alter table public.discussion_comments enable row level security;
alter table public.discussion_comment_likes enable row level security;

drop policy if exists discussion_posts_select on public.discussion_posts;
drop policy if exists discussion_posts_insert on public.discussion_posts;
drop policy if exists discussion_posts_delete on public.discussion_posts;
drop policy if exists discussion_post_likes_select on public.discussion_post_likes;
drop policy if exists discussion_post_likes_insert on public.discussion_post_likes;
drop policy if exists discussion_post_likes_delete on public.discussion_post_likes;
drop policy if exists discussion_comments_select on public.discussion_comments;
drop policy if exists discussion_comments_insert on public.discussion_comments;
drop policy if exists discussion_comments_delete on public.discussion_comments;
drop policy if exists discussion_comment_likes_select on public.discussion_comment_likes;
drop policy if exists discussion_comment_likes_insert on public.discussion_comment_likes;
drop policy if exists discussion_comment_likes_delete on public.discussion_comment_likes;

-- Posts
create policy discussion_posts_select on public.discussion_posts
  for select using (auth.role() = 'authenticated');

create policy discussion_posts_insert on public.discussion_posts
  for insert with check (auth.uid() = user_id);

create policy discussion_posts_delete on public.discussion_posts
  for delete using (
    auth.uid() = user_id
    or (
      context_type = 'event'
      and exists (
        select 1 from public.events e
        where e.id = context_id
          and (
            e.creator_id = auth.uid()
            or exists (
              select 1 from public.team_members tm
              where tm.team_id = e.organizer_team_id
                and tm.user_id = auth.uid()
                and tm.role in ('admin', 'coach')
            )
          )
      )
    )
    or (
      context_type = 'team'
      and exists (
        select 1 from public.team_members tm
        where tm.team_id = context_id
          and tm.user_id = auth.uid()
          and tm.role = 'admin'
      )
    )
  );

-- Post likes
create policy discussion_post_likes_select on public.discussion_post_likes
  for select using (auth.role() = 'authenticated');

create policy discussion_post_likes_insert on public.discussion_post_likes
  for insert with check (auth.uid() = user_id);

create policy discussion_post_likes_delete on public.discussion_post_likes
  for delete using (auth.uid() = user_id);

-- Comments (flat only — no parent_comment_id)
create policy discussion_comments_select on public.discussion_comments
  for select using (auth.role() = 'authenticated');

create policy discussion_comments_insert on public.discussion_comments
  for insert with check (auth.uid() = user_id);

create policy discussion_comments_delete on public.discussion_comments
  for delete using (
    auth.uid() = user_id
    or exists (
      select 1
      from public.discussion_posts p
      where p.id = post_id
        and (
          (
            p.context_type = 'event'
            and exists (
              select 1 from public.events e
              where e.id = p.context_id
                and (
                  e.creator_id = auth.uid()
                  or exists (
                    select 1 from public.team_members tm
                    where tm.team_id = e.organizer_team_id
                      and tm.user_id = auth.uid()
                      and tm.role in ('admin', 'coach')
                  )
                )
            )
          )
          or (
            p.context_type = 'team'
            and exists (
              select 1 from public.team_members tm
              where tm.team_id = p.context_id
                and tm.user_id = auth.uid()
                and tm.role = 'admin'
            )
          )
        )
    )
  );

-- Comment likes
create policy discussion_comment_likes_select on public.discussion_comment_likes
  for select using (auth.role() = 'authenticated');

create policy discussion_comment_likes_insert on public.discussion_comment_likes
  for insert with check (auth.uid() = user_id);

create policy discussion_comment_likes_delete on public.discussion_comment_likes
  for delete using (auth.uid() = user_id);
