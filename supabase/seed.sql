-- ─────────────────────────────────────────────────────────────────────────────
-- unsaid — seed.sql (local dev / first deploy)
--
-- Seeds:
--   * 22 seed accounts (one per distinct prototype role title — role_title is
--     JOINED from identities, so every distinct card voice needs its own
--     (user, mode) identity; this is why there are more than the plan's
--     "3–4 accounts").
--   * All 14 FEED confessions + all 10 INCOMING confessions from the design
--     prototype, is_seed = true, with their prototype counts and staggered
--     created_at, plus the prototype FEED comments.
--   * One email+password demo account for App Review:
--       demo-review@unsaid.app / UnsaidReview2026!
--
-- Inserting directly into auth.users with fixed UUIDs is the standard
-- supabase local-dev seed pattern (no admin API in plain SQL).
-- ─────────────────────────────────────────────────────────────────────────────

create extension if not exists pgcrypto with schema extensions;

-- ── auth users ───────────────────────────────────────────────────────────────

insert into auth.users
  (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
   raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
   confirmation_token, recovery_token, email_change, email_change_token_new)
select
  '00000000-0000-0000-0000-000000000000'::uuid,
  v.id::uuid,
  'authenticated',
  'authenticated',
  v.email,
  '',
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{}'::jsonb,
  now() - interval '30 days',
  now(),
  '', '', '', ''
from (values
  ('00000000-0000-4000-8000-000000000001', 'seed01@seed.unsaid.local'),
  ('00000000-0000-4000-8000-000000000002', 'seed02@seed.unsaid.local'),
  ('00000000-0000-4000-8000-000000000003', 'seed03@seed.unsaid.local'),
  ('00000000-0000-4000-8000-000000000004', 'seed04@seed.unsaid.local'),
  ('00000000-0000-4000-8000-000000000005', 'seed05@seed.unsaid.local'),
  ('00000000-0000-4000-8000-000000000006', 'seed06@seed.unsaid.local'),
  ('00000000-0000-4000-8000-000000000007', 'seed07@seed.unsaid.local'),
  ('00000000-0000-4000-8000-000000000008', 'seed08@seed.unsaid.local'),
  ('00000000-0000-4000-8000-000000000009', 'seed09@seed.unsaid.local'),
  ('00000000-0000-4000-8000-000000000010', 'seed10@seed.unsaid.local'),
  ('00000000-0000-4000-8000-000000000011', 'seed11@seed.unsaid.local'),
  ('00000000-0000-4000-8000-000000000012', 'seed12@seed.unsaid.local'),
  ('00000000-0000-4000-8000-000000000013', 'seed13@seed.unsaid.local'),
  ('00000000-0000-4000-8000-000000000014', 'seed14@seed.unsaid.local'),
  ('00000000-0000-4000-8000-000000000015', 'seed15@seed.unsaid.local'),
  ('00000000-0000-4000-8000-000000000016', 'seed16@seed.unsaid.local'),
  ('00000000-0000-4000-8000-000000000017', 'seed17@seed.unsaid.local'),
  ('00000000-0000-4000-8000-000000000018', 'seed18@seed.unsaid.local'),
  ('00000000-0000-4000-8000-000000000019', 'seed19@seed.unsaid.local'),
  ('00000000-0000-4000-8000-000000000020', 'seed20@seed.unsaid.local'),
  ('00000000-0000-4000-8000-000000000021', 'seed21@seed.unsaid.local'),
  ('00000000-0000-4000-8000-000000000022', 'seed22@seed.unsaid.local')
) as v(id, email);

-- demo review account (email+password; magic-link-only auth would block App Review)
insert into auth.users
  (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
   raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
   confirmation_token, recovery_token, email_change, email_change_token_new)
values (
  '00000000-0000-0000-0000-000000000000'::uuid,
  '00000000-0000-4000-8000-000000000099'::uuid,
  'authenticated',
  'authenticated',
  'demo-review@unsaid.app',
  extensions.crypt('UnsaidReview2026!', extensions.gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{}'::jsonb,
  now() - interval '30 days',
  now(),
  '', '', '', ''
);

insert into auth.identities
  (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
values (
  gen_random_uuid(),
  '00000000-0000-4000-8000-000000000099',
  jsonb_build_object(
    'sub', '00000000-0000-4000-8000-000000000099',
    'email', 'demo-review@unsaid.app',
    'email_verified', true
  ),
  'email',
  '00000000-0000-4000-8000-000000000099',
  now(),
  now() - interval '30 days',
  now()
);

-- ── profiles ────────────────────────────────────────────────────────────────

insert into public.profiles (user_id, status, daily_nudge, created_at)
select u.id, 'active', false, now() - interval '30 days'
from auth.users u
where u.email like '%@seed.unsaid.local' or u.email = 'demo-review@unsaid.app';

-- ── identities (role titles from the prototype cards) ──────────────────────

insert into public.identities (user_id, mode, role_title, topics) values
  ('00000000-0000-4000-8000-000000000001', 'personal',     'eldest daughter, 24',        '{family,self}'),
  ('00000000-0000-4000-8000-000000000001', 'professional', 'startup designer, 2 yrs in', '{work,wins}'),
  ('00000000-0000-4000-8000-000000000002', 'personal',     'overthinker, 23',            '{lonely,self,love}'),
  ('00000000-0000-4000-8000-000000000002', 'professional', 'intern at a big4',           '{work,future}'),
  ('00000000-0000-4000-8000-000000000003', 'personal',     'middle child',               '{family,self}'),
  ('00000000-0000-4000-8000-000000000003', 'professional', 'team lead, fintech',         '{work}'),
  ('00000000-0000-4000-8000-000000000004', 'personal',     'newly sober, 30',            '{wins,self}'),
  ('00000000-0000-4000-8000-000000000004', 'professional', 'HR exec',                    '{work,lonely}'),
  ('00000000-0000-4000-8000-000000000005', 'personal',     'the quiet one, 19',          '{future,self}'),
  ('00000000-0000-4000-8000-000000000005', 'professional', 'engineer, 5 yrs',            '{work,wins}'),
  ('00000000-0000-4000-8000-000000000006', 'personal',     'tired daughter, 26',         '{family}'),
  ('00000000-0000-4000-8000-000000000006', 'professional', 'first job, marketing',       '{work,lonely}'),
  ('00000000-0000-4000-8000-000000000007', 'personal',     'homesick, 22',               '{self,lonely}'),
  ('00000000-0000-4000-8000-000000000007', 'professional', 'founder',                    '{work,money}'),
  ('00000000-0000-4000-8000-000000000008', 'personal',     'up at 3am',                  '{lonely,love}'),
  ('00000000-0000-4000-8000-000000000008', 'professional', 'new manager',                '{work}'),
  ('00000000-0000-4000-8000-000000000009', 'personal',     'trying, 27',                 '{wins,self}'),
  ('00000000-0000-4000-8000-000000000009', 'professional', 'remote, 3 yrs',              '{work,lonely}'),
  ('00000000-0000-4000-8000-000000000010', 'personal',     'quiet lately',               '{lonely}'),
  ('00000000-0000-4000-8000-000000000010', 'professional', 'burnt out, 29',              '{work}'),
  ('00000000-0000-4000-8000-000000000011', 'personal',     'softening, 25',              '{love,wins}'),
  ('00000000-0000-4000-8000-000000000011', 'professional', 'first ship',                 '{work,wins}'),
  ('00000000-0000-4000-8000-000000000012', 'personal',     'almost there',               '{future}'),
  ('00000000-0000-4000-8000-000000000012', 'professional', 'between jobs',               '{work,future}'),
  ('00000000-0000-4000-8000-000000000013', 'personal',     'eldest son, 28',             '{family}'),
  ('00000000-0000-4000-8000-000000000013', 'professional', 'been there, senior eng',     '{work}'),
  ('00000000-0000-4000-8000-000000000014', 'personal',     'a stranger, 25',             '{self}'),
  ('00000000-0000-4000-8000-000000000014', 'professional', 'also designer, 4 yrs',       '{work}'),
  ('00000000-0000-4000-8000-000000000015', 'personal',     'recovering people-pleaser',  '{self}'),
  ('00000000-0000-4000-8000-000000000015', 'professional', '15 yrs in, still here',      '{work}'),
  ('00000000-0000-4000-8000-000000000016', 'personal',     'night owl, 26',              '{lonely}'),
  ('00000000-0000-4000-8000-000000000016', 'professional', 'manager, 8 yrs',             '{work}'),
  ('00000000-0000-4000-8000-000000000017', 'personal',     'same boat, 22',              '{lonely}'),
  ('00000000-0000-4000-8000-000000000017', 'professional', 'another safe person',        '{work}'),
  ('00000000-0000-4000-8000-000000000018', 'personal',     'flew the nest, 27',          '{family}'),
  ('00000000-0000-4000-8000-000000000018', 'professional', 'learning to say no',         '{work}'),
  ('00000000-0000-4000-8000-000000000019', 'personal',     'day 412',                    '{wins}'),
  ('00000000-0000-4000-8000-000000000019', 'professional', 'new grad too',               '{work}'),
  ('00000000-0000-4000-8000-000000000020', 'personal',     'just started, day 4',        '{wins}'),
  ('00000000-0000-4000-8000-000000000021', 'personal',     'faking it, 21',              '{future}'),
  ('00000000-0000-4000-8000-000000000022', 'personal',     'invisible labor, 31',        '{family}'),
  ('00000000-0000-4000-8000-000000000099', 'personal',     'curious, 20s',               '{self,lonely,wins}'),
  ('00000000-0000-4000-8000-000000000099', 'professional', 'reviewer, day 1',            '{work,wins,future}');

-- ── posts ────────────────────────────────────────────────────────────────────
-- FEED personal (b…01–07), FEED professional (b…08–14),
-- INCOMING personal (b…15–19), INCOMING professional (b…20–24).

insert into public.posts
  (id, author_id, mode, body, mood, topic, comments_enabled, status, is_seed,
   felt_count, same_count, comment_count, created_at)
values
  ('b0000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001', 'personal',
   $q$i've been the strong one for so long that nobody ever asks if i'm okay. i wouldn't even know how to answer if they did.$q$,
   'heavy', 'family', true, 'live', true, 1284, 612, 3, now() - interval '9 days'),
  ('b0000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000002', 'personal',
   $q$i have a hundred people i could text right now and not a single one i could call crying at 2am.$q$,
   'lonely', 'lonely', true, 'live', true, 2017, 1340, 2, now() - interval '8 days'),
  ('b0000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000003', 'personal',
   $q$i love my family and i cannot wait to move out. both things are true and it makes me feel like a liar.$q$,
   'confused', 'family', true, 'live', true, 894, 503, 1, now() - interval '7 days'),
  ('b0000000-0000-4000-8000-000000000004', '00000000-0000-4000-8000-000000000004', 'personal',
   $q$ninety days today. nobody in my life knows to be proud of me, so i'm telling strangers instead.$q$,
   'proud', 'wins', true, 'live', true, 4302, 221, 2, now() - interval '6 days'),
  ('b0000000-0000-4000-8000-000000000005', '00000000-0000-4000-8000-000000000005', 'personal',
   $q$everyone's figuring out their lives and i'm just pretending i have a plan so nobody worries about me.$q$,
   'scared', 'future', true, 'live', true, 1551, 1102, 1, now() - interval '5 days'),
  ('b0000000-0000-4000-8000-000000000006', '00000000-0000-4000-8000-000000000006', 'personal',
   $q$i drove three hours for a birthday nobody thanked me for. i'm not angry. okay. i'm a little angry.$q$,
   'angry', 'family', true, 'live', true, 763, 488, 1, now() - interval '4 days'),
  ('b0000000-0000-4000-8000-000000000007', '00000000-0000-4000-8000-000000000007', 'personal',
   $q$i moved across the country to chase something and some nights i'm not sure it was worth it. but tonight, i am.$q$,
   'hopeful', 'self', true, 'live', true, 1098, 340, 0, now() - interval '3 days'),

  ('b0000000-0000-4000-8000-000000000008', '00000000-0000-4000-8000-000000000001', 'professional',
   $q$my manager presented my work to the whole company today and said 'i' the entire time. i smiled and said nothing.$q$,
   'angry', 'work', true, 'live', true, 3120, 1890, 2, now() - interval '9 days 2 hours'),
  ('b0000000-0000-4000-8000-000000000009', '00000000-0000-4000-8000-000000000002', 'professional',
   $q$four months in and i'm terrified the day they realize i don't know what i'm doing is coming soon.$q$,
   'scared', 'work', true, 'live', true, 2740, 2210, 1, now() - interval '8 days 3 hours'),
  ('b0000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000003', 'professional',
   $q$i laid off two people i hired myself and told them it was 'a business decision.' i went home and couldn't eat.$q$,
   'heavy', 'work', true, 'live', true, 1670, 540, 1, now() - interval '7 days 4 hours'),
  ('b0000000-0000-4000-8000-000000000011', '00000000-0000-4000-8000-000000000004', 'professional',
   $q$everyone tells me their problems and i have nobody to tell mine. being the safe person is exhausting.$q$,
   'confused', 'work', true, 'live', true, 1422, 980, 1, now() - interval '6 days 5 hours'),
  ('b0000000-0000-4000-8000-000000000012', '00000000-0000-4000-8000-000000000005', 'professional',
   $q$i finally said 'no, that timeline isn't realistic' in a meeting today. the ceiling didn't fall. i can breathe.$q$,
   'relieved', 'wins', true, 'live', true, 2050, 410, 1, now() - interval '5 days 6 hours'),
  ('b0000000-0000-4000-8000-000000000013', '00000000-0000-4000-8000-000000000006', 'professional',
   $q$i eat lunch in my car most days so nobody sees that i don't have anyone to eat with yet.$q$,
   'lonely', 'lonely', true, 'live', true, 1985, 1530, 1, now() - interval '4 days 7 hours'),
  ('b0000000-0000-4000-8000-000000000014', '00000000-0000-4000-8000-000000000007', 'professional',
   $q$six months of runway left and i smiled through standup this morning telling everyone we're doing great.$q$,
   'scared', 'money', true, 'live', true, 1340, 760, 0, now() - interval '3 days 8 hours'),

  ('b0000000-0000-4000-8000-000000000015', '00000000-0000-4000-8000-000000000008', 'personal',
   $q$i reread our old chats sometimes just to remember what it felt like to be someone's person.$q$,
   'lonely', 'love', true, 'live', true, 14, 6, 0, now() - interval '5 hours'),
  ('b0000000-0000-4000-8000-000000000016', '00000000-0000-4000-8000-000000000009', 'personal',
   $q$i went outside today. that doesn't sound like much but it was everything.$q$,
   'hopeful', 'wins', true, 'live', true, 9, 3, 0, now() - interval '4 hours'),
  ('b0000000-0000-4000-8000-000000000017', '00000000-0000-4000-8000-000000000010', 'personal',
   $q$i said 'i'm fine' four times today and meant it zero.$q$,
   'heavy', 'lonely', true, 'live', true, 22, 11, 0, now() - interval '3 hours'),
  ('b0000000-0000-4000-8000-000000000018', '00000000-0000-4000-8000-000000000011', 'personal',
   $q$i forgave someone today — not for them, for me. i feel lighter.$q$,
   'relieved', 'love', true, 'live', true, 17, 4, 0, now() - interval '2 hours'),
  ('b0000000-0000-4000-8000-000000000019', '00000000-0000-4000-8000-000000000012', 'personal',
   $q$i think i'm about to let down everyone who believed in me, and i can't say it out loud.$q$,
   'scared', 'future', true, 'live', true, 6, 5, 0, now() - interval '50 minutes'),

  ('b0000000-0000-4000-8000-000000000020', '00000000-0000-4000-8000-000000000008', 'professional',
   $q$i got the promotion i wanted and now i'm terrified everyone will find out i'm just guessing.$q$,
   'scared', 'work', true, 'live', true, 19, 9, 0, now() - interval '6 hours'),
  ('b0000000-0000-4000-8000-000000000021', '00000000-0000-4000-8000-000000000009', 'professional',
   $q$i haven't spoken out loud to a human in two days. standup is the only time i hear my own voice.$q$,
   'lonely', 'lonely', true, 'live', true, 28, 16, 0, now() - interval '4 hours 30 minutes'),
  ('b0000000-0000-4000-8000-000000000022', '00000000-0000-4000-8000-000000000010', 'professional',
   $q$i used to love this work. i can't remember when it became something i just survive.$q$,
   'heavy', 'work', true, 'live', true, 23, 13, 0, now() - interval '3 hours 15 minutes'),
  ('b0000000-0000-4000-8000-000000000023', '00000000-0000-4000-8000-000000000011', 'professional',
   $q$pushed my first feature to a million users today. told no one at work. telling you.$q$,
   'proud', 'wins', true, 'live', true, 35, 3, 0, now() - interval '90 minutes'),
  ('b0000000-0000-4000-8000-000000000024', '00000000-0000-4000-8000-000000000012', 'professional',
   $q$got rejected again. but i'm starting to think the right no's are clearing space for a yes.$q$,
   'hopeful', 'future', true, 'live', true, 11, 5, 0, now() - interval '40 minutes');

-- ── comments (from the prototype FEED data; counts above match) ─────────────

insert into public.comments (post_id, author_id, body, status, parent_id, created_at) values
  ('b0000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000013',
   $q$felt this in my chest. nobody asks us.$q$, 'live', null, now() - interval '9 days' + interval '2 hours'),
  ('b0000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000014',
   $q$i'm asking. are you okay?$q$, 'live', null, now() - interval '9 days' + interval '5 hours'),
  ('b0000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000015',
   $q$you're allowed to put it down sometimes. 🤍$q$, 'live', null, now() - interval '9 days' + interval '9 hours'),

  ('b0000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000016',
   $q$it's 2am. you can call the void here. we're up.$q$, 'live', null, now() - interval '8 days' + interval '1 hour'),
  ('b0000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000017',
   $q$same. the loneliest part is everyone thinks i'm fine.$q$, 'live', null, now() - interval '8 days' + interval '6 hours'),

  ('b0000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000018',
   $q$loving them and leaving them are the same sentence sometimes.$q$, 'live', null, now() - interval '7 days' + interval '3 hours'),

  ('b0000000-0000-4000-8000-000000000004', '00000000-0000-4000-8000-000000000019',
   $q$ninety days is enormous. i'm proud of you and i don't even know you.$q$, 'live', null, now() - interval '6 days' + interval '1 hour'),
  ('b0000000-0000-4000-8000-000000000004', '00000000-0000-4000-8000-000000000020',
   $q$you're giving me a reason to keep going. thank you.$q$, 'live', null, now() - interval '6 days' + interval '4 hours'),

  ('b0000000-0000-4000-8000-000000000005', '00000000-0000-4000-8000-000000000021',
   $q$nobody has a plan. we're all just very confident about it.$q$, 'live', null, now() - interval '5 days' + interval '2 hours'),

  ('b0000000-0000-4000-8000-000000000006', '00000000-0000-4000-8000-000000000022',
   $q$the people who hold it all up are always the least thanked. i see you.$q$, 'live', null, now() - interval '4 days' + interval '3 hours'),

  ('b0000000-0000-4000-8000-000000000008', '00000000-0000-4000-8000-000000000013',
   $q$start bcc-ing yourself on the work. paper trails save careers.$q$, 'live', null, now() - interval '9 days' + interval '4 hours'),
  ('b0000000-0000-4000-8000-000000000008', '00000000-0000-4000-8000-000000000014',
   $q$same exact thing last quarter. you're not crazy and you're not alone.$q$, 'live', null, now() - interval '9 days' + interval '8 hours'),

  ('b0000000-0000-4000-8000-000000000009', '00000000-0000-4000-8000-000000000015',
   $q$everyone in your office feels this. the good ones never stop feeling it.$q$, 'live', null, now() - interval '8 days' + interval '5 hours'),

  ('b0000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000016',
   $q$the day it stops hurting is the day you should quit managing. you're doing it right.$q$, 'live', null, now() - interval '7 days' + interval '6 hours'),

  ('b0000000-0000-4000-8000-000000000011', '00000000-0000-4000-8000-000000000017',
   $q$who holds the people who hold everyone? you deserve one too. 🤍$q$, 'live', null, now() - interval '6 days' + interval '7 hours'),

  ('b0000000-0000-4000-8000-000000000012', '00000000-0000-4000-8000-000000000018',
   $q$saving this. literally my entire goal for this quarter.$q$, 'live', null, now() - interval '5 days' + interval '8 hours'),

  ('b0000000-0000-4000-8000-000000000013', '00000000-0000-4000-8000-000000000019',
   $q$month three was the worst. it does get easier, i promise. find the other car-lunch people.$q$, 'live', null, now() - interval '4 days' + interval '9 hours');
