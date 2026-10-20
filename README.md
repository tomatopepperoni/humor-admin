# Captioned NYC — Control Center (Week 6 admin area)

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

1. Run `supabase/week6_admin.sql` in the Supabase SQL editor, then the bootstrap `update` above.
2. Supabase → Authentication → URL Configuration → add redirect URLs
   `http://localhost:3000/**` and `https://*-genlarry.vercel.app/**` (or the exact Vercel domains).
3. Env vars (`.env.local` and Vercel → Settings → Environment Variables):
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `GEMINI_API_KEY`
   (optional `GEMINI_MODEL`, `NEXT_PUBLIC_MAIN_APP_URL`).
4. `npm install && npm run dev`.
5. Vercel → Settings → Deployment Protection → Vercel Authentication **off**, so the commit URL opens in
   Incognito (the Google login wall still protects every page).
