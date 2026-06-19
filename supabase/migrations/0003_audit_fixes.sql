-- 0003 — audit fix pass.
--   #5 report takedown abuse: one reporter can no longer hide content
--   #6 reaction read-back: returning users see their real felt state
--   #9 server-side role-title guard: contact info can't be smuggled into the
--      one identity surface, regardless of client

-- ── #5 reports: one report per (target, reporter) ─────────────────────────────
-- dedup any pre-existing duplicates first, then enforce. ctid (not created_at)
-- is the tiebreaker so identical-timestamp duplicates are still collapsed and
-- the unique index below can never fail to build.
delete from public.reports r
using public.reports keep
where r.target_type = keep.target_type
  and r.target_id   = keep.target_id
  and r.reporter_id = keep.reporter_id
  and r.ctid        > keep.ctid;

create unique index if not exists reports_unique_reporter
  on public.reports (target_type, target_id, reporter_id);

-- ── #6 reactions: let a user read their own reactions (for feed read-back) ─────
grant select on public.reactions to authenticated;

drop policy if exists reactions_select_own on public.reactions;
create policy reactions_select_own on public.reactions
  for select to authenticated
  using (user_id = auth.uid());

-- ── #9 role-title guard (server-enforced) ─────────────────────────────────────
-- Block only the high-confidence, zero-false-positive identifiers in a role
-- title: an "@" (covers emails + @handles) or a run of 7+ digits (phone-like).
-- The softer company/city nudge stays advisory in the UI (role-check function).
create or replace function public.guard_role_title()
returns trigger
language plpgsql
as $$
begin
  if new.role_title ~ '@' or new.role_title ~ '\d{7,}' then
    raise exception 'role title looks like contact info — keep it a feeling, not an identifier'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists identities_guard_role_title on public.identities;
create trigger identities_guard_role_title
  before insert or update on public.identities
  for each row execute function public.guard_role_title();
