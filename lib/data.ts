import "server-only";
import type { SupabaseServer } from "@/lib/supabase/server";

export type Profile = {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  created_at: string;
  is_superadmin: boolean;
};

export type Post = {
  id: string;
  user_id: string;
  image_url: string | null;
  context: string | null;
  vibe: string | null;
  theme: string | null;
  created_at: string;
};

export type Caption = {
  id: string;
  post_id: string;
  user_id: string;
  text: string;
  model: string;
  position: number;
  vibe: string | null;
  created_at: string;
};

export type Vote = {
  id: string;
  caption_id: string;
  user_id: string;
  value: 1 | -1;
  created_at: string;
};

export const PROFILE_COLS = "id, email, first_name, last_name, avatar_url, bio, created_at, is_superadmin";
export const POST_COLS = "id, user_id, image_url, context, vibe, theme, created_at";
// captions.prompt is not selectable through the API (week 5); see admin_caption_prompt().
export const CAPTION_COLS = "id, post_id, user_id, text, model, position, vibe, created_at";
export const VOTE_COLS = "id, caption_id, user_id, value, created_at";

const PAGE = 1000; // PostgREST's default max rows per request

/** Reads a whole table in pages of 1000 (fine at class-project scale). */
export async function fetchAll<T>(
  supabase: SupabaseServer,
  table: string,
  columns: string
): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from(table)
      .select(columns)
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`${table}: ${error.message}`);
    out.push(...((data ?? []) as T[]));
    if (!data || data.length < PAGE) break;
  }
  return out;
}

export async function loadEverything(supabase: SupabaseServer) {
  const [profiles, posts, captions, votes] = await Promise.all([
    fetchAll<Profile>(supabase, "profiles", PROFILE_COLS),
    fetchAll<Post>(supabase, "posts", POST_COLS),
    fetchAll<Caption>(supabase, "captions", CAPTION_COLS),
    fetchAll<Vote>(supabase, "votes", VOTE_COLS),
  ]);
  return { profiles, posts, captions, votes };
}

export type Tally = { up: number; down: number; score: number };

export function tallyVotes(votes: Vote[]): Map<string, Tally> {
  const m = new Map<string, Tally>();
  for (const v of votes) {
    const t = m.get(v.caption_id) ?? { up: 0, down: 0, score: 0 };
    if (v.value === 1) t.up++;
    else t.down++;
    t.score += v.value;
    m.set(v.caption_id, t);
  }
  return m;
}

export function displayName(p: Pick<Profile, "first_name" | "last_name" | "email"> | undefined | null) {
  if (!p) return "Unknown user";
  const name = [p.first_name, p.last_name].filter(Boolean).join(" ");
  return name || p.email || "No name yet";
}
