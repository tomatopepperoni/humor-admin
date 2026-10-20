-- Week 6: Admin area
-- Run this in the Supabase SQL editor (project: humor-joke). Safe to re-run.
--
-- What it does:
--   1. profiles.is_superadmin  – the flag the admin app checks on every request
--   2. guard trigger           – signed-in users can edit their own profile row
--                                (week-4 RLS), so without this anyone could flip
--                                their own flag and walk into the admin area
--   3. public.is_superadmin()  – used by the RLS policies below
--   4. admin RLS policies      – superadmins can READ every profile and vote,
--                                and CREATE/UPDATE/DELETE captions.
--                                Everyone else keeps exactly the week-4/5 rules.
--   5. admin_caption_prompt()  – captions.prompt is hidden from the API since
--                                week 5; superadmins can read it through this
--   6. bootstrap               – make YOURSELF the first superadmin (see bottom)
--
-- The admin app uses the anon key + the signed-in user's session, never the
-- service-role key. If the app were ever compromised, the database itself still
-- refuses anyone whose profile isn't flagged.


-- 1. the flag -----------------------------------------------------------------
alter table public.profiles
  add column if not exists is_superadmin boolean not null default false;


-- 2. nobody can promote themselves through the API ------------------------------
-- Requests from the app run as the Postgres role "anon" or "authenticated".
-- The SQL editor runs as "postgres", so the flag can only be changed here.
create or replace function public.guard_superadmin_flag()
returns trigger
language plpgsql
as $$
begin
  if current_user in ('anon', 'authenticated') then
    if tg_op = 'INSERT' then
      new.is_superadmin := false;
    elsif new.is_superadmin is distinct from old.is_superadmin then
      raise exception 'profiles.is_superadmin can only be changed from the Supabase SQL editor'
        using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists guard_superadmin_flag on public.profiles;
create trigger guard_superadmin_flag
  before insert or update on public.profiles
  for each row execute function public.guard_superadmin_flag();


-- 3. helper used by the policies ------------------------------------------------
-- security definer: reads profiles with the owner's rights, so a policy ON
-- profiles can call it without recursing into its own RLS.
create or replace function public.is_superadmin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select p.is_superadmin from public.profiles p where p.id = auth.uid()),
    false
  );
$$;

revoke execute on function public.is_superadmin() from public, anon;
grant execute on function public.is_superadmin() to authenticated;


-- 4. admin policies -------------------------------------------------------------
-- Policies are OR-ed with the existing "own row" ones, so normal users are
-- unaffected.

-- READ users/profiles
drop policy if exists "profiles: superadmin read all" on public.profiles;
create policy "profiles: superadmin read all"
  on public.profiles for select to authenticated
  using (public.is_superadmin());

-- READ upvotes/downvotes
drop policy if exists "votes: superadmin read all" on public.votes;
create policy "votes: superadmin read all"
  on public.votes for select to authenticated
  using (public.is_superadmin());

-- CREATE/READ/UPDATE/DELETE AI-generated captions (read is already public)
drop policy if exists "captions: superadmin insert" on public.captions;
create policy "captions: superadmin insert"
  on public.captions for insert to authenticated
  with check (public.is_superadmin() and user_id = auth.uid());

drop policy if exists "captions: superadmin update" on public.captions;
create policy "captions: superadmin update"
  on public.captions for update to authenticated
  using (public.is_superadmin())
  with check (public.is_superadmin());

drop policy if exists "captions: superadmin delete" on public.captions;
create policy "captions: superadmin delete"
  on public.captions for delete to authenticated
  using (public.is_superadmin());

-- Only these caption columns can be edited (the prompt and post stay as written).
revoke update on public.captions from anon, authenticated;
grant update (text, vibe, model, position) on public.captions to authenticated;


-- 5. prompts for admins -----------------------------------------------------------
create or replace function public.admin_caption_prompt(caption_id uuid)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_superadmin() then
    raise exception 'superadmins only' using errcode = '42501';
  end if;
  return (select c.prompt from public.captions c where c.id = caption_id);
end;
$$;

revoke execute on function public.admin_caption_prompt(uuid) from public, anon;
grant execute on function public.admin_caption_prompt(uuid) to authenticated;


-- 6. bootstrap: "won't I lock myself out?" ---------------------------------------
-- No. The admin app can't grant the flag (the trigger above blocks it), but the
-- SQL editor runs as the database owner and bypasses RLS and the guard. Sign in
-- to Captioned NYC once with the Google account you'll use for the admin area,
-- then run:
--
--   update public.profiles
--   set is_superadmin = true
--   where email = 'YOUR_GOOGLE_EMAIL';
--
--   select email, is_superadmin from public.profiles where is_superadmin;
