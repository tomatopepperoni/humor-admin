# Captioned NYC — Control Center (admin area, weeks 6–7)

Admin area for the [Captioned NYC](https://humor-hello-world-ten.vercel.app) caption-rating app
(repo `humor-hello-world`). Same Supabase project (`humor-joke`), separate Next.js app and Vercel project.

## What it does

| Route | What | Data access |
|---|---|---|
| `/` | Dashboard: KPIs, 30-day ridership, rush-hour heatmap, which subway voice is funniest, first-card bias, model report card, photo vs text, caption length, hall of fame / most divisive / worst, voter personalities, sign-in → regular funnel | read |
| `/users`, `/users/[id]` | Every profile with posts, captions, votes cast/received; per-user posts and vote history | **READ** profiles |
| `/captions` | Search, filter by voice, sort by score, paginate | **READ** captions |
| `/captions/new` | Generate 1–3 new captions with Gemini (same prompt as the main app, avoids existing ones), or write one by hand | **CREATE** |
| `/captions/[id]` | Edit text / voice / model / position, see the stored prompt, see who voted, delete | **UPDATE / DELETE** |
| `/votes` | Every vote with voter, caption, voice; filter up/down | **READ** votes |

## Week 7 – More observability

The admin area now runs the caption pipeline, not just the content. One idea ties the pages together:
**the campus's votes feed back into the next captions, and every generation is traceable.**

| Route | What | Assignment item |
|---|---|---|
| `/users` | (week 6) | read users |
| `/chains`, `/chains/[id]` | One chain per subway voice; its ordered steps, which are conditional, and a live preview of the prompt Gemini gets today | read prompt chains, read prompt chain steps |
| `/mix` | Which voices the picker offers + their “Surprise me” weight, next to what people actually picked | read/update prompt chain mix |
| `/terms` | NYC / subway / campus vocabulary put into every prompt | CRUD terms |
| `/media` | Every Gemini-written caption as the meme card people see, filter by voice/model, linked to its run | read/view AI generated media |
| `/requests`, `/requests/[id]` | One row per caption run (either app): status, duration, model that answered, calls made. Summary: success rate, p50/p95 duration, retry rate, tokens, per-model behaviour, why calls failed. Detail: the exact prompt, a timeline of every model call with raw output, the captions it produced | read generation requests |
| `/examples` | Few-shot examples per voice. **“Use as few-shot example”** on any caption page promotes a top-voted caption | CRUD AI generation examples |
| `/models` | Models in fallback order, temperature, max tokens, with each model's last-7-day success rate and latency | CRUD llm models |
| `/providers` | Who serves the models (only the env-var name of the key is stored) | CRUD llm providers |
| `/responses` | Every single model call: outcome, HTTP status, latency, tokens (incl. thinking), finish reason | read llm responses |
| `/domains`, `/whitelist` | Who may sign up to Captioned NYC, with a live “gate on/off” status | CRUD allowed signup domains, CRUD whitelisted e-mails |
| `/images`, `/images/[id]` | Upload a photo (resized in the browser, stored in the `photos` bucket), edit its text, replace the file, delete it with its captions | CRUD images incl. upload |

These settings are not just stored: the caption app reads them on every run (through
`public.generation_config()`), so changing a term, an example, the model order or the mix changes the next
captions without a deploy. With nothing configured it falls back to the week-6 prompt, which the database
chain reproduces word for word.

Observability is written by both apps through `public.log_generation()`: `generation_requests` (one per run,
including failed ones) and `llm_responses` (one per model call, including the retries and fallbacks). Captions
point at their run via `captions.generation_request_id`. Runs from before week 7 are backfilled from the saved
captions (marked “Before week 7”, without timing).

**Setup:** run `supabase/week7_observability.sql` (in the `humor-hello-world` repo) in the Supabase SQL editor
after `week6_admin.sql`. It's safe to re-run, it seeds the tables with the values the app used to hard-code,
and every new table has RLS: superadmins only, read-only where the assignment says “read”. Normal users can't
read any of it; the caption app only goes through the three security-definer functions.

## Security: three locks

1. **`proxy.ts`** runs before every route. Not signed in → `/login` (Google only). Signed in but
   `profiles.is_superadmin` isn't `true` → `/denied`.
2. **`requireAdmin()`** (`lib/admin.ts`) runs again in the admin layout, every page and every server action
   (server actions are POST endpoints and can be called directly).
3. **Row Level Security** (`supabase/week6_admin.sql`). The app only has the anon key — no service-role key.
   The database itself only lets superadmins read all profiles/votes and write captions.
   A trigger blocks anyone from setting their own `is_superadmin` through the API.

## "Won't I lock myself out?"

The flag can't be set from the app (by design), so the first superadmin is bootstrapped from the
**Supabase SQL editor**, which runs as the database owner and bypasses RLS:

```sql
update public.profiles set is_superadmin = true where email = 'you@example.com';
```

Sign in to the main app once first so your profile row exists.

## Setup

1. Run `supabase/week6_admin.sql` in the Supabase SQL editor, then the bootstrap `update` above, then
   `supabase/week7_observability.sql` from the `humor-hello-world` repo.
2. Supabase → Authentication → URL Configuration → add redirect URLs
   `http://localhost:3000/**` and `https://*-genlarry.vercel.app/**` (or the exact Vercel domains).
3. Env vars (`.env.local` and Vercel → Settings → Environment Variables):
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `GEMINI_API_KEY`
   (optional `GEMINI_MODEL`, `NEXT_PUBLIC_MAIN_APP_URL`).
4. `npm install && npm run dev`.
5. Vercel → Settings → Deployment Protection → Vercel Authentication **off**, so the commit URL opens in
   Incognito (the Google login wall still protects every page).
