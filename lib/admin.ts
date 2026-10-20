import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type AdminProfile = {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
};

/**
 * Second lock after proxy.ts: every admin page and every server action calls
 * this. Server actions are plain POST endpoints, so they must not rely on the
 * page that rendered the form having been checked.
 */
export async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, first_name, last_name, avatar_url, is_superadmin")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.is_superadmin !== true) redirect("/denied");

  return { supabase, user, profile: profile as AdminProfile };
}
