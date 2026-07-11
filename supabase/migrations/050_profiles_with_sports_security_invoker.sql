-- Fix Supabase linter 0010: Security Definer View on public.profiles_with_sports
-- Run with security_invoker so RLS on underlying tables applies to API callers.
-- Safe to re-run.

do $$
begin
  if exists (
    select 1
    from pg_views
    where schemaname = 'public'
      and viewname = 'profiles_with_sports'
  ) then
    execute 'alter view public.profiles_with_sports set (security_invoker = true)';
  end if;
end;
$$;
