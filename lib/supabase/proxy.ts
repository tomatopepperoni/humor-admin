import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { safeNext } from "@/lib/safe-next";

/** The only routes reachable without being a superadmin. */
const PUBLIC_PATHS = ["/login", "/auth/callback"];
/** Signed in, but not a superadmin: may only see the "no access" page and sign out. */
const SIGNED_IN_PATHS = ["/denied", "/auth/signout"];

function matches(pathname: string, list: string[]) {
  return list.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

/**
 * The login wall. Runs before EVERY route (see matcher in /proxy.ts):
 *   not signed in              -> /login
 *   signed in, not superadmin  -> /denied
 *   superadmin                 -> through
 * Pages and server actions check again with requireAdmin(), and the database
 * checks a third time through RLS.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // getUser() validates the JWT with Supabase (getSession() would trust the cookie).
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const redirect = (path: string, next?: string) => {
    const url = request.nextUrl.clone();
    url.pathname = path;
    url.search = "";
    if (next && next !== "/") url.searchParams.set("next", next);
    const res = NextResponse.redirect(url);
    // keep any refreshed auth cookies
    response.cookies.getAll().forEach((c) => res.cookies.set(c));
    return res;
  };

  if (matches(pathname, PUBLIC_PATHS)) {
    if (user && pathname === "/login") {
      return redirect(safeNext(request.nextUrl.searchParams.get("next")));
    }
    return response;
  }

  if (!user) return redirect("/login", pathname);

  if (matches(pathname, SIGNED_IN_PATHS)) return response;

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_superadmin")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.is_superadmin !== true) return redirect("/denied");

  return response;
}
