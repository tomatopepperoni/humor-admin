-- Demo seed data for Captioned NYC (week 6 admin dashboard)
-- Run in the Supabase SQL editor (project: humor-joke). Takes a few seconds.
--
-- Adds 24 fake Columbia students (emails end in @seed.captioned.nyc), 34 posts,
-- ~110 captions across all eight subway/legacy voices and four Gemini models,
-- and ~1,000 up/down votes spread over the last four weeks.
-- Your real users, posts and votes are not touched.
--
-- Built-in patterns (so the dashboard has something to find):
--   * Roast me / Overheard score best, Showtime worst
--   * the 1st caption on a post gets a few more upvotes than the 2nd/3rd
--   * gemini-3.5-flash-lite writes the weakest captions
--   * shorter captions do slightly better
--   * activity peaks late evening, New York time
--
-- Remove everything again with supabase/seed_demo_cleanup.sql
-- (deleting the fake auth users cascades to their profiles, posts, captions, votes).

begin;

-- safety: running twice would duplicate the data, so clear old seed rows first
delete from auth.users where email like '%@seed.captioned.nyc';

create temp table seed_users (n int, id uuid, first text, last text, bio text, onboarded bool,
  activity real, generosity real, nposts int, joined timestamptz) on commit drop;
create temp table seed_captions (id uuid, post_id uuid, owner uuid, vibe text, model text,
  position int, len int, quality real, created_at timestamptz) on commit drop;

insert into seed_users (n, id, first, last, bio, onboarded, activity, generosity, nposts, joined) values
  (0, gen_random_uuid(), 'Ava', 'Chen', 'CC ''28. Will rank every bagel on Broadway.', true, 0.8, 0.1, 3, (date_trunc('day', now() at time zone 'America/New_York') - interval '25.95 days' + interval '1 hours' + interval '41 minutes') at time zone 'America/New_York'),
  (1, gen_random_uuid(), 'Leo', 'Park', 'SEAS, sleeps in Mudd.', true, 0.65, -0.2, 2, (date_trunc('day', now() at time zone 'America/New_York') - interval '24.96 days' + interval '16 hours' + interval '30 minutes') at time zone 'America/New_York'),
  (2, gen_random_uuid(), 'Maya', 'Patel', 'Barnard. Professional overthinker.', true, 0.55, 0.15, 2, (date_trunc('day', now() at time zone 'America/New_York') - interval '25.58 days' + interval '22 hours' + interval '5 minutes') at time zone 'America/New_York'),
  (3, gen_random_uuid(), 'Sam', 'Okafor', 'Grad student, ex-Chicago, misses alleys.', true, 0.45, -0.3, 1, (date_trunc('day', now() at time zone 'America/New_York') - interval '24.5 days' + interval '20 hours' + interval '32 minutes') at time zone 'America/New_York'),
  (4, gen_random_uuid(), 'Zoe', 'Diaz', 'Dance team. Takes the 1 train personally.', true, 0.7, 0.05, 2, (date_trunc('day', now() at time zone 'America/New_York') - interval '23.49 days' + interval '17 hours' + interval '27 minutes') at time zone 'America/New_York'),
  (5, gen_random_uuid(), 'Noah', 'Kim', 'Econ. Knows every $1 slice south of 110th.', true, 0.3, 0.0, 2, (date_trunc('day', now() at time zone 'America/New_York') - interval '22.82 days' + interval '17 hours' + interval '40 minutes') at time zone 'America/New_York'),
  (6, gen_random_uuid(), 'Isla', 'Romero', 'Film major. Everything is a shot.', true, 0.6, 0.2, 2, (date_trunc('day', now() at time zone 'America/New_York') - interval '20.76 days' + interval '16 hours' + interval '9 minutes') at time zone 'America/New_York'),
  (7, gen_random_uuid(), 'Ethan', 'Brooks', 'Midwest transplant (Ohio).', true, 0.25, 0.18, 1, (date_trunc('day', now() at time zone 'America/New_York') - interval '21.1 days' + interval '15 hours' + interval '7 minutes') at time zone 'America/New_York'),
  (8, gen_random_uuid(), 'Priya', 'Nair', 'CS + coffee. Mostly coffee.', true, 0.75, -0.1, 2, (date_trunc('day', now() at time zone 'America/New_York') - interval '18.81 days' + interval '18 hours' + interval '29 minutes') at time zone 'America/New_York'),
  (9, gen_random_uuid(), 'Jonah', 'Weiss', 'Hates the M4 bus with his whole heart.', true, 0.2, -0.35, 1, (date_trunc('day', now() at time zone 'America/New_York') - interval '18.59 days' + interval '2 hours' + interval '50 minutes') at time zone 'America/New_York'),
  (10, gen_random_uuid(), 'Lena', 'Fischer', 'Exchange student from Berlin.', true, 0.4, 0.0, 1, (date_trunc('day', now() at time zone 'America/New_York') - interval '18.09 days' + interval '0 hours' + interval '28 minutes') at time zone 'America/New_York'),
  (11, gen_random_uuid(), 'Marcus', 'Hill', 'Football. Doesn''t read captions, just votes.', true, 0.85, 0.25, 0, (date_trunc('day', now() at time zone 'America/New_York') - interval '15.76 days' + interval '1 hours' + interval '5 minutes') at time zone 'America/New_York'),
  (12, gen_random_uuid(), 'Hana', 'Sato', 'Architecture. Up at 4am for no reason.', true, 0.35, 0.05, 2, (date_trunc('day', now() at time zone 'America/New_York') - interval '14.72 days' + interval '16 hours' + interval '5 minutes') at time zone 'America/New_York'),
  (13, gen_random_uuid(), 'Diego', 'Alvarez', 'Queens native, judging all of you.', true, 0.5, -0.25, 2, (date_trunc('day', now() at time zone 'America/New_York') - interval '14.37 days' + interval '23 hours' + interval '3 minutes') at time zone 'America/New_York'),
  (14, gen_random_uuid(), 'Chloe', 'Martin', 'Gets lost in Brooklyn weekly.', true, 0.3, 0.12, 2, (date_trunc('day', now() at time zone 'America/New_York') - interval '13.89 days' + interval '16 hours' + interval '29 minutes') at time zone 'America/New_York'),
  (15, gen_random_uuid(), 'Omar', 'Haddad', 'Pre-med. Running on Joe Coffee.', true, 0.15, 0.0, 1, (date_trunc('day', now() at time zone 'America/New_York') - interval '13.57 days' + interval '20 hours' + interval '10 minutes') at time zone 'America/New_York'),
  (16, gen_random_uuid(), 'Grace', 'Liu', 'Orchestra. Practices in Prentis.', true, 0.55, 0.08, 1, (date_trunc('day', now() at time zone 'America/New_York') - interval '12.48 days' + interval '23 hours' + interval '8 minutes') at time zone 'America/New_York'),
  (17, gen_random_uuid(), 'Tyler', 'Nguyen', 'Says ''ope'' and is not from the Midwest.', true, 0.1, 0.0, 0, (date_trunc('day', now() at time zone 'America/New_York') - interval '12.01 days' + interval '11 hours' + interval '23 minutes') at time zone 'America/New_York'),
  (18, gen_random_uuid(), 'Sofia', 'Russo', 'Italian, deeply offended by the pizza.', true, 0.65, -0.15, 1, (date_trunc('day', now() at time zone 'America/New_York') - interval '11.11 days' + interval '16 hours' + interval '43 minutes') at time zone 'America/New_York'),
  (19, gen_random_uuid(), 'Ben', 'Adler', null, true, 0.05, 0.0, 0, (date_trunc('day', now() at time zone 'America/New_York') - interval '10.22 days' + interval '1 hours' + interval '54 minutes') at time zone 'America/New_York'),
  (20, gen_random_uuid(), 'Ruby', 'Thompson', 'Barnard ''27. Rooftop scout.', true, 0.4, 0.1, 1, (date_trunc('day', now() at time zone 'America/New_York') - interval '9.12 days' + interval '23 hours' + interval '46 minutes') at time zone 'America/New_York'),
  (21, gen_random_uuid(), 'Kenji', 'Mori', null, false, 0.0, 0.0, 0, (date_trunc('day', now() at time zone 'America/New_York') - interval '7.8 days' + interval '23 hours' + interval '40 minutes') at time zone 'America/New_York'),
  (22, gen_random_uuid(), 'Ella', 'Grant', null, false, 0.0, 0.0, 0, (date_trunc('day', now() at time zone 'America/New_York') - interval '6.69 days' + interval '23 hours' + interval '8 minutes') at time zone 'America/New_York'),
  (23, gen_random_uuid(), 'Arjun', 'Mehta', null, false, 0.1, 0.0, 0, (date_trunc('day', now() at time zone 'America/New_York') - interval '5.46 days' + interval '21 hours' + interval '25 minutes') at time zone 'America/New_York');

insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change)
select '00000000-0000-0000-0000-000000000000', id, 'authenticated', 'authenticated',
  lower(first) || '.' || lower(last) || '@seed.captioned.nyc', '', joined,
  '{"provider":"seed","providers":["seed"]}'::jsonb,
  jsonb_build_object('full_name', first || ' ' || last), joined, joined, '', '', '', ''
from seed_users;

-- the on_auth_user_created trigger made the profile rows; fill them in
update public.profiles p
set first_name = case when s.onboarded then s.first end,
    last_name  = case when s.onboarded then s.last end,
    bio        = s.bio,
    created_at = s.joined,
    updated_at = s.joined
from seed_users s
where p.id = s.id;

-- posts + captions
with u as (select id, joined from seed_users where n = 1),
t as (select greatest((date_trunc('day', now() at time zone 'America/New_York') - interval '26.99 days' + interval '1 hours 43 minutes') at time zone 'America/New_York', (select joined from u) + interval '2 hours') as at),
t2 as (select least(at, now() - interval '3 hours') as at from t),
p as (
  insert into public.posts (user_id, image_url, image_path, context, vibe, theme, created_at)
  select u.id, null, null, 'First time at Levain, 40 min line for one cookie', 'chronically-online', 'First time at a place every New Yorker says is ''overrated''', t2.at from u, t2
  returning id, user_id, created_at
)
, c as (
  insert into public.captions (id, post_id, user_id, text, prompt, model, position, vibe, created_at)
  select v.id, p.id, p.user_id, v.text, v.prompt, v.model, v.position, v.vibe, p.created_at + make_interval(secs => v.secs)
  from p, (values
  (gen_random_uuid(), '40 minutes for a cookie is crazy work but the cookie was also crazy work', '(demo seed data)
Vibe: Chronically online. 
The poster says about this moment: "First time at Levain, 40 min line for one cookie"', 'gemini-3.8-flash', 0, 'chronically-online', -0.061, 5),
  (gen_random_uuid(), 'me in line at levain explaining to my parents that this is an investment', '(demo seed data)
Vibe: Chronically online. 
The poster says about this moment: "First time at Levain, 40 min line for one cookie"', 'gemini-3.8-flash', 1, 'chronically-online', 0.069, 7),
  (gen_random_uuid(), 'the cookie weighed more than my will to do pset 3', '(demo seed data)
Vibe: Chronically online. 
The poster says about this moment: "First time at Levain, 40 min line for one cookie"', 'gemini-3.8-flash', 2, 'chronically-online', -0.123, 9)
  ) as v(id, text, prompt, model, position, vibe, quality, secs)
  returning id, post_id, user_id, vibe, model, position, length(text) as len, created_at
)
insert into seed_captions (id, post_id, owner, vibe, model, position, len, quality, created_at)
select c.id, c.post_id, c.user_id, c.vibe, c.model, c.position, c.len, v.quality, c.created_at
from c join (values
  (0, -0.061),
  (1, 0.069),
  (2, -0.123)
) as v(position, quality) on v.position = c.position;

with u as (select id, joined from seed_users where n = 15),
t as (select greatest((date_trunc('day', now() at time zone 'America/New_York') - interval '24.81 days' + interval '21 hours 30 minutes') at time zone 'America/New_York', (select joined from u) + interval '2 hours') as at),
t2 as (select least(at, now() - interval '3 hours') as at from t),
p as (
  insert into public.posts (user_id, image_url, image_path, context, vibe, theme, created_at)
  select u.id, null, null, 'Took the 1 train the wrong way and ended up in the Bronx', 'midwest-nice', 'Your most unhinged subway moment', t2.at from u, t2
  returning id, user_id, created_at
)
, c as (
  insert into public.captions (id, post_id, user_id, text, prompt, model, position, vibe, created_at)
  select v.id, p.id, p.user_id, v.text, v.prompt, v.model, v.position, v.vibe, p.created_at + make_interval(secs => v.secs)
  from p, (values
  (gen_random_uuid(), 'Ope, this isn''t 116th. Well, the Bronx seems real nice too!', '(demo seed data)
Vibe: Midwest nice. 
The poster says about this moment: "Took the 1 train the wrong way and ended up in the Bronx"', 'gemini-3.8-flash', 0, 'midwest-nice', 0.045, 5),
  (gen_random_uuid(), 'Asked a man for directions and he just said ''no.'' Very efficient people here.', '(demo seed data)
Vibe: Midwest nice. 
The poster says about this moment: "Took the 1 train the wrong way and ended up in the Bronx"', 'gemini-3.8-flash', 1, 'midwest-nice', -0.064, 7),
  (gen_random_uuid(), 'Two hours to get home, but I saw a real bodega cat, so honestly a win.', '(demo seed data)
Vibe: Midwest nice. 
The poster says about this moment: "Took the 1 train the wrong way and ended up in the Bronx"', 'gemini-3.8-flash', 2, 'midwest-nice', 0.112, 9)
  ) as v(id, text, prompt, model, position, vibe, quality, secs)
  returning id, post_id, user_id, vibe, model, position, length(text) as len, created_at
)
insert into seed_captions (id, post_id, owner, vibe, model, position, len, quality, created_at)
select c.id, c.post_id, c.user_id, c.vibe, c.model, c.position, c.len, v.quality, c.created_at
from c join (values
  (0, 0.045),
  (1, -0.064),
  (2, 0.112)
) as v(position, quality) on v.position = c.position;

with u as (select id, joined from seed_users where n = 13),
t as (select greatest((date_trunc('day', now() at time zone 'America/New_York') - interval '23.91 days' + interval '2 hours 59 minutes') at time zone 'America/New_York', (select joined from u) + interval '2 hours') as at),
t2 as (select least(at, now() - interval '3 hours') as at from t),
p as (
  insert into public.posts (user_id, image_url, image_path, context, vibe, theme, created_at)
  select u.id, null, null, 'Rooftop at sunset on the Upper West Side', 'main-character', 'Rooftop? No. Fire escape? Yes.', t2.at from u, t2
  returning id, user_id, created_at
)
, c as (
  insert into public.captions (id, post_id, user_id, text, prompt, model, position, vibe, created_at)
  select v.id, p.id, p.user_id, v.text, v.prompt, v.model, v.position, v.vibe, p.created_at + make_interval(secs => v.secs)
  from p, (values
  (gen_random_uuid(), 'And in that moment, above Broadway, she forgot she had a 9am.', '(demo seed data)
Vibe: Main character. 
The poster says about this moment: "Rooftop at sunset on the Upper West Side"', 'gemini-3.8-flash', 0, 'main-character', -0.057, 5),
  (gen_random_uuid(), 'The city hums below. The camera pans. The midterm grade has not loaded yet.', '(demo seed data)
Vibe: Main character. 
The poster says about this moment: "Rooftop at sunset on the Upper West Side"', 'gemini-3.8-flash', 1, 'main-character', 0.009, 7),
  (gen_random_uuid(), 'Opening scene: golden hour, borrowed rooftop, zero idea what she''s doing with her life.', '(demo seed data)
Vibe: Main character. 
The poster says about this moment: "Rooftop at sunset on the Upper West Side"', 'gemini-3.8-flash', 2, 'main-character', 0.133, 9)
  ) as v(id, text, prompt, model, position, vibe, quality, secs)
  returning id, post_id, user_id, vibe, model, position, length(text) as len, created_at
)
insert into seed_captions (id, post_id, owner, vibe, model, position, len, quality, created_at)
select c.id, c.post_id, c.user_id, c.vibe, c.model, c.position, c.len, v.quality, c.created_at
from c join (values
  (0, -0.057),
  (1, 0.009),
  (2, 0.133)
) as v(position, quality) on v.position = c.position;

with u as (select id, joined from seed_users where n = 10),
t as (select greatest((date_trunc('day', now() at time zone 'America/New_York') - interval '22.12 days' + interval '23 hours 24 minutes') at time zone 'America/New_York', (select joined from u) + interval '2 hours') as at),
t2 as (select least(at, now() - interval '3 hours') as at from t),
p as (
  insert into public.posts (user_id, image_url, image_path, context, vibe, theme, created_at)
  select u.id, null, null, 'John Jay made ''Asian fusion'' tacos', 'chronically-online', 'The dining hall vs. the $18 salad', t2.at from u, t2
  returning id, user_id, created_at
)
, c as (
  insert into public.captions (id, post_id, user_id, text, prompt, model, position, vibe, created_at)
  select v.id, p.id, p.user_id, v.text, v.prompt, v.model, v.position, v.vibe, p.created_at + make_interval(secs => v.secs)
  from p, (values
  (gen_random_uuid(), 'john jay really said fusion and then fused nothing', '(demo seed data)
Vibe: Chronically online. 
The poster says about this moment: "John Jay made ''Asian fusion'' tacos"', 'gemini-3.8-flash', 0, 'chronically-online', 0.078, 5),
  (gen_random_uuid(), 'this taco has the confidence of a man who''s never been to a taco place', '(demo seed data)
Vibe: Chronically online. 
The poster says about this moment: "John Jay made ''Asian fusion'' tacos"', 'gemini-3.8-flash', 1, 'chronically-online', 0.244, 7),
  (gen_random_uuid(), 'rating: 4/10, ate three', '(demo seed data)
Vibe: Chronically online. 
The poster says about this moment: "John Jay made ''Asian fusion'' tacos"', 'gemini-3.8-flash', 2, 'chronically-online', 0.037, 9)
  ) as v(id, text, prompt, model, position, vibe, quality, secs)
  returning id, post_id, user_id, vibe, model, position, length(text) as len, created_at
)
insert into seed_captions (id, post_id, owner, vibe, model, position, len, quality, created_at)
select c.id, c.post_id, c.user_id, c.vibe, c.model, c.position, c.len, v.quality, c.created_at
from c join (values
  (0, 0.078),
  (1, 0.244),
  (2, 0.037)
) as v(position, quality) on v.position = c.position;

with u as (select id, joined from seed_users where n = 5),
t as (select greatest((date_trunc('day', now() at time zone 'America/New_York') - interval '20.1 days' + interval '23 hours 0 minutes') at time zone 'America/New_York', (select joined from u) + interval '2 hours') as at),
t2 as (select least(at, now() - interval '3 hours') as at from t),
p as (
  insert into public.posts (user_id, image_url, image_path, context, vibe, theme, created_at)
  select u.id, null, null, 'Got an $18 salad because I''m ''healthy now''', 'midwest-nice', 'The dining hall vs. the $18 salad', t2.at from u, t2
  returning id, user_id, created_at
)
, c as (
  insert into public.captions (id, post_id, user_id, text, prompt, model, position, vibe, created_at)
  select v.id, p.id, p.user_id, v.text, v.prompt, v.model, v.position, v.vibe, p.created_at + make_interval(secs => v.secs)
  from p, (values
  (gen_random_uuid(), 'Eighteen dollars! Back home that''s a whole casserole and a gallon of milk.', '(demo seed data)
Vibe: Midwest nice. 
The poster says about this moment: "Got an $18 salad because I''m ''healthy now''"', 'gemini-3.8-flash', 0, 'midwest-nice', -0.129, 5),
  (gen_random_uuid(), 'It had kale and a little bit of regret in it. Very fresh though!', '(demo seed data)
Vibe: Midwest nice. 
The poster says about this moment: "Got an $18 salad because I''m ''healthy now''"', 'gemini-3.8-flash', 1, 'midwest-nice', 0.056, 7),
  (gen_random_uuid(), 'The cashier didn''t even say ''have a nice day.'' I said it for both of us.', '(demo seed data)
Vibe: Midwest nice. 
The poster says about this moment: "Got an $18 salad because I''m ''healthy now''"', 'gemini-3.8-flash', 2, 'midwest-nice', -0.069, 9)
  ) as v(id, text, prompt, model, position, vibe, quality, secs)
  returning id, post_id, user_id, vibe, model, position, length(text) as len, created_at
)
insert into seed_captions (id, post_id, owner, vibe, model, position, len, quality, created_at)
select c.id, c.post_id, c.user_id, c.vibe, c.model, c.position, c.len, v.quality, c.created_at
from c join (values
  (0, -0.129),
  (1, 0.056),
  (2, -0.069)
) as v(position, quality) on v.position = c.position;

with u as (select id, joined from seed_users where n = 9),
t as (select greatest((date_trunc('day', now() at time zone 'America/New_York') - interval '18.7 days' + interval '21 hours 21 minutes') at time zone 'America/New_York', (select joined from u) + interval '2 hours') as at),
t2 as (select least(at, now() - interval '3 hours') as at from t),
p as (
  insert into public.posts (user_id, image_url, image_path, context, vibe, theme, created_at)
  select u.id, null, null, 'Dorm room at 2am, roommate asleep, me doing laundry math', 'main-character', 'Dorm room at 2am', t2.at from u, t2
  returning id, user_id, created_at
)
, c as (
  insert into public.captions (id, post_id, user_id, text, prompt, model, position, vibe, created_at)
  select v.id, p.id, p.user_id, v.text, v.prompt, v.model, v.position, v.vibe, p.created_at + make_interval(secs => v.secs)
  from p, (values
  (gen_random_uuid(), '2am. Carman Hall. One quarter short of clean socks, and a whole life ahead.', '(demo seed data)
Vibe: Main character. 
The poster says about this moment: "Dorm room at 2am, roommate asleep, me doing laundry math"', 'gemini-3.8-flash', 0, 'main-character', -0.097, 5),
  (gen_random_uuid(), 'She stared at the ceiling and realized the dryer was the only thing that understood her.', '(demo seed data)
Vibe: Main character. 
The poster says about this moment: "Dorm room at 2am, roommate asleep, me doing laundry math"', 'gemini-3.8-flash', 1, 'main-character', 0.137, 7),
  (gen_random_uuid(), 'Every great story starts with a girl who forgot her laundry in the machine.', '(demo seed data)
Vibe: Main character. 
The poster says about this moment: "Dorm room at 2am, roommate asleep, me doing laundry math"', 'gemini-3.8-flash', 2, 'main-character', 0.048, 9)
  ) as v(id, text, prompt, model, position, vibe, quality, secs)
  returning id, post_id, user_id, vibe, model, position, length(text) as len, created_at
)
insert into seed_captions (id, post_id, owner, vibe, model, position, len, quality, created_at)
select c.id, c.post_id, c.user_id, c.vibe, c.model, c.position, c.len, v.quality, c.created_at
from c join (values
  (0, -0.097),
  (1, 0.137),
  (2, 0.048)
) as v(position, quality) on v.position = c.position;

with u as (select id, joined from seed_users where n = 8),
t as (select greatest((date_trunc('day', now() at time zone 'America/New_York') - interval '17.72 days' + interval '22 hours 37 minutes') at time zone 'America/New_York', (select joined from u) + interval '2 hours') as at),
t2 as (select least(at, now() - interval '3 hours') as at from t),
p as (
  insert into public.posts (user_id, image_url, image_path, context, vibe, theme, created_at)
  select u.id, null, null, 'Central Park picnic with people from orientation', 'midwest-nice', 'Central Park but make it Midwestern', t2.at from u, t2
  returning id, user_id, created_at
)
, c as (
  insert into public.captions (id, post_id, user_id, text, prompt, model, position, vibe, created_at)
  select v.id, p.id, p.user_id, v.text, v.prompt, v.model, v.position, v.vibe, p.created_at + make_interval(secs => v.secs)
  from p, (values
  (gen_random_uuid(), 'Someone brought a $40 cheese. I brought Doritos and they were gone first. Proud.', '(demo seed data)
Vibe: Midwest nice. 
The poster says about this moment: "Central Park picnic with people from orientation"', 'gemini-3.8-flash', 0, 'midwest-nice', 0.145, 5),
  (gen_random_uuid(), 'A squirrel took my sandwich and honestly he looked like he needed it more.', '(demo seed data)
Vibe: Midwest nice. 
The poster says about this moment: "Central Park picnic with people from orientation"', 'gemini-3.8-flash', 1, 'midwest-nice', -0.16, 7),
  (gen_random_uuid(), 'Everyone here walks so fast. Even the joggers looked late.', '(demo seed data)
Vibe: Midwest nice. 
The poster says about this moment: "Central Park picnic with people from orientation"', 'gemini-3.8-flash', 2, 'midwest-nice', -0.034, 9)
  ) as v(id, text, prompt, model, position, vibe, quality, secs)
  returning id, post_id, user_id, vibe, model, position, length(text) as len, created_at
)
insert into seed_captions (id, post_id, owner, vibe, model, position, len, quality, created_at)
select c.id, c.post_id, c.user_id, c.vibe, c.model, c.position, c.len, v.quality, c.created_at
from c join (values
  (0, 0.145),
  (1, -0.16),
  (2, -0.034)
) as v(position, quality) on v.position = c.position;

with u as (select id, joined from seed_users where n = 0),
t as (select greatest((date_trunc('day', now() at time zone 'America/New_York') - interval '15.87 days' + interval '11 hours 12 minutes') at time zone 'America/New_York', (select joined from u) + interval '2 hours') as at),
t2 as (select least(at, now() - interval '3 hours') as at from t),
p as (
  insert into public.posts (user_id, image_url, image_path, context, vibe, theme, created_at)
  select u.id, null, null, 'Lost in Brooklyn again', 'chronically-online', 'Lost in Brooklyn (again)', t2.at from u, t2
  returning id, user_id, created_at
)
, c as (
  insert into public.captions (id, post_id, user_id, text, prompt, model, position, vibe, created_at)
  select v.id, p.id, p.user_id, v.text, v.prompt, v.model, v.position, v.vibe, p.created_at + make_interval(secs => v.secs)
  from p, (values
  (gen_random_uuid(), 'google maps said 18 min and then said ''actually no''', '(demo seed data)
Vibe: Chronically online. 
The poster says about this moment: "Lost in Brooklyn again"', 'gemini-3.8-flash', 0, 'chronically-online', -0.027, 5),
  (gen_random_uuid(), 'brooklyn is just 40 neighborhoods that all have the same coffee shop', '(demo seed data)
Vibe: Chronically online. 
The poster says about this moment: "Lost in Brooklyn again"', 'gemini-3.8-flash', 1, 'chronically-online', 0.044, 7),
  (gen_random_uuid(), 'my sense of direction is a vibe and the vibe is lost', '(demo seed data)
Vibe: Chronically online. 
The poster says about this moment: "Lost in Brooklyn again"', 'gemini-3.8-flash', 2, 'chronically-online', 0.217, 9)
  ) as v(id, text, prompt, model, position, vibe, quality, secs)
  returning id, post_id, user_id, vibe, model, position, length(text) as len, created_at
)
insert into seed_captions (id, post_id, owner, vibe, model, position, len, quality, created_at)
select c.id, c.post_id, c.user_id, c.vibe, c.model, c.position, c.len, v.quality, c.created_at
from c join (values
  (0, -0.027),
  (1, 0.044),
  (2, 0.217)
) as v(position, quality) on v.position = c.position;

with u as (select id, joined from seed_users where n = 14),
t as (select greatest((date_trunc('day', now() at time zone 'America/New_York') - interval '13.36 days' + interval '23 hours 13 minutes') at time zone 'America/New_York', (select joined from u) + interval '2 hours') as at),
t2 as (select least(at, now() - interval '3 hours') as at from t),
p as (
  insert into public.posts (user_id, image_url, image_path, context, vibe, theme, created_at)
  select u.id, null, null, 'Butler at 11:58pm, assignment due at midnight', 'conductor', 'Library at 11:59pm, assignment due at midnight', t2.at from u, t2
  returning id, user_id, created_at
)
, c as (
  insert into public.captions (id, post_id, user_id, text, prompt, model, position, vibe, created_at)
  select v.id, p.id, p.user_id, v.text, v.prompt, v.model, v.position, v.vibe, p.created_at + make_interval(secs => v.secs)
  from p, (values
  (gen_random_uuid(), 'This is a Butler-bound student. The next stop is: submit. Stand clear of the closing deadline, please.', '(demo seed data)
Vibe: Conductor. 
The poster says about this moment: "Butler at 11:58pm, assignment due at midnight"', 'gemini-3.6-flash', 0, 'conductor', -0.014, 5),
  (gen_random_uuid(), 'We are being held at Butler by a missing citation. We apologize for the inconvenience.', '(demo seed data)
Vibe: Conductor. 
The poster says about this moment: "Butler at 11:58pm, assignment due at midnight"', 'gemini-3.6-flash', 1, 'conductor', -0.136, 7),
  (gen_random_uuid(), 'Last call for the 11:59 express. If you''re not done, please wait for the next semester.', '(demo seed data)
Vibe: Conductor. 
The poster says about this moment: "Butler at 11:58pm, assignment due at midnight"', 'gemini-3.6-flash', 2, 'conductor', 0.017, 9),
  (gen_random_uuid(), 'Two weeks to do this and you picked the two minutes with the worst Wi-Fi in Morningside.', '(demo seed data)
Vibe: Roast me. 
The poster says about this moment: "Butler at 11:58pm, assignment due at midnight"', 'gemini-3.5-flash', 3, 'roast', -0.055, 7031),
  (gen_random_uuid(), 'Butler at midnight isn''t a study spot, it''s a hostage situation you booked yourself.', '(demo seed data)
Vibe: Roast me. 
The poster says about this moment: "Butler at 11:58pm, assignment due at midnight"', 'gemini-3.5-flash', 4, 'roast', 0.139, 7033),
  (gen_random_uuid(), 'Your bibliography is one Wikipedia link and a prayer.', '(demo seed data)
Vibe: Roast me. 
The poster says about this moment: "Butler at 11:58pm, assignment due at midnight"', 'gemini-3.5-flash', 5, 'roast', 0.19, 7035)
  ) as v(id, text, prompt, model, position, vibe, quality, secs)
  returning id, post_id, user_id, vibe, model, position, length(text) as len, created_at
)
insert into seed_captions (id, post_id, owner, vibe, model, position, len, quality, created_at)
select c.id, c.post_id, c.user_id, c.vibe, c.model, c.position, c.len, v.quality, c.created_at
from c join (values
  (0, -0.014),
  (1, -0.136),
  (2, 0.017),
  (3, -0.055),
  (4, 0.139),
  (5, 0.19)
) as v(position, quality) on v.position = c.position;

with u as (select id, joined from seed_users where n = 6),
t as (select greatest((date_trunc('day', now() at time zone 'America/New_York') - interval '12.82 days' + interval '20 hours 58 minutes') at time zone 'America/New_York', (select joined from u) + interval '2 hours') as at),
t2 as (select least(at, now() - interval '3 hours') as at from t),
p as (
  insert into public.posts (user_id, image_url, image_path, context, vibe, theme, created_at)
  select u.id, null, null, '$1 pizza slice at 3am after a party', 'service-alert', 'The $1 pizza slice that changed you', t2.at from u, t2
  returning id, user_id, created_at
)
, c as (
  insert into public.captions (id, post_id, user_id, text, prompt, model, position, vibe, created_at)
  select v.id, p.id, p.user_id, v.text, v.prompt, v.model, v.position, v.vibe, p.created_at + make_interval(secs => v.secs)
  from p, (values
  (gen_random_uuid(), 'Delays: Your stomach is running with delays because of an earlier incident at 2 Bros.', '(demo seed data)
Vibe: Service alert. 
The poster says about this moment: "$1 pizza slice at 3am after a party"', 'gemini-3.5-flash', 0, 'service-alert', 0.17, 5),
  (gen_random_uuid(), 'Good service on the dollar slice. Expect severe delays on your 10am.', '(demo seed data)
Vibe: Service alert. 
The poster says about this moment: "$1 pizza slice at 3am after a party"', 'gemini-3.5-flash', 1, 'service-alert', -0.24, 7),
  (gen_random_uuid(), 'Planned work: Your dignity is suspended between 2am and brunch.', '(demo seed data)
Vibe: Service alert. 
The poster says about this moment: "$1 pizza slice at 3am after a party"', 'gemini-3.5-flash', 2, 'service-alert', 0.082, 9)
  ) as v(id, text, prompt, model, position, vibe, quality, secs)
  returning id, post_id, user_id, vibe, model, position, length(text) as len, created_at
)
insert into seed_captions (id, post_id, owner, vibe, model, position, len, quality, created_at)
select c.id, c.post_id, c.user_id, c.vibe, c.model, c.position, c.len, v.quality, c.created_at
from c join (values
  (0, 0.17),
  (1, -0.24),
  (2, 0.082)
) as v(position, quality) on v.position = c.position;

with u as (select id, joined from seed_users where n = 0),
t as (select greatest((date_trunc('day', now() at time zone 'America/New_York') - interval '12.22 days' + interval '21 hours 46 minutes') at time zone 'America/New_York', (select joined from u) + interval '2 hours') as at),
t2 as (select least(at, now() - interval '3 hours') as at from t),
p as (
  insert into public.posts (user_id, image_url, image_path, context, vibe, theme, created_at)
  select u.id, null, null, 'Subway performer did backflips on the A train', 'showtime', 'Your most unhinged subway moment', t2.at from u, t2
  returning id, user_id, created_at
)
, c as (
  insert into public.captions (id, post_id, user_id, text, prompt, model, position, vibe, created_at)
  select v.id, p.id, p.user_id, v.text, v.prompt, v.model, v.position, v.vibe, p.created_at + make_interval(secs => v.secs)
  from p, (values
  (gen_random_uuid(), 'What time is it? Showtime! Ladies and gentlemen, I nearly lost a tooth and found religion.', '(demo seed data)
Vibe: Showtime. 
The poster says about this moment: "Subway performer did backflips on the A train"', 'gemini-3.6-flash', 0, 'showtime', 0.049, 5),
  (gen_random_uuid(), 'Hold on to the pole, hold on to your iced coffee, hold on to your will to live!', '(demo seed data)
Vibe: Showtime. 
The poster says about this moment: "Subway performer did backflips on the A train"', 'gemini-3.6-flash', 1, 'showtime', -0.176, 7),
  (gen_random_uuid(), 'He spun twice, the train stopped once, I screamed three times. Five stars.', '(demo seed data)
Vibe: Showtime. 
The poster says about this moment: "Subway performer did backflips on the A train"', 'gemini-3.6-flash', 2, 'showtime', 0.075, 9)
  ) as v(id, text, prompt, model, position, vibe, quality, secs)
  returning id, post_id, user_id, vibe, model, position, length(text) as len, created_at
)
insert into seed_captions (id, post_id, owner, vibe, model, position, len, quality, created_at)
select c.id, c.post_id, c.user_id, c.vibe, c.model, c.position, c.len, v.quality, c.created_at
from c join (values
  (0, 0.049),
  (1, -0.176),
  (2, 0.075)
) as v(position, quality) on v.position = c.position;

with u as (select id, joined from seed_users where n = 1),
t as (select greatest((date_trunc('day', now() at time zone 'America/New_York') - interval '11.84 days' + interval '22 hours 2 minutes') at time zone 'America/New_York', (select joined from u) + interval '2 hours') as at),
t2 as (select least(at, now() - interval '3 hours') as at from t),
p as (
  insert into public.posts (user_id, image_url, image_path, context, vibe, theme, created_at)
  select u.id, null, null, 'A tourist asked me for directions and I confidently sent them the wrong way', 'overheard', 'A tourist photo you took but will never post', t2.at from u, t2
  returning id, user_id, created_at
)
, c as (
  insert into public.captions (id, post_id, user_id, text, prompt, model, position, vibe, created_at)
  select v.id, p.id, p.user_id, v.text, v.prompt, v.model, v.position, v.vibe, p.created_at + make_interval(secs => v.secs)
  from p, (values
  (gen_random_uuid(), '“You live here?” “Six weeks.” “And you sent us to Queens?” — overheard on the 7 train', '(demo seed data)
Vibe: Overheard. 
The poster says about this moment: "A tourist asked me for directions and I confidently sent them the wrong way"', 'gemini-3.5-flash', 0, 'overheard', 0.2, 5),
  (gen_random_uuid(), '“He said it like he knew. That''s how you know he didn''t.” — overheard on the 1 train', '(demo seed data)
Vibe: Overheard. 
The poster says about this moment: "A tourist asked me for directions and I confidently sent them the wrong way"', 'gemini-3.5-flash', 1, 'overheard', -0.069, 7),
  (gen_random_uuid(), '“Bro gave directions with the confidence of a Google Maps outage.” — overheard on the Q train', '(demo seed data)
Vibe: Overheard. 
The poster says about this moment: "A tourist asked me for directions and I confidently sent them the wrong way"', 'gemini-3.5-flash', 2, 'overheard', 0.094, 9)
  ) as v(id, text, prompt, model, position, vibe, quality, secs)
  returning id, post_id, user_id, vibe, model, position, length(text) as len, created_at
)
insert into seed_captions (id, post_id, owner, vibe, model, position, len, quality, created_at)
select c.id, c.post_id, c.user_id, c.vibe, c.model, c.position, c.len, v.quality, c.created_at
from c join (values
  (0, 0.2),
  (1, -0.069),
  (2, 0.094)
) as v(position, quality) on v.position = c.position;

with u as (select id, joined from seed_users where n = 4),
t as (select greatest((date_trunc('day', now() at time zone 'America/New_York') - interval '11.3 days' + interval '15 hours 9 minutes') at time zone 'America/New_York', (select joined from u) + interval '2 hours') as at),
t2 as (select least(at, now() - interval '3 hours') as at from t),
p as (
  insert into public.posts (user_id, image_url, image_path, context, vibe, theme, created_at)
  select u.id, null, null, 'Paid $9 for an iced latte in SoHo', 'roast', null, t2.at from u, t2
  returning id, user_id, created_at
)
, c as (
  insert into public.captions (id, post_id, user_id, text, prompt, model, position, vibe, created_at)
  select v.id, p.id, p.user_id, v.text, v.prompt, v.model, v.position, v.vibe, p.created_at + make_interval(secs => v.secs)
  from p, (values
  (gen_random_uuid(), 'Nine dollars, and the barista didn''t even put effort into misspelling your name.', '(demo seed data)
Vibe: Roast me. 
The poster says about this moment: "Paid $9 for an iced latte in SoHo"', 'gemini-3.6-flash', 0, 'roast', -0.244, 5),
  (gen_random_uuid(), 'You could''ve bought a subway ride, a bagel, and a sense of financial direction.', '(demo seed data)
Vibe: Roast me. 
The poster says about this moment: "Paid $9 for an iced latte in SoHo"', 'gemini-3.6-flash', 1, 'roast', -0.131, 7),
  (gen_random_uuid(), 'Most expensive thing you''ve touched since your tuition statement.', '(demo seed data)
Vibe: Roast me. 
The poster says about this moment: "Paid $9 for an iced latte in SoHo"', 'gemini-3.6-flash', 2, 'roast', 0.012, 9)
  ) as v(id, text, prompt, model, position, vibe, quality, secs)
  returning id, post_id, user_id, vibe, model, position, length(text) as len, created_at
)
insert into seed_captions (id, post_id, owner, vibe, model, position, len, quality, created_at)
select c.id, c.post_id, c.user_id, c.vibe, c.model, c.position, c.len, v.quality, c.created_at
from c join (values
  (0, -0.244),
  (1, -0.131),
  (2, 0.012)
) as v(position, quality) on v.position = c.position;

with u as (select id, joined from seed_users where n = 18),
t as (select greatest((date_trunc('day', now() at time zone 'America/New_York') - interval '10.96 days' + interval '22 hours 14 minutes') at time zone 'America/New_York', (select joined from u) + interval '2 hours') as at),
t2 as (select least(at, now() - interval '3 hours') as at from t),
p as (
  insert into public.posts (user_id, image_url, image_path, context, vibe, theme, created_at)
  select u.id, null, null, 'Bodega cat asleep on the bread', 'overheard', 'Bodega cat appreciation post', t2.at from u, t2
  returning id, user_id, created_at
)
, c as (
  insert into public.captions (id, post_id, user_id, text, prompt, model, position, vibe, created_at)
  select v.id, p.id, p.user_id, v.text, v.prompt, v.model, v.position, v.vibe, p.created_at + make_interval(secs => v.secs)
  from p, (values
  (gen_random_uuid(), '“Don''t move him, he''s the manager.” — overheard on the L train', '(demo seed data)
Vibe: Overheard. 
The poster says about this moment: "Bodega cat asleep on the bread"', 'gemini-3.5-flash-lite', 0, 'overheard', -0.204, 5),
  (gen_random_uuid(), '“That cat has more job security than all of us.” — overheard on the 1 train', '(demo seed data)
Vibe: Overheard. 
The poster says about this moment: "Bodega cat asleep on the bread"', 'gemini-3.5-flash-lite', 1, 'overheard', -0.172, 7),
  (gen_random_uuid(), '“I''ll take the bread he isn''t on. Actually no, the one he is.” — overheard on the G train', '(demo seed data)
Vibe: Overheard. 
The poster says about this moment: "Bodega cat asleep on the bread"', 'gemini-3.5-flash-lite', 2, 'overheard', -0.274, 9)
  ) as v(id, text, prompt, model, position, vibe, quality, secs)
  returning id, post_id, user_id, vibe, model, position, length(text) as len, created_at
)
insert into seed_captions (id, post_id, owner, vibe, model, position, len, quality, created_at)
select c.id, c.post_id, c.user_id, c.vibe, c.model, c.position, c.len, v.quality, c.created_at
from c join (values
  (0, -0.204),
  (1, -0.172),
  (2, -0.274)
) as v(position, quality) on v.position = c.position;

with u as (select id, joined from seed_users where n = 16),
t as (select greatest((date_trunc('day', now() at time zone 'America/New_York') - interval '10.18 days' + interval '0 hours 58 minutes') at time zone 'America/New_York', (select joined from u) + interval '2 hours') as at),
t2 as (select least(at, now() - interval '3 hours') as at from t),
p as (
  insert into public.posts (user_id, image_url, image_path, context, vibe, theme, created_at)
  select u.id, null, null, 'Midterm in Hamilton tomorrow, haven''t started', 'service-alert', null, t2.at from u, t2
  returning id, user_id, created_at
)
, c as (
  insert into public.captions (id, post_id, user_id, text, prompt, model, position, vibe, created_at)
  select v.id, p.id, p.user_id, v.text, v.prompt, v.model, v.position, v.vibe, p.created_at + make_interval(secs => v.secs)
  from p, (values
  (gen_random_uuid(), 'Delays: Studying is running with delays because of an earlier incident on TikTok.', '(demo seed data)
Vibe: Service alert. 
The poster says about this moment: "Midterm in Hamilton tomorrow, haven''t started"', 'gemini-3.8-flash', 0, 'service-alert', 0.194, 5),
  (gen_random_uuid(), 'Some brain cells are skipping Hamilton Hall because of planned work on your sleep.', '(demo seed data)
Vibe: Service alert. 
The poster says about this moment: "Midterm in Hamilton tomorrow, haven''t started"', 'gemini-3.8-flash', 1, 'service-alert', -0.006, 7),
  (gen_random_uuid(), 'Please be advised: there is no alternate service. Consider walking to office hours.', '(demo seed data)
Vibe: Service alert. 
The poster says about this moment: "Midterm in Hamilton tomorrow, haven''t started"', 'gemini-3.8-flash', 2, 'service-alert', 0.109, 9),
  (gen_random_uuid(), 'This is the last stop on the procrastination line. Everybody out, please.', '(demo seed data)
Vibe: Conductor. 
The poster says about this moment: "Midterm in Hamilton tomorrow, haven''t started"', 'gemini-3.8-flash', 3, 'conductor', 0.055, 7631),
  (gen_random_uuid(), 'Ladies and gentlemen, we are being held by a syllabus you did not read.', '(demo seed data)
Vibe: Conductor. 
The poster says about this moment: "Midterm in Hamilton tomorrow, haven''t started"', 'gemini-3.8-flash', 4, 'conductor', 0.106, 7633),
  (gen_random_uuid(), 'The next stop is Hamilton Hall. Doors will open on the side of panic.', '(demo seed data)
Vibe: Conductor. 
The poster says about this moment: "Midterm in Hamilton tomorrow, haven''t started"', 'gemini-3.8-flash', 5, 'conductor', 0.085, 7635)
  ) as v(id, text, prompt, model, position, vibe, quality, secs)
  returning id, post_id, user_id, vibe, model, position, length(text) as len, created_at
)
insert into seed_captions (id, post_id, owner, vibe, model, position, len, quality, created_at)
select c.id, c.post_id, c.user_id, c.vibe, c.model, c.position, c.len, v.quality, c.created_at
from c join (values
  (0, 0.194),
  (1, -0.006),
  (2, 0.109),
  (3, 0.055),
  (4, 0.106),
  (5, 0.085)
) as v(position, quality) on v.position = c.position;

with u as (select id, joined from seed_users where n = 0),
t as (select greatest((date_trunc('day', now() at time zone 'America/New_York') - interval '9.67 days' + interval '0 hours 46 minutes') at time zone 'America/New_York', (select joined from u) + interval '2 hours') as at),
t2 as (select least(at, now() - interval '3 hours') as at from t),
p as (
  insert into public.posts (user_id, image_url, image_path, context, vibe, theme, created_at)
  select u.id, null, null, 'Washington Square Park on a Saturday, trying to look like a local', 'roast', 'Trying to look like a local in Washington Square Park', t2.at from u, t2
  returning id, user_id, created_at
)
, c as (
  insert into public.captions (id, post_id, user_id, text, prompt, model, position, vibe, created_at)
  select v.id, p.id, p.user_id, v.text, v.prompt, v.model, v.position, v.vibe, p.created_at + make_interval(secs => v.secs)
  from p, (values
  (gen_random_uuid(), 'You put on a tote bag and suddenly you''re ''from here.'' The tote is from orientation.', '(demo seed data)
Vibe: Roast me. 
The poster says about this moment: "Washington Square Park on a Saturday, trying to look like a local"', 'gemini-3.8-flash', 0, 'roast', -0.172, 5),
  (gen_random_uuid(), 'Locals don''t take 40 photos of the arch. Locals walk under it complaining.', '(demo seed data)
Vibe: Roast me. 
The poster says about this moment: "Washington Square Park on a Saturday, trying to look like a local"', 'gemini-3.8-flash', 1, 'roast', 0.136, 7),
  (gen_random_uuid(), 'The chess guys clocked you as a tourist before you sat down.', '(demo seed data)
Vibe: Roast me. 
The poster says about this moment: "Washington Square Park on a Saturday, trying to look like a local"', 'gemini-3.8-flash', 2, 'roast', 0.114, 9)
  ) as v(id, text, prompt, model, position, vibe, quality, secs)
  returning id, post_id, user_id, vibe, model, position, length(text) as len, created_at
)
insert into seed_captions (id, post_id, owner, vibe, model, position, len, quality, created_at)
select c.id, c.post_id, c.user_id, c.vibe, c.model, c.position, c.len, v.quality, c.created_at
from c join (values
  (0, -0.172),
  (1, 0.136),
  (2, 0.114)
) as v(position, quality) on v.position = c.position;

with u as (select id, joined from seed_users where n = 20),
t as (select greatest((date_trunc('day', now() at time zone 'America/New_York') - interval '9.06 days' + interval '16 hours 21 minutes') at time zone 'America/New_York', (select joined from u) + interval '2 hours') as at),
t2 as (select least(at, now() - interval '3 hours') as at from t),
p as (
  insert into public.posts (user_id, image_url, image_path, context, vibe, theme, created_at)
  select u.id, null, null, 'Rat carrying a whole bagel down Broadway', 'conductor', null, t2.at from u, t2
  returning id, user_id, created_at
)
, c as (
  insert into public.captions (id, post_id, user_id, text, prompt, model, position, vibe, created_at)
  select v.id, p.id, p.user_id, v.text, v.prompt, v.model, v.position, v.vibe, p.created_at + make_interval(secs => v.secs)
  from p, (values
  (gen_random_uuid(), 'This is a Broadway-bound rat. Please make room for the bagel. Thank you for riding with MTA.', '(demo seed data)
Vibe: Conductor. 
The poster says about this moment: "Rat carrying a whole bagel down Broadway"', 'gemini-3.6-flash', 0, 'conductor', 0.028, 5),
  (gen_random_uuid(), 'Stand clear of the rat, please. Stand clear of the rat.', '(demo seed data)
Vibe: Conductor. 
The poster says about this moment: "Rat carrying a whole bagel down Broadway"', 'gemini-3.6-flash', 1, 'conductor', 0.077, 7),
  (gen_random_uuid(), 'Attention passengers: the rat has priority seating. He''s paid more rent than you.', '(demo seed data)
Vibe: Conductor. 
The poster says about this moment: "Rat carrying a whole bagel down Broadway"', 'gemini-3.6-flash', 2, 'conductor', -0.126, 9),
  (gen_random_uuid(), 'What time is it? Rat time! Give it up for the only New Yorker who finished breakfast!', '(demo seed data)
Vibe: Showtime. 
The poster says about this moment: "Rat carrying a whole bagel down Broadway"', 'gemini-3.8-flash', 3, 'showtime', 0.118, 27971),
  (gen_random_uuid(), 'Ladies and gentlemen, he''s got a bagel, he''s got cardio, he''s got no fear!', '(demo seed data)
Vibe: Showtime. 
The poster says about this moment: "Rat carrying a whole bagel down Broadway"', 'gemini-3.8-flash', 4, 'showtime', -0.019, 27973),
  (gen_random_uuid(), 'No pole, no music, just one rat and a dream. Showtime!', '(demo seed data)
Vibe: Showtime. 
The poster says about this moment: "Rat carrying a whole bagel down Broadway"', 'gemini-3.8-flash', 5, 'showtime', -0.014, 27975)
  ) as v(id, text, prompt, model, position, vibe, quality, secs)
  returning id, post_id, user_id, vibe, model, position, length(text) as len, created_at
)
insert into seed_captions (id, post_id, owner, vibe, model, position, len, quality, created_at)
select c.id, c.post_id, c.user_id, c.vibe, c.model, c.position, c.len, v.quality, c.created_at
from c join (values
  (0, 0.028),
  (1, 0.077),
  (2, -0.126),
  (3, 0.118),
  (4, -0.019),
  (5, -0.014)
) as v(position, quality) on v.position = c.position;

with u as (select id, joined from seed_users where n = 3),
t as (select greatest((date_trunc('day', now() at time zone 'America/New_York') - interval '8.78 days' + interval '18 hours 47 minutes') at time zone 'America/New_York', (select joined from u) + interval '2 hours') as at),
t2 as (select least(at, now() - interval '3 hours') as at from t),
p as (
  insert into public.posts (user_id, image_url, image_path, context, vibe, theme, created_at)
  select u.id, null, null, 'Brooklyn Bridge selfie, same as everyone else', 'overheard', 'The one Brooklyn Bridge selfie everyone takes', t2.at from u, t2
  returning id, user_id, created_at
)
, c as (
  insert into public.captions (id, post_id, user_id, text, prompt, model, position, vibe, created_at)
  select v.id, p.id, p.user_id, v.text, v.prompt, v.model, v.position, v.vibe, p.created_at + make_interval(secs => v.secs)
  from p, (values
  (gen_random_uuid(), '“Move, you''re in my Brooklyn Bridge selfie.” “You''re in mine.” — overheard on the F train', '(demo seed data)
Vibe: Overheard. 
The poster says about this moment: "Brooklyn Bridge selfie, same as everyone else"', 'gemini-3.6-flash', 0, 'overheard', 0.071, 5),
  (gen_random_uuid(), '“That''s the 400th identical photo today and somehow the worst.” — overheard on the A train', '(demo seed data)
Vibe: Overheard. 
The poster says about this moment: "Brooklyn Bridge selfie, same as everyone else"', 'gemini-3.6-flash', 1, 'overheard', -0.133, 7),
  (gen_random_uuid(), '“I walked it once. My calves are still on the Manhattan side.” — overheard on the 2 train', '(demo seed data)
Vibe: Overheard. 
The poster says about this moment: "Brooklyn Bridge selfie, same as everyone else"', 'gemini-3.6-flash', 2, 'overheard', -0.02, 9)
  ) as v(id, text, prompt, model, position, vibe, quality, secs)
  returning id, post_id, user_id, vibe, model, position, length(text) as len, created_at
)
insert into seed_captions (id, post_id, owner, vibe, model, position, len, quality, created_at)
select c.id, c.post_id, c.user_id, c.vibe, c.model, c.position, c.len, v.quality, c.created_at
from c join (values
  (0, 0.071),
  (1, -0.133),
  (2, -0.02)
) as v(position, quality) on v.position = c.position;

with u as (select id, joined from seed_users where n = 12),
t as (select greatest((date_trunc('day', now() at time zone 'America/New_York') - interval '8.32 days' + interval '23 hours 33 minutes') at time zone 'America/New_York', (select joined from u) + interval '2 hours') as at),
t2 as (select least(at, now() - interval '3 hours') as at from t),
p as (
  insert into public.posts (user_id, image_url, image_path, context, vibe, theme, created_at)
  select u.id, null, null, 'Snuck into a Barnard dining hall', 'showtime', 'The dining hall vs. the $18 salad', t2.at from u, t2
  returning id, user_id, created_at
)
, c as (
  insert into public.captions (id, post_id, user_id, text, prompt, model, position, vibe, created_at)
  select v.id, p.id, p.user_id, v.text, v.prompt, v.model, v.position, v.vibe, p.created_at + make_interval(secs => v.secs)
  from p, (values
  (gen_random_uuid(), 'Ladies and gentlemen, he got past the swipe guy with nothing but a confident nod!', '(demo seed data)
Vibe: Showtime. 
The poster says about this moment: "Snuck into a Barnard dining hall"', 'gemini-3.6-flash', 0, 'showtime', 0.187, 5),
  (gen_random_uuid(), 'Showtime! Watch this man eat a full brunch with zero meal plan and full commitment!', '(demo seed data)
Vibe: Showtime. 
The poster says about this moment: "Snuck into a Barnard dining hall"', 'gemini-3.6-flash', 1, 'showtime', -0.077, 7),
  (gen_random_uuid(), 'Hold on to your trays, folks, it''s a crossover episode!', '(demo seed data)
Vibe: Showtime. 
The poster says about this moment: "Snuck into a Barnard dining hall"', 'gemini-3.6-flash', 2, 'showtime', 0.143, 9)
  ) as v(id, text, prompt, model, position, vibe, quality, secs)
  returning id, post_id, user_id, vibe, model, position, length(text) as len, created_at
)
insert into seed_captions (id, post_id, owner, vibe, model, position, len, quality, created_at)
select c.id, c.post_id, c.user_id, c.vibe, c.model, c.position, c.len, v.quality, c.created_at
from c join (values
  (0, 0.187),
  (1, -0.077),
  (2, 0.143)
) as v(position, quality) on v.position = c.position;

with u as (select id, joined from seed_users where n = 13),
t as (select greatest((date_trunc('day', now() at time zone 'America/New_York') - interval '7.62 days' + interval '12 hours 5 minutes') at time zone 'America/New_York', (select joined from u) + interval '2 hours') as at),
t2 as (select least(at, now() - interval '3 hours') as at from t),
p as (
  insert into public.posts (user_id, image_url, image_path, context, vibe, theme, created_at)
  select u.id, null, null, 'My roommate set off the fire alarm making ramen', 'service-alert', 'Dorm room at 2am', t2.at from u, t2
  returning id, user_id, created_at
)
, c as (
  insert into public.captions (id, post_id, user_id, text, prompt, model, position, vibe, created_at)
  select v.id, p.id, p.user_id, v.text, v.prompt, v.model, v.position, v.vibe, p.created_at + make_interval(secs => v.secs)
  from p, (values
  (gen_random_uuid(), 'Delays: The whole floor is running with delays because of a ramen incident on 7.', '(demo seed data)
Vibe: Service alert. 
The poster says about this moment: "My roommate set off the fire alarm making ramen"', 'gemini-3.6-flash', 0, 'service-alert', -0.015, 5),
  (gen_random_uuid(), 'Good service on the fire alarm. Expect crowding on the sidewalk.', '(demo seed data)
Vibe: Service alert. 
The poster says about this moment: "My roommate set off the fire alarm making ramen"', 'gemini-3.6-flash', 1, 'service-alert', -0.029, 7),
  (gen_random_uuid(), 'Planned work: Your roommate''s cooking privileges are suspended until further notice.', '(demo seed data)
Vibe: Service alert. 
The poster says about this moment: "My roommate set off the fire alarm making ramen"', 'gemini-3.6-flash', 2, 'service-alert', 0.095, 9)
  ) as v(id, text, prompt, model, position, vibe, quality, secs)
  returning id, post_id, user_id, vibe, model, position, length(text) as len, created_at
)
insert into seed_captions (id, post_id, owner, vibe, model, position, len, quality, created_at)
select c.id, c.post_id, c.user_id, c.vibe, c.model, c.position, c.len, v.quality, c.created_at
from c join (values
  (0, -0.015),
  (1, -0.029),
  (2, 0.095)
) as v(position, quality) on v.position = c.position;

with u as (select id, joined from seed_users where n = 6),
t as (select greatest((date_trunc('day', now() at time zone 'America/New_York') - interval '7.38 days' + interval '23 hours 25 minutes') at time zone 'America/New_York', (select joined from u) + interval '2 hours') as at),
t2 as (select least(at, now() - interval '3 hours') as at from t),
p as (
  insert into public.posts (user_id, image_url, image_path, context, vibe, theme, created_at)
  select u.id, null, null, 'Halloween costume shopping on 14th St', 'roast', null, t2.at from u, t2
  returning id, user_id, created_at
)
, c as (
  insert into public.captions (id, post_id, user_id, text, prompt, model, position, vibe, created_at)
  select v.id, p.id, p.user_id, v.text, v.prompt, v.model, v.position, v.vibe, p.created_at + make_interval(secs => v.secs)
  from p, (values
  (gen_random_uuid(), 'Your costume plan is ''something easy,'' which means cat ears for the fourth year.', '(demo seed data)
Vibe: Roast me. 
The poster says about this moment: "Halloween costume shopping on 14th St"', 'gemini-3.6-flash', 0, 'roast', -0.23, 5),
  (gen_random_uuid(), 'You spent $60 at a pop-up to dress as someone who has their life together.', '(demo seed data)
Vibe: Roast me. 
The poster says about this moment: "Halloween costume shopping on 14th St"', 'gemini-3.6-flash', 1, 'roast', -0.016, 7),
  (gen_random_uuid(), 'Bold to shop for a costume when you''re already dressed as ''confused transfer student.''', '(demo seed data)
Vibe: Roast me. 
The poster says about this moment: "Halloween costume shopping on 14th St"', 'gemini-3.6-flash', 2, 'roast', 0.185, 9)
  ) as v(id, text, prompt, model, position, vibe, quality, secs)
  returning id, post_id, user_id, vibe, model, position, length(text) as len, created_at
)
insert into seed_captions (id, post_id, owner, vibe, model, position, len, quality, created_at)
select c.id, c.post_id, c.user_id, c.vibe, c.model, c.position, c.len, v.quality, c.created_at
from c join (values
  (0, -0.23),
  (1, -0.016),
  (2, 0.185)
) as v(position, quality) on v.position = c.position;

with u as (select id, joined from seed_users where n = 7),
t as (select greatest((date_trunc('day', now() at time zone 'America/New_York') - interval '6.67 days' + interval '20 hours 45 minutes') at time zone 'America/New_York', (select joined from u) + interval '2 hours') as at),
t2 as (select least(at, now() - interval '3 hours') as at from t),
p as (
  insert into public.posts (user_id, image_url, image_path, context, vibe, theme, created_at)
  select u.id, null, null, 'Waited 25 min for the 1 train at 116th', 'conductor', 'Your most unhinged subway moment', t2.at from u, t2
  returning id, user_id, created_at
)
, c as (
  insert into public.captions (id, post_id, user_id, text, prompt, model, position, vibe, created_at)
  select v.id, p.id, p.user_id, v.text, v.prompt, v.model, v.position, v.vibe, p.created_at + make_interval(secs => v.secs)
  from p, (values
  (gen_random_uuid(), 'We are being held momentarily at 110th by the train''s mood. We apologize for nothing.', '(demo seed data)
Vibe: Conductor. 
The poster says about this moment: "Waited 25 min for the 1 train at 116th"', 'gemini-3.5-flash-lite', 0, 'conductor', -0.191, 5),
  (gen_random_uuid(), 'This is a South Ferry-bound 1 train. Eventually. Possibly. Please be patient.', '(demo seed data)
Vibe: Conductor. 
The poster says about this moment: "Waited 25 min for the 1 train at 116th"', 'gemini-3.5-flash-lite', 1, 'conductor', 0.075, 7),
  (gen_random_uuid(), 'Your 1 train is delayed because the 1 train saw you were running late.', '(demo seed data)
Vibe: Conductor. 
The poster says about this moment: "Waited 25 min for the 1 train at 116th"', 'gemini-3.5-flash-lite', 2, 'conductor', -0.059, 9)
  ) as v(id, text, prompt, model, position, vibe, quality, secs)
  returning id, post_id, user_id, vibe, model, position, length(text) as len, created_at
)
insert into seed_captions (id, post_id, owner, vibe, model, position, len, quality, created_at)
select c.id, c.post_id, c.user_id, c.vibe, c.model, c.position, c.len, v.quality, c.created_at
from c join (values
  (0, -0.191),
  (1, 0.075),
  (2, -0.059)
) as v(position, quality) on v.position = c.position;

with u as (select id, joined from seed_users where n = 5),
t as (select greatest((date_trunc('day', now() at time zone 'America/New_York') - interval '6.03 days' + interval '22 hours 17 minutes') at time zone 'America/New_York', (select joined from u) + interval '2 hours') as at),
t2 as (select least(at, now() - interval '3 hours') as at from t),
p as (
  insert into public.posts (user_id, image_url, image_path, context, vibe, theme, created_at)
  select u.id, null, null, 'Ate a hot dog at a Yankees game', 'overheard', null, t2.at from u, t2
  returning id, user_id, created_at
)
, c as (
  insert into public.captions (id, post_id, user_id, text, prompt, model, position, vibe, created_at)
  select v.id, p.id, p.user_id, v.text, v.prompt, v.model, v.position, v.vibe, p.created_at + make_interval(secs => v.secs)
  from p, (values
  (gen_random_uuid(), '“Seven dollars for that? It better hit a home run.” — overheard on the 4 train', '(demo seed data)
Vibe: Overheard. 
The poster says about this moment: "Ate a hot dog at a Yankees game"', 'gemini-3.6-flash', 0, 'overheard', 0.182, 5),
  (gen_random_uuid(), '“He cheered for the wrong team the whole game and nobody corrected him.” — overheard on the B train', '(demo seed data)
Vibe: Overheard. 
The poster says about this moment: "Ate a hot dog at a Yankees game"', 'gemini-3.6-flash', 1, 'overheard', 0.122, 7),
  (gen_random_uuid(), '“That hot dog was the most consistent player out there.” — overheard on the D train', '(demo seed data)
Vibe: Overheard. 
The poster says about this moment: "Ate a hot dog at a Yankees game"', 'gemini-3.6-flash', 2, 'overheard', -0.12, 9)
  ) as v(id, text, prompt, model, position, vibe, quality, secs)
  returning id, post_id, user_id, vibe, model, position, length(text) as len, created_at
)
insert into seed_captions (id, post_id, owner, vibe, model, position, len, quality, created_at)
select c.id, c.post_id, c.user_id, c.vibe, c.model, c.position, c.len, v.quality, c.created_at
from c join (values
  (0, 0.182),
  (1, 0.122),
  (2, -0.12)
) as v(position, quality) on v.position = c.position;

with u as (select id, joined from seed_users where n = 8),
t as (select greatest((date_trunc('day', now() at time zone 'America/New_York') - interval '5.58 days' + interval '20 hours 51 minutes') at time zone 'America/New_York', (select joined from u) + interval '2 hours') as at),
t2 as (select least(at, now() - interval '3 hours') as at from t),
p as (
  insert into public.posts (user_id, image_url, image_path, context, vibe, theme, created_at)
  select u.id, null, null, 'Citi Bike dock was full, rode around for 20 minutes', 'showtime', null, t2.at from u, t2
  returning id, user_id, created_at
)
, c as (
  insert into public.captions (id, post_id, user_id, text, prompt, model, position, vibe, created_at)
  select v.id, p.id, p.user_id, v.text, v.prompt, v.model, v.position, v.vibe, p.created_at + make_interval(secs => v.secs)
  from p, (values
  (gen_random_uuid(), 'Ladies and gentlemen, he''s been circling this dock longer than the M4 circles Harlem!', '(demo seed data)
Vibe: Showtime. 
The poster says about this moment: "Citi Bike dock was full, rode around for 20 minutes"', 'gemini-3.5-flash-lite', 0, 'showtime', -0.484, 5),
  (gen_random_uuid(), 'Showtime! Watch him pay overtime fees for a bike he can''t put down!', '(demo seed data)
Vibe: Showtime. 
The poster says about this moment: "Citi Bike dock was full, rode around for 20 minutes"', 'gemini-3.5-flash-lite', 1, 'showtime', -0.083, 7),
  (gen_random_uuid(), 'Hold on to the handlebars, every dock is full and this is his life now!', '(demo seed data)
Vibe: Showtime. 
The poster says about this moment: "Citi Bike dock was full, rode around for 20 minutes"', 'gemini-3.5-flash-lite', 2, 'showtime', -0.254, 9)
  ) as v(id, text, prompt, model, position, vibe, quality, secs)
  returning id, post_id, user_id, vibe, model, position, length(text) as len, created_at
)
insert into seed_captions (id, post_id, owner, vibe, model, position, len, quality, created_at)
select c.id, c.post_id, c.user_id, c.vibe, c.model, c.position, c.len, v.quality, c.created_at
from c join (values
  (0, -0.484),
  (1, -0.083),
  (2, -0.254)
) as v(position, quality) on v.position = c.position;

with u as (select id, joined from seed_users where n = 4),
t as (select greatest((date_trunc('day', now() at time zone 'America/New_York') - interval '5.23 days' + interval '2 hours 54 minutes') at time zone 'America/New_York', (select joined from u) + interval '2 hours') as at),
t2 as (select least(at, now() - interval '3 hours') as at from t),
p as (
  insert into public.posts (user_id, image_url, image_path, context, vibe, theme, created_at)
  select u.id, null, null, 'Went to Trader Joe''s on a Sunday afternoon', 'service-alert', null, t2.at from u, t2
  returning id, user_id, created_at
)
, c as (
  insert into public.captions (id, post_id, user_id, text, prompt, model, position, vibe, created_at)
  select v.id, p.id, p.user_id, v.text, v.prompt, v.model, v.position, v.vibe, p.created_at + make_interval(secs => v.secs)
  from p, (values
  (gen_random_uuid(), 'Delays: The line is running with delays because of an earlier incident at the frozen dumplings.', '(demo seed data)
Vibe: Service alert. 
The poster says about this moment: "Went to Trader Joe''s on a Sunday afternoon"', 'gemini-3.6-flash', 0, 'service-alert', 0.212, 5),
  (gen_random_uuid(), 'Some shoppers are skipping produce because the line now begins in New Jersey.', '(demo seed data)
Vibe: Service alert. 
The poster says about this moment: "Went to Trader Joe''s on a Sunday afternoon"', 'gemini-3.6-flash', 1, 'service-alert', 0.038, 7),
  (gen_random_uuid(), 'Please be advised: cookie butter is not running. Seek alternate joy.', '(demo seed data)
Vibe: Service alert. 
The poster says about this moment: "Went to Trader Joe''s on a Sunday afternoon"', 'gemini-3.6-flash', 2, 'service-alert', -0.109, 9)
  ) as v(id, text, prompt, model, position, vibe, quality, secs)
  returning id, post_id, user_id, vibe, model, position, length(text) as len, created_at
)
insert into seed_captions (id, post_id, owner, vibe, model, position, len, quality, created_at)
select c.id, c.post_id, c.user_id, c.vibe, c.model, c.position, c.len, v.quality, c.created_at
from c join (values
  (0, 0.212),
  (1, 0.038),
  (2, -0.109)
) as v(position, quality) on v.position = c.position;

with u as (select id, joined from seed_users where n = 2),
t as (select greatest((date_trunc('day', now() at time zone 'America/New_York') - interval '4.61 days' + interval '13 hours 18 minutes') at time zone 'America/New_York', (select joined from u) + interval '2 hours') as at),
t2 as (select least(at, now() - interval '3 hours') as at from t),
p as (
  insert into public.posts (user_id, image_url, image_path, context, vibe, theme, created_at)
  select u.id, null, null, 'Professor called on me when I was half asleep', 'roast', null, t2.at from u, t2
  returning id, user_id, created_at
)
, c as (
  insert into public.captions (id, post_id, user_id, text, prompt, model, position, vibe, created_at)
  select v.id, p.id, p.user_id, v.text, v.prompt, v.model, v.position, v.vibe, p.created_at + make_interval(secs => v.secs)
  from p, (values
  (gen_random_uuid(), 'You answered ''yes'' to a question that started with ''why.'' Iconic.', '(demo seed data)
Vibe: Roast me. 
The poster says about this moment: "Professor called on me when I was half asleep"', 'gemini-3.5-flash-lite', 0, 'roast', -0.07, 5),
  (gen_random_uuid(), 'Your eyes were open but your soul was at Joe Coffee.', '(demo seed data)
Vibe: Roast me. 
The poster says about this moment: "Professor called on me when I was half asleep"', 'gemini-3.5-flash-lite', 1, 'roast', -0.214, 7),
  (gen_random_uuid(), 'Paying all that tuition to get jump-scared by a seminar.', '(demo seed data)
Vibe: Roast me. 
The poster says about this moment: "Professor called on me when I was half asleep"', 'gemini-3.5-flash-lite', 2, 'roast', -0.14, 9)
  ) as v(id, text, prompt, model, position, vibe, quality, secs)
  returning id, post_id, user_id, vibe, model, position, length(text) as len, created_at
)
insert into seed_captions (id, post_id, owner, vibe, model, position, len, quality, created_at)
select c.id, c.post_id, c.user_id, c.vibe, c.model, c.position, c.len, v.quality, c.created_at
from c join (values
  (0, -0.07),
  (1, -0.214),
  (2, -0.14)
) as v(position, quality) on v.position = c.position;

with u as (select id, joined from seed_users where n = 12),
t as (select greatest((date_trunc('day', now() at time zone 'America/New_York') - interval '4.29 days' + interval '19 hours 59 minutes') at time zone 'America/New_York', (select joined from u) + interval '2 hours') as at),
t2 as (select least(at, now() - interval '3 hours') as at from t),
p as (
  insert into public.posts (user_id, image_url, image_path, context, vibe, theme, created_at)
  select u.id, null, null, 'Free pizza at a club info session (I am not joining)', 'overheard', 'The $1 pizza slice that changed you', t2.at from u, t2
  returning id, user_id, created_at
)
, c as (
  insert into public.captions (id, post_id, user_id, text, prompt, model, position, vibe, created_at)
  select v.id, p.id, p.user_id, v.text, v.prompt, v.model, v.position, v.vibe, p.created_at + make_interval(secs => v.secs)
  from p, (values
  (gen_random_uuid(), '“He''s been to six info sessions and joined zero clubs.” — overheard on the 1 train', '(demo seed data)
Vibe: Overheard. 
The poster says about this moment: "Free pizza at a club info session (I am not joining)"', 'gemini-3.5-flash-lite', 0, 'overheard', -0.339, 5),
  (gen_random_uuid(), '“I''m basically a member. Of the pizza.” — overheard on the M60 bus', '(demo seed data)
Vibe: Overheard. 
The poster says about this moment: "Free pizza at a club info session (I am not joining)"', 'gemini-3.5-flash-lite', 1, 'overheard', -0.054, 7),
  (gen_random_uuid(), '“They asked for my email. I gave them my roommate''s.” — overheard on the 1 train', '(demo seed data)
Vibe: Overheard. 
The poster says about this moment: "Free pizza at a club info session (I am not joining)"', 'gemini-3.5-flash-lite', 2, 'overheard', -0.251, 9)
  ) as v(id, text, prompt, model, position, vibe, quality, secs)
  returning id, post_id, user_id, vibe, model, position, length(text) as len, created_at
)
insert into seed_captions (id, post_id, owner, vibe, model, position, len, quality, created_at)
select c.id, c.post_id, c.user_id, c.vibe, c.model, c.position, c.len, v.quality, c.created_at
from c join (values
  (0, -0.339),
  (1, -0.054),
  (2, -0.251)
) as v(position, quality) on v.position = c.position;

with u as (select id, joined from seed_users where n = 14),
t as (select greatest((date_trunc('day', now() at time zone 'America/New_York') - interval '3.71 days' + interval '22 hours 47 minutes') at time zone 'America/New_York', (select joined from u) + interval '2 hours') as at),
t2 as (select least(at, now() - interval '3 hours') as at from t),
p as (
  insert into public.posts (user_id, image_url, image_path, context, vibe, theme, created_at)
  select u.id, null, null, 'Umbrella flipped inside out on Amsterdam', 'conductor', null, t2.at from u, t2
  returning id, user_id, created_at
)
, c as (
  insert into public.captions (id, post_id, user_id, text, prompt, model, position, vibe, created_at)
  select v.id, p.id, p.user_id, v.text, v.prompt, v.model, v.position, v.vibe, p.created_at + make_interval(secs => v.secs)
  from p, (values
  (gen_random_uuid(), 'Please be advised: your umbrella has been taken out of service. Thank you for your patience.', '(demo seed data)
Vibe: Conductor. 
The poster says about this moment: "Umbrella flipped inside out on Amsterdam"', 'gemini-3.5-flash', 0, 'conductor', -0.002, 5),
  (gen_random_uuid(), 'This is a wind-bound umbrella. Next stop: the trash can on 114th.', '(demo seed data)
Vibe: Conductor. 
The poster says about this moment: "Umbrella flipped inside out on Amsterdam"', 'gemini-3.5-flash', 1, 'conductor', 0.118, 7),
  (gen_random_uuid(), 'Stand clear of the closing umbrella, please.', '(demo seed data)
Vibe: Conductor. 
The poster says about this moment: "Umbrella flipped inside out on Amsterdam"', 'gemini-3.5-flash', 2, 'conductor', -0.032, 9)
  ) as v(id, text, prompt, model, position, vibe, quality, secs)
  returning id, post_id, user_id, vibe, model, position, length(text) as len, created_at
)
insert into seed_captions (id, post_id, owner, vibe, model, position, len, quality, created_at)
select c.id, c.post_id, c.user_id, c.vibe, c.model, c.position, c.len, v.quality, c.created_at
from c join (values
  (0, -0.002),
  (1, 0.118),
  (2, -0.032)
) as v(position, quality) on v.position = c.position;

with u as (select id, joined from seed_users where n = 2),
t as (select greatest((date_trunc('day', now() at time zone 'America/New_York') - interval '3.13 days' + interval '14 hours 7 minutes') at time zone 'America/New_York', (select joined from u) + interval '2 hours') as at),
t2 as (select least(at, now() - interval '3 hours') as at from t),
p as (
  insert into public.posts (user_id, image_url, image_path, context, vibe, theme, created_at)
  select u.id, null, null, 'Thanksgiving flight home is $640', 'service-alert', 'Weekend you told your parents you ''studied''', t2.at from u, t2
  returning id, user_id, created_at
)
, c as (
  insert into public.captions (id, post_id, user_id, text, prompt, model, position, vibe, created_at)
  select v.id, p.id, p.user_id, v.text, v.prompt, v.model, v.position, v.vibe, p.created_at + make_interval(secs => v.secs)
  from p, (values
  (gen_random_uuid(), 'Delays: Going home is running with delays because of an earlier incident at your bank account.', '(demo seed data)
Vibe: Service alert. 
The poster says about this moment: "Thanksgiving flight home is $640"', 'gemini-3.5-flash', 0, 'service-alert', -0.004, 5),
  (gen_random_uuid(), 'Planned work: Thanksgiving is suspended. Shuttle bus available to Friendsgiving.', '(demo seed data)
Vibe: Service alert. 
The poster says about this moment: "Thanksgiving flight home is $640"', 'gemini-3.5-flash', 1, 'service-alert', -0.12, 7),
  (gen_random_uuid(), 'Good service on flight prices. Severe delays on your savings.', '(demo seed data)
Vibe: Service alert. 
The poster says about this moment: "Thanksgiving flight home is $640"', 'gemini-3.5-flash', 2, 'service-alert', 0.056, 9)
  ) as v(id, text, prompt, model, position, vibe, quality, secs)
  returning id, post_id, user_id, vibe, model, position, length(text) as len, created_at
)
insert into seed_captions (id, post_id, owner, vibe, model, position, len, quality, created_at)
select c.id, c.post_id, c.user_id, c.vibe, c.model, c.position, c.len, v.quality, c.created_at
from c join (values
  (0, -0.004),
  (1, -0.12),
  (2, 0.056)
) as v(position, quality) on v.position = c.position;

with u as (select id, joined from seed_users where n = 15),
t as (select greatest((date_trunc('day', now() at time zone 'America/New_York') - interval '2.79 days' + interval '22 hours 6 minutes') at time zone 'America/New_York', (select joined from u) + interval '2 hours') as at),
t2 as (select least(at, now() - interval '3 hours') as at from t),
p as (
  insert into public.posts (user_id, image_url, image_path, context, vibe, theme, created_at)
  select u.id, null, null, 'Saw a celebrity at a bodega (I think)', 'overheard', 'Bodega cat appreciation post', t2.at from u, t2
  returning id, user_id, created_at
)
, c as (
  insert into public.captions (id, post_id, user_id, text, prompt, model, position, vibe, created_at)
  select v.id, p.id, p.user_id, v.text, v.prompt, v.model, v.position, v.vibe, p.created_at + make_interval(secs => v.secs)
  from p, (values
  (gen_random_uuid(), '“That was definitely someone. Or someone''s dad.” — overheard on the C train', '(demo seed data)
Vibe: Overheard. 
The poster says about this moment: "Saw a celebrity at a bodega (I think)"', 'gemini-3.5-flash', 0, 'overheard', 0.133, 5),
  (gen_random_uuid(), '“He bought a Gatorade like a normal person. Respect.” — overheard on the 1 train', '(demo seed data)
Vibe: Overheard. 
The poster says about this moment: "Saw a celebrity at a bodega (I think)"', 'gemini-3.5-flash', 1, 'overheard', 0.149, 7),
  (gen_random_uuid(), '“I said ''love your work'' and I don''t know what his work is.” — overheard on the R train', '(demo seed data)
Vibe: Overheard. 
The poster says about this moment: "Saw a celebrity at a bodega (I think)"', 'gemini-3.5-flash', 2, 'overheard', 0.259, 9)
  ) as v(id, text, prompt, model, position, vibe, quality, secs)
  returning id, post_id, user_id, vibe, model, position, length(text) as len, created_at
)
insert into seed_captions (id, post_id, owner, vibe, model, position, len, quality, created_at)
select c.id, c.post_id, c.user_id, c.vibe, c.model, c.position, c.len, v.quality, c.created_at
from c join (values
  (0, 0.133),
  (1, 0.149),
  (2, 0.259)
) as v(position, quality) on v.position = c.position;

with u as (select id, joined from seed_users where n = 18),
t as (select greatest((date_trunc('day', now() at time zone 'America/New_York') - interval '2.19 days' + interval '22 hours 20 minutes') at time zone 'America/New_York', (select joined from u) + interval '2 hours') as at),
t2 as (select least(at, now() - interval '3 hours') as at from t),
p as (
  insert into public.posts (user_id, image_url, image_path, context, vibe, theme, created_at)
  select u.id, null, null, 'Laundry machine ate my quarters again', 'roast', 'Dorm room at 2am', t2.at from u, t2
  returning id, user_id, created_at
)
, c as (
  insert into public.captions (id, post_id, user_id, text, prompt, model, position, vibe, created_at)
  select v.id, p.id, p.user_id, v.text, v.prompt, v.model, v.position, v.vibe, p.created_at + make_interval(secs => v.secs)
  from p, (values
  (gen_random_uuid(), 'The machine has a better income stream than you do.', '(demo seed data)
Vibe: Roast me. 
The poster says about this moment: "Laundry machine ate my quarters again"', 'gemini-3.5-flash', 0, 'roast', 0.139, 5),
  (gen_random_uuid(), 'Six quarters in and your clothes came out wetter than your GPA predictions.', '(demo seed data)
Vibe: Roast me. 
The poster says about this moment: "Laundry machine ate my quarters again"', 'gemini-3.5-flash', 1, 'roast', -0.062, 7),
  (gen_random_uuid(), 'Somewhere a washing machine is laughing at a Columbia student, and it has earned it.', '(demo seed data)
Vibe: Roast me. 
The poster says about this moment: "Laundry machine ate my quarters again"', 'gemini-3.5-flash', 2, 'roast', -0.081, 9)
  ) as v(id, text, prompt, model, position, vibe, quality, secs)
  returning id, post_id, user_id, vibe, model, position, length(text) as len, created_at
)
insert into seed_captions (id, post_id, owner, vibe, model, position, len, quality, created_at)
select c.id, c.post_id, c.user_id, c.vibe, c.model, c.position, c.len, v.quality, c.created_at
from c join (values
  (0, 0.139),
  (1, -0.062),
  (2, -0.081)
) as v(position, quality) on v.position = c.position;

with u as (select id, joined from seed_users where n = 16),
t as (select greatest((date_trunc('day', now() at time zone 'America/New_York') - interval '1.65 days' + interval '23 hours 53 minutes') at time zone 'America/New_York', (select joined from u) + interval '2 hours') as at),
t2 as (select least(at, now() - interval '3 hours') as at from t),
p as (
  insert into public.posts (user_id, image_url, image_path, context, vibe, theme, created_at)
  select u.id, null, null, 'Fall leaves in Riverside Park', 'showtime', 'Central Park but make it Midwestern', t2.at from u, t2
  returning id, user_id, created_at
)
, c as (
  insert into public.captions (id, post_id, user_id, text, prompt, model, position, vibe, created_at)
  select v.id, p.id, p.user_id, v.text, v.prompt, v.model, v.position, v.vibe, p.created_at + make_interval(secs => v.secs)
  from p, (values
  (gen_random_uuid(), 'What time is it? Showtime! The trees are changing and so is my will to go to class!', '(demo seed data)
Vibe: Showtime. 
The poster says about this moment: "Fall leaves in Riverside Park"', 'gemini-3.6-flash', 0, 'showtime', -0.141, 5),
  (gen_random_uuid(), 'Ladies and gentlemen, give it up for October, doing more than I have all semester!', '(demo seed data)
Vibe: Showtime. 
The poster says about this moment: "Fall leaves in Riverside Park"', 'gemini-3.6-flash', 1, 'showtime', 0.017, 7),
  (gen_random_uuid(), 'Hold on to your pumpkin spice, folks, Riverside is putting on a show!', '(demo seed data)
Vibe: Showtime. 
The poster says about this moment: "Fall leaves in Riverside Park"', 'gemini-3.6-flash', 2, 'showtime', 0.104, 9)
  ) as v(id, text, prompt, model, position, vibe, quality, secs)
  returning id, post_id, user_id, vibe, model, position, length(text) as len, created_at
)
insert into seed_captions (id, post_id, owner, vibe, model, position, len, quality, created_at)
select c.id, c.post_id, c.user_id, c.vibe, c.model, c.position, c.len, v.quality, c.created_at
from c join (values
  (0, -0.141),
  (1, 0.017),
  (2, 0.104)
) as v(position, quality) on v.position = c.position;

with u as (select id, joined from seed_users where n = 5),
t as (select greatest((date_trunc('day', now() at time zone 'America/New_York') - interval '0.99 days' + interval '21 hours 55 minutes') at time zone 'America/New_York', (select joined from u) + interval '2 hours') as at),
t2 as (select least(at, now() - interval '3 hours') as at from t),
p as (
  insert into public.posts (user_id, image_url, image_path, context, vibe, theme, created_at)
  select u.id, null, null, 'Ordered from a Korean place in K-Town at 1am', 'conductor', null, t2.at from u, t2
  returning id, user_id, created_at
)
, c as (
  insert into public.captions (id, post_id, user_id, text, prompt, model, position, vibe, created_at)
  select v.id, p.id, p.user_id, v.text, v.prompt, v.model, v.position, v.vibe, p.created_at + make_interval(secs => v.secs)
  from p, (values
  (gen_random_uuid(), 'This is a K-Town-bound stomach. Next stop: regret, with a transfer to tteokbokki.', '(demo seed data)
Vibe: Conductor. 
The poster says about this moment: "Ordered from a Korean place in K-Town at 1am"', 'gemini-3.6-flash', 0, 'conductor', 0.148, 5),
  (gen_random_uuid(), 'We are being held at 32nd St by a second order of fried chicken.', '(demo seed data)
Vibe: Conductor. 
The poster says about this moment: "Ordered from a Korean place in K-Town at 1am"', 'gemini-3.6-flash', 1, 'conductor', 0.047, 7),
  (gen_random_uuid(), 'Ladies and gentlemen, the kitchen is still open. Nothing else in your life is.', '(demo seed data)
Vibe: Conductor. 
The poster says about this moment: "Ordered from a Korean place in K-Town at 1am"', 'gemini-3.6-flash', 2, 'conductor', -0.113, 9)
  ) as v(id, text, prompt, model, position, vibe, quality, secs)
  returning id, post_id, user_id, vibe, model, position, length(text) as len, created_at
)
insert into seed_captions (id, post_id, owner, vibe, model, position, len, quality, created_at)
select c.id, c.post_id, c.user_id, c.vibe, c.model, c.position, c.len, v.quality, c.created_at
from c join (values
  (0, 0.148),
  (1, 0.047),
  (2, -0.113)
) as v(position, quality) on v.position = c.position;

with u as (select id, joined from seed_users where n = 9),
t as (select greatest((date_trunc('day', now() at time zone 'America/New_York') - interval '0.77 days' + interval '23 hours 11 minutes') at time zone 'America/New_York', (select joined from u) + interval '2 hours') as at),
t2 as (select least(at, now() - interval '3 hours') as at from t),
p as (
  insert into public.posts (user_id, image_url, image_path, context, vibe, theme, created_at)
  select u.id, null, null, 'Someone clipped their nails on the 1 train', 'overheard', 'Your most unhinged subway moment', t2.at from u, t2
  returning id, user_id, created_at
)
, c as (
  insert into public.captions (id, post_id, user_id, text, prompt, model, position, vibe, created_at)
  select v.id, p.id, p.user_id, v.text, v.prompt, v.model, v.position, v.vibe, p.created_at + make_interval(secs => v.secs)
  from p, (values
  (gen_random_uuid(), '“Sir, this is a Manhattan-bound train, not a spa.” — overheard on the 1 train', '(demo seed data)
Vibe: Overheard. 
The poster says about this moment: "Someone clipped their nails on the 1 train"', 'gemini-3.6-flash', 0, 'overheard', 0.198, 5),
  (gen_random_uuid(), '“One just hit my bagel. I''m still eating it. This city changed me.” — overheard on the 1 train', '(demo seed data)
Vibe: Overheard. 
The poster says about this moment: "Someone clipped their nails on the 1 train"', 'gemini-3.6-flash', 1, 'overheard', -0.012, 7),
  (gen_random_uuid(), '“That''s the most productive anyone''s been on this train all week.” — overheard on the 1 train', '(demo seed data)
Vibe: Overheard. 
The poster says about this moment: "Someone clipped their nails on the 1 train"', 'gemini-3.6-flash', 2, 'overheard', -0.021, 9)
  ) as v(id, text, prompt, model, position, vibe, quality, secs)
  returning id, post_id, user_id, vibe, model, position, length(text) as len, created_at
)
insert into seed_captions (id, post_id, owner, vibe, model, position, len, quality, created_at)
select c.id, c.post_id, c.user_id, c.vibe, c.model, c.position, c.len, v.quality, c.created_at
from c join (values
  (0, 0.198),
  (1, -0.012),
  (2, -0.021)
) as v(position, quality) on v.position = c.position;

-- votes: every seed user looks at every caption posted after they joined and
-- votes with probability = their activity. Up or down depends on the voice,
-- the caption's position and length, the model's quality and the voter's mood.
select setseed(0.2026);

insert into public.votes (caption_id, user_id, value, created_at)
select c.id, u.id,
  case when random() < least(0.97, greatest(0.05,
      vb.base
      + c.quality
      + u.generosity
      + case when c.position = 0 then 0.12 when c.position in (1, 2) then -0.02 else -0.06 end
      + case when c.len < 60 then 0.05 when c.len >= 110 then -0.05 else 0 end
  )) then 1 else -1 end,
  -- most votes land in the first day after a post, skewed to the evening
  c.created_at + (power(random(), 2.2) * least(interval '3 days', now() - c.created_at - interval '5 minutes'))
               + interval '3 minutes'
from seed_captions c
join (values ('roast', 0.8), ('overheard', 0.76), ('conductor', 0.7), ('service-alert', 0.6), ('showtime', 0.5), ('chronically-online', 0.58), ('midwest-nice', 0.66), ('main-character', 0.45)) as vb(vibe, base) on vb.vibe = c.vibe
join seed_users u on u.joined < c.created_at
where u.activity > 0
  and random() < u.activity * case when c.position >= 3 then 0.7 else 1 end
  and (u.id <> c.owner or random() < 0.25);   -- a few people upvote themselves

commit;

-- quick look
select
  (select count(*) from public.profiles where email like '%@seed.captioned.nyc') as seed_users,
  (select count(*) from public.posts p join public.profiles pr on pr.id = p.user_id where pr.email like '%@seed.captioned.nyc') as seed_posts,
  (select count(*) from public.captions c join public.profiles pr on pr.id = c.user_id where pr.email like '%@seed.captioned.nyc') as seed_captions,
  (select count(*) from public.votes v join public.profiles pr on pr.id = v.user_id where pr.email like '%@seed.captioned.nyc') as seed_votes;
