-- Push dispatch via pg_net (bypasses Dashboard webhooks / supabase_functions schema).
-- After applying, configure push_dispatch_config once in SQL Editor (see bottom).

create extension if not exists pg_net with schema extensions;

create table if not exists public.push_dispatch_config (
  id boolean primary key default true check (id = true),
  dispatch_url text not null default '',
  webhook_secret text not null default '',
  updated_at timestamptz not null default now()
);

comment on table public.push_dispatch_config is
  'Push webhook target for pg_net trigger. Not exposed to clients — set via SQL Editor.';

alter table public.push_dispatch_config enable row level security;

revoke all on table public.push_dispatch_config from anon, authenticated;

insert into public.push_dispatch_config (id, dispatch_url, webhook_secret)
values (true, '', '')
on conflict (id) do nothing;

create or replace function public.dispatch_push_on_notification_insert()
returns trigger
language plpgsql
security definer
set search_path = public, net, extensions
as $func$
declare
  cfg public.push_dispatch_config%rowtype;
begin
  select * into cfg from public.push_dispatch_config where id = true;

  if cfg.dispatch_url is null or btrim(cfg.dispatch_url) = '' then
    return NEW;
  end if;

  perform net.http_post(
    url := cfg.dispatch_url,
    body := jsonb_build_object(
      'type', 'INSERT',
      'table', TG_TABLE_NAME,
      'schema', TG_TABLE_SCHEMA,
      'record', to_jsonb(NEW)
    ),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-push-webhook-secret', coalesce(cfg.webhook_secret, '')
    ),
    timeout_milliseconds := 5000
  );

  return NEW;
exception
  when others then
    raise warning 'push dispatch http_post failed: %', SQLERRM;
    return NEW;
end;
$func$;

drop trigger if exists notifications_push_dispatch on public.notifications;

create trigger notifications_push_dispatch
  after insert on public.notifications
  for each row
  execute function public.dispatch_push_on_notification_insert();

-- One-time setup (SQL Editor) after deploy — replace with your values:
--
-- update public.push_dispatch_config
-- set
--   dispatch_url = 'https://YOUR-DOMAIN.com/api/push/dispatch',
--   webhook_secret = 'YOUR_PUSH_WEBHOOK_SECRET',
--   updated_at = now()
-- where id = true;
