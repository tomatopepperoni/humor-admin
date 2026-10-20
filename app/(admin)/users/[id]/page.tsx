/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { CAPTION_COLS, displayName, POST_COLS, PROFILE_COLS, tallyVotes, VOTE_COLS, type Caption, type Post, type Profile, type Vote } from "@/lib/data";
import { fmtDateTime } from "@/lib/time";
import { Avatar } from "@/app/components/Avatar";
import { ScorePill } from "@/app/components/charts";
import { VibeTag } from "@/app/components/VibeTag";

export const metadata: Metadata = { title: "User" };
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f-]{36}$/i;

export default async function UserPage({ params }: PageProps<"/users/[id]">) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const { supabase } = await requireAdmin();

  const { data: profile } = await supabase.from("profiles").select(PROFILE_COLS).eq("id", id).maybeSingle<Profile>();
  if (!profile) notFound();

  const [{ data: posts }, { data: captions }, { data: cast }] = await Promise.all([
    supabase.from("posts").select(POST_COLS).eq("user_id", id).order("created_at", { ascending: false }).returns<Post[]>(),
    supabase.from("captions").select(CAPTION_COLS).eq("user_id", id).returns<Caption[]>(),
    supabase.from("votes").select(VOTE_COLS).eq("user_id", id).order("created_at", { ascending: false }).limit(50).returns<Vote[]>(),
  ]);

  const captionIds = (captions ?? []).map((c) => c.id);
  const { data: received } = captionIds.length
    ? await supabase.from("votes").select(VOTE_COLS).in("caption_id", captionIds).returns<Vote[]>()
    : { data: [] as Vote[] };
  const tallies = tallyVotes(received ?? []);

  const castCaptionIds = [...new Set((cast ?? []).map((v) => v.caption_id))];
  const { data: castCaptions } = castCaptionIds.length
    ? await supabase.from("captions").select("id, text").in("id", castCaptionIds).returns<{ id: string; text: string }[]>()
    : { data: [] as { id: string; text: string }[] };
  const castText = new Map((castCaptions ?? []).map((c) => [c.id, c.text]));

  const name = displayName(profile);

  return (
    <div className="space-y-6">
      <Link href="/users" className="text-sm text-muted hover:text-ink">
        ← All users
      </Link>

      <section className="panel flex flex-wrap items-center gap-4 p-5">
        <Avatar url={profile.avatar_url} name={name} size={64} />
        <div className="min-w-0 flex-1">
          <h1 className="flex flex-wrap items-center gap-2 text-[24px] font-bold tracking-tight">
            {name}
            {profile.is_superadmin && <span className="rounded-full bg-metro px-2 py-0.5 text-[12px] font-semibold text-ink">superadmin</span>}
          </h1>
          <p className="text-sm text-muted">{profile.email}</p>
          {profile.bio && <p className="mt-2 text-sm">{profile.bio}</p>}
        </div>
        <dl className="grid grid-cols-3 gap-6 text-center">
          <div>
            <dt className="text-[12px] text-muted">Posts</dt>
            <dd className="num text-xl font-bold">{posts?.length ?? 0}</dd>
          </div>
          <div>
            <dt className="text-[12px] text-muted">Votes cast</dt>
            <dd className="num text-xl font-bold">{cast?.length === 50 ? "50+" : cast?.length ?? 0}</dd>
          </div>
          <div>
            <dt className="text-[12px] text-muted">Joined</dt>
            <dd className="text-sm font-medium">{fmtDateTime(profile.created_at)}</dd>
          </div>
        </dl>
        <p className="w-full font-mono text-[12px] text-muted">id {profile.id}</p>
      </section>

      <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
        <section className="panel p-5">
          <h2 className="panel-title">Posts and their captions</h2>
          {posts?.length ? (
            <ul className="mt-4 space-y-5">
              {posts.map((p) => (
                <li key={p.id} className="flex gap-4">
                  {p.image_url ? (
                    <img src={p.image_url} alt="" className="h-20 w-20 shrink-0 rounded-lg border object-cover" />
                  ) : (
                    <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg bg-paper text-[11px] text-muted">text only</div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm">{p.context ?? <span className="text-muted">(no text)</span>}</p>
                    <p className="mt-0.5 text-[12px] text-muted">{fmtDateTime(p.created_at)}</p>
                    <ul className="mt-2 space-y-1.5">
                      {(captions ?? [])
                        .filter((c) => c.post_id === p.id)
                        .sort((a, b) => a.position - b.position)
                        .map((c) => {
                          const t = tallies.get(c.id) ?? { up: 0, down: 0 };
                          return (
                            <li key={c.id} className="flex items-start justify-between gap-3 text-[13px]">
                              <Link href={`/captions/${c.id}`} className="hover:underline">
                                {c.text}
                              </Link>
                              <ScorePill up={t.up} down={t.down} />
                            </li>
                          );
                        })}
                    </ul>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-muted">No posts.</p>
          )}
        </section>

        <section className="panel p-5">
          <h2 className="panel-title">Recent votes</h2>
          <p className="panel-sub">Last 50.</p>
          {cast?.length ? (
            <ul className="mt-4 divide-y text-[13px]">
              {cast.map((v) => (
                <li key={v.id} className="flex items-start gap-2.5 py-2">
                  <span className={`mt-0.5 font-semibold ${v.value === 1 ? "text-go" : "text-hold"}`} aria-label={v.value === 1 ? "Upvote" : "Downvote"}>
                    {v.value === 1 ? "▲" : "▼"}
                  </span>
                  <Link href={`/captions/${v.caption_id}`} className="min-w-0 flex-1 hover:underline">
                    {castText.get(v.caption_id) ?? "(deleted caption)"}
                  </Link>
                  <span className="shrink-0 text-muted">{fmtDateTime(v.created_at)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-muted">No votes.</p>
          )}
        </section>
      </div>

      {(captions ?? []).some((c) => c.vibe) && (
        <p className="text-[12px] text-muted">
          Voices used: {[...new Set((captions ?? []).map((c) => c.vibe).filter(Boolean))].map((v) => <span key={v} className="mr-3 inline-block"><VibeTag vibe={v} size={14} /></span>)}
        </p>
      )}
    </div>
  );
}
