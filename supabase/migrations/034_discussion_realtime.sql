-- Enable realtime for discussion board tables.

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'discussion_posts'
  ) then
    alter publication supabase_realtime add table public.discussion_posts;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'discussion_comments'
  ) then
    alter publication supabase_realtime add table public.discussion_comments;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'discussion_post_likes'
  ) then
    alter publication supabase_realtime add table public.discussion_post_likes;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'discussion_comment_likes'
  ) then
    alter publication supabase_realtime add table public.discussion_comment_likes;
  end if;
end $$;
