-- ─────────────────────────────────────────────────────────────────────────────
-- unsaid — 0001_init.sql
-- Schema, RLS, anonymity views, count helpers.
--
-- Anonymity architecture (non-negotiable):
--   * author_id is NEVER client-readable. Public reads go through the
--     feed_posts / post_comments / saved_posts views, which expose only
--     id, mode, body, mood, topic, role_title (joined), counts,
--     comments_enabled, created_at.
--   * Clients have NO direct INSERT/UPDATE on posts/comments/reactions —
--     all such writes go through edge functions (service role).
-- ─────────────────────────────────────────────────────────────────────────────

create extension if not exists pgcrypto with schema extensions;

-- pg_cron is enabled in Phase E for notify-batch. Placeholder:
-- create extension if not exists pg_cron with schema extensions;

-- ─────────────────────────────────────────────────────────────────────────────
-- Tables
-- ─────────────────────────────────────────────────────────────────────────────

create table public.profiles (
  user_id     uuid primary key references auth.users (id) on delete cascade,
  status      text not null default 'active' check (status in ('active', 'shadow', 'banned')),
  daily_nudge boolean not null default false,
  created_at  timestamptz not null default now()
);

create table public.identities (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  mode       text not null check (mode in ('personal', 'professional')),
  role_title text not null check (char_length(role_title) between 1 and 60),
  topics     text[] not null default '{}',
  created_at timestamptz not null default now(),
  unique (user_id, mode)
);

create table public.posts (
  id               uuid primary key default gen_random_uuid(),
  author_id        uuid not null references auth.users (id) on delete cascade,
  mode             text not null check (mode in ('personal', 'professional')),
  body             text not null check (char_length(body) between 1 and 500),
  mood             text check (mood in ('heavy', 'angry', 'confused', 'hopeful', 'lonely', 'relieved', 'scared', 'proud')),
  topic            text check (topic in ('work', 'family', 'love', 'money', 'self', 'lonely', 'wins', 'future')),
  comments_enabled boolean not null default true,
  status           text not null default 'live' check (status in ('live', 'hidden', 'removed')),
  is_seed          boolean not null default false,
  felt_count       integer not null default 0 check (felt_count >= 0),
  same_count       integer not null default 0 check (same_count >= 0),
  comment_count    integer not null default 0 check (comment_count >= 0),
  created_at       timestamptz not null default now()
);

create table public.reactions (
  post_id    uuid not null references public.posts (id) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,
  type       text not null check (type in ('felt', 'same')),
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table public.comments (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid not null references public.posts (id) on delete cascade,
  author_id  uuid not null references auth.users (id) on delete cascade,
  body       text not null check (char_length(body) between 1 and 280),
  status     text not null default 'live' check (status in ('live', 'hidden', 'removed')),
  parent_id  uuid references public.comments (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.seen (
  user_id    uuid not null references auth.users (id) on delete cascade,
  post_id    uuid not null references public.posts (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);

create table public.mutes (
  muter_id        uuid not null references auth.users (id) on delete cascade,
  muted_author_id uuid not null references auth.users (id) on delete cascade,
  created_at      timestamptz not null default now(),
  primary key (muter_id, muted_author_id)
);

create table public.saves (
  user_id    uuid not null references auth.users (id) on delete cascade,
  post_id    uuid not null references public.posts (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);

create table public.drafts (
  user_id    uuid not null references auth.users (id) on delete cascade,
  mode       text not null check (mode in ('personal', 'professional')),
  body       text not null check (char_length(body) <= 500),
  mood       text check (mood in ('heavy', 'angry', 'confused', 'hopeful', 'lonely', 'relieved', 'scared', 'proud')),
  updated_at timestamptz not null default now(),
  primary key (user_id, mode)
);

create table public.reports (
  id          uuid primary key default gen_random_uuid(),
  target_type text not null check (target_type in ('post', 'comment')),
  target_id   uuid not null,
  reporter_id uuid not null references auth.users (id) on delete cascade,
  reason      text not null check (reason in ('harassment', 'doxxing', 'self-harm', 'spam', 'other')),
  state       text not null default 'open' check (state in ('open', 'reviewed', 'dismissed')),
  created_at  timestamptz not null default now()
);

create table public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  mode       text not null check (mode in ('personal', 'professional')),
  type       text not null check (type in ('milestone', 'same', 'comment')),
  payload    jsonb not null default '{}'::jsonb,
  read       boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.push_tokens (
  user_id    uuid not null references auth.users (id) on delete cascade,
  expo_token text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, expo_token)
);

create table public.moderation_log (
  id          uuid primary key default gen_random_uuid(),
  target_type text not null check (target_type in ('post', 'comment', 'role_title')),
  target_id   uuid,
  verdict     text not null,
  scores      jsonb not null default '{}'::jsonb,
  rule_hits   text[] not null default '{}',
  created_at  timestamptz not null default now()
);

create table public.rate_limits (
  user_id      uuid not null references auth.users (id) on delete cascade,
  action       text not null check (action in ('post', 'comment')),
  window_start timestamptz not null,
  count        integer not null default 0,
  primary key (user_id, action, window_start)
);

create table public.admins (
  email      text primary key,
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Indexes
-- ─────────────────────────────────────────────────────────────────────────────

create index posts_mode_status_created_idx on public.posts (mode, status, created_at desc);
create index posts_mode_status_felt_idx    on public.posts (mode, status, felt_count desc);
create index comments_post_created_idx     on public.comments (post_id, created_at);
create index seen_user_post_idx            on public.seen (user_id, post_id);
create index notifications_user_mode_read_idx on public.notifications (user_id, mode, read);
create index reports_state_idx             on public.reports (state);

-- ─────────────────────────────────────────────────────────────────────────────
-- Atomic count helper (service-role only, used by publish/react)
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.bump_post_count(p_post_id uuid, p_kind text, p_delta integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  new_count integer;
begin
  if p_kind = 'felt' then
    update posts set felt_count = greatest(felt_count + p_delta, 0)
      where id = p_post_id returning felt_count into new_count;
  elsif p_kind = 'same' then
    update posts set same_count = greatest(same_count + p_delta, 0)
      where id = p_post_id returning same_count into new_count;
  elsif p_kind = 'comment' then
    update posts set comment_count = greatest(comment_count + p_delta, 0)
      where id = p_post_id returning comment_count into new_count;
  else
    raise exception 'unknown count kind: %', p_kind;
  end if;
  return new_count;
end;
$$;

revoke all on function public.bump_post_count(uuid, text, integer) from public, anon, authenticated;
grant execute on function public.bump_post_count(uuid, text, integer) to service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- Anonymity views — security_invoker = false, owned by postgres (table owner),
-- so they bypass table RLS. The views themselves are airtight: they never
-- select author_id, and they apply the caller-scoped seen/mute filters via
-- auth.uid(). When auth.uid() IS NULL (anon web readers) the NOT EXISTS
-- subqueries match nothing, so the filters are no-ops and live posts are
-- still returned.
-- ─────────────────────────────────────────────────────────────────────────────

create view public.feed_posts
  with (security_invoker = false)
as
select
  p.id,
  p.mode,
  p.body,
  p.mood,
  p.topic,
  coalesce(i.role_title, 'a stranger') as role_title,
  p.felt_count,
  p.same_count,
  p.comment_count,
  p.comments_enabled,
  p.created_at
from public.posts p
left join public.identities i
  on i.user_id = p.author_id and i.mode = p.mode
where p.status = 'live'
  and not exists (
    select 1 from public.mutes m
    where m.muter_id = auth.uid() and m.muted_author_id = p.author_id
  )
  and not exists (
    select 1 from public.seen s
    where s.user_id = auth.uid() and s.post_id = p.id
  );

create view public.post_comments
  with (security_invoker = false)
as
select
  c.id,
  c.post_id,
  c.body,
  coalesce(i.role_title, 'a stranger') as role_title,
  c.parent_id,
  c.created_at
from public.comments c
join public.posts p on p.id = c.post_id
left join public.identities i
  on i.user_id = c.author_id and i.mode = p.mode
where c.status = 'live'
  and p.status = 'live'
  and not exists (
    select 1 from public.mutes m
    where m.muter_id = auth.uid() and m.muted_author_id = c.author_id
  );

create view public.saved_posts
  with (security_invoker = false)
as
select
  p.id,
  p.mode,
  p.body,
  p.mood,
  p.topic,
  coalesce(i.role_title, 'a stranger') as role_title,
  p.felt_count,
  p.same_count,
  p.comment_count,
  p.comments_enabled,
  p.created_at
from public.saves sv
join public.posts p on p.id = sv.post_id
left join public.identities i
  on i.user_id = p.author_id and i.mode = p.mode
where sv.user_id = auth.uid()
  and p.status = 'live';

-- ─────────────────────────────────────────────────────────────────────────────
-- Row Level Security
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.profiles       enable row level security;
alter table public.identities     enable row level security;
alter table public.posts          enable row level security;
alter table public.reactions      enable row level security;
alter table public.comments       enable row level security;
alter table public.seen           enable row level security;
alter table public.mutes          enable row level security;
alter table public.saves          enable row level security;
alter table public.drafts         enable row level security;
alter table public.reports        enable row level security;
alter table public.notifications  enable row level security;
alter table public.push_tokens    enable row level security;
alter table public.moderation_log enable row level security;
alter table public.rate_limits    enable row level security;
alter table public.admins         enable row level security;

-- profiles: own row only
create policy profiles_insert_own on public.profiles
  for insert to authenticated with check (user_id = auth.uid());
create policy profiles_select_own on public.profiles
  for select to authenticated using (user_id = auth.uid());
create policy profiles_update_own on public.profiles
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- identities: own rows only
create policy identities_insert_own on public.identities
  for insert to authenticated with check (user_id = auth.uid());
create policy identities_select_own on public.identities
  for select to authenticated using (user_id = auth.uid());
create policy identities_update_own on public.identities
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- posts: SELECT own (You space) + DELETE own ("gone means gone").
-- No client INSERT/UPDATE — publishing goes through the publish function.
create policy posts_select_own on public.posts
  for select to authenticated using (author_id = auth.uid());
create policy posts_delete_own on public.posts
  for delete to authenticated using (author_id = auth.uid());

-- seen: insert/select own
create policy seen_insert_own on public.seen
  for insert to authenticated with check (user_id = auth.uid());
create policy seen_select_own on public.seen
  for select to authenticated using (user_id = auth.uid());

-- saves: insert/select/delete own
create policy saves_insert_own on public.saves
  for insert to authenticated with check (user_id = auth.uid());
create policy saves_select_own on public.saves
  for select to authenticated using (user_id = auth.uid());
create policy saves_delete_own on public.saves
  for delete to authenticated using (user_id = auth.uid());

-- drafts: full control over own rows
create policy drafts_all_own on public.drafts
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- notifications: select own; update own (column-restricted to `read` by grants below)
create policy notifications_select_own on public.notifications
  for select to authenticated using (user_id = auth.uid());
create policy notifications_update_own on public.notifications
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- push_tokens: insert/select/delete own
create policy push_tokens_insert_own on public.push_tokens
  for insert to authenticated with check (user_id = auth.uid());
create policy push_tokens_select_own on public.push_tokens
  for select to authenticated using (user_id = auth.uid());
create policy push_tokens_delete_own on public.push_tokens
  for delete to authenticated using (user_id = auth.uid());

-- comments, reactions, reports, mutes, moderation_log, rate_limits, admins:
-- RLS enabled with NO client policies — service role (edge functions) only.

-- ─────────────────────────────────────────────────────────────────────────────
-- Grants — belt and braces on top of RLS. Supabase grants broad table
-- privileges by default; tighten them so the API surface matches intent.
-- ─────────────────────────────────────────────────────────────────────────────

revoke all on public.profiles, public.identities, public.posts, public.reactions,
  public.comments, public.seen, public.mutes, public.saves, public.drafts,
  public.reports, public.notifications, public.push_tokens,
  public.moderation_log, public.rate_limits, public.admins
from anon, authenticated;

grant select, insert, update         on public.profiles      to authenticated;
grant select, insert, update         on public.identities    to authenticated;
grant select, delete                 on public.posts         to authenticated;
grant select, insert                 on public.seen          to authenticated;
grant select, insert, delete         on public.saves         to authenticated;
grant select, insert, update, delete on public.drafts        to authenticated;
grant select                         on public.notifications to authenticated;
grant update (read)                  on public.notifications to authenticated;
grant select, insert, delete         on public.push_tokens   to authenticated;

grant select on public.feed_posts    to anon, authenticated;
grant select on public.post_comments to anon, authenticated;
grant select on public.saved_posts   to anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- Phase E (deferred): pg_cron schedule for notify-batch. Enable with:
--
--   create extension if not exists pg_cron with schema extensions;
--   select cron.schedule(
--     'notify-batch-every-5min',
--     '*/5 * * * *',
--     $$ select net.http_post(
--          url := 'https://<project-ref>.supabase.co/functions/v1/notify-batch',
--          headers := jsonb_build_object(
--            'Authorization', 'Bearer ' || '<service-role-key>',
--            'Content-Type', 'application/json'),
--          body := '{}'::jsonb
--        ) $$
--   );
-- ─────────────────────────────────────────────────────────────────────────────
