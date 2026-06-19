-- 0002 — "not for me" private skip signal.
-- a dismissal is private to the user: it never affects public counts and the
-- author never sees it. mood/topic are denormalized so future feed ranking can
-- learn "show me less like this" without a join. recurrence is already prevented
-- by the `seen` table; this captures the *intent* behind a skip.

create table if not exists public.dismissals (
  user_id     uuid not null references auth.users (id) on delete cascade,
  post_id     uuid not null references public.posts (id) on delete cascade,
  mood        text,
  topic       text,
  created_at  timestamptz not null default now(),
  primary key (user_id, post_id)
);

create index if not exists dismissals_user_idx on public.dismissals (user_id);

alter table public.dismissals enable row level security;

-- own-row only: a user may record and read their own dismissals, nothing else.
drop policy if exists dismissals_insert_own on public.dismissals;
create policy dismissals_insert_own on public.dismissals
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists dismissals_select_own on public.dismissals;
create policy dismissals_select_own on public.dismissals
  for select to authenticated
  using (user_id = auth.uid());
