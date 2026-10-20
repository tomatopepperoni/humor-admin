import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Supabase client for Server Components, Server Actions and Route Handlers.
 * Uses the anon key + the signed-in admin's session cookie. Every admin
 * permission comes from RLS policies that check profiles.is_superadmin
 * (supabase/week6_admin.sql), not from a service-role key.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Component: cookies are read-only here; proxy.ts refreshes them.
          }
        },
      },
    }
  );
}

export type SupabaseServer = Awaited<ReturnType<typeof createClient>>;
