/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { CAPTION_COLS, fetchAll, POST_COLS, tallyVotes, VOTE_COLS, type Caption, type Post, type Vote } from "@/lib/data";
import { fmtDateTime } from "@/lib/time";
import { VIBES } from "@/lib/vibes";
import { ScorePill } from "@/app/components/charts";
import { VibeTag } from "@/app/components/VibeTag";

export const metadata: Metadata = { title: "Captions" };
export const dynamic = "force-dynamic";

const SORTS = { new: "Newest", best: "Best score", worst: "Worst score", votes: "Most votes" } as const;
type Sort = keyof typeof SORTS;
const PER_PAGE = 40;

const MESSAGES: Record<string, string> = {
  created: "Caption created.",
  deleted: "Caption deleted, along with its votes.",
};

export default async function CaptionsPage({ searchParams }: PageProps<"/captions">) {
  const { supabase } = await requireAdmin();
  const sp = await searchParams;
  const get = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");
  const q = get("q").trim();
  const vibe = get("vibe");
  const postId = get("post");
  const sort: Sort = get("sort") in SORTS ? (get("sort") as Sort) : "new";
  const page = Math.max(1, Number(get("page")) || 1);
  const msg = MESSAGES[get("msg")];

  const [captions, posts, votes] = await Promise.all([
    fetchAll<Caption>(supabase, "captions", CAPTION_COLS),
    fetchAll<Post>(supabase, "posts", POST_COLS),
    fetchAll<Vote>(supabase, "votes", VOTE_COLS),
  ]);
  const tallies = tallyVotes(votes);
  const postById = new Map(posts.map((p) => [p.id, p]));

  const rows = captions
    .map((c) => ({ ...c, post: postById.get(c.post_id), t: tallies.get(c.id) ?? { up: 0, down: 0, score: 0 } }))
    .filter((c) => !q || c.text.toLowerCase().includes(q.toLowerCase()) || (c.post?.context ?? "").toLowerCase().includes(q.toLowerCase()))
    .filter((c) => !vibe || (c.vibe ?? c.post?.vibe) === vibe)
    .filter((c) => !postId || c.post_id === postId)
    .sort((a, b) => {
      if (sort === "best") return b.t.score - a.t.score || b.t.up - a.t.up;
      if (sort === "worst") return a.t.score - b.t.score || b.t.down - a.t.down;
      if (sort === "votes") return b.t.up + b.t.down - (a.t.up + a.t.down);
      return b.created_at.localeCompare(a.created_at);
    });

  const pages = Math.max(1, Math.ceil(rows.length / PER_PAGE));
  const shown = rows.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const link = (p: number) => {
    const u = new URLSearchParams();
    if (q) u.set("q", q);
    if (vibe) u.set("vibe", vibe);
    if (postId) u.set("post", postId);
    if (sort !== "new") u.set("sort", sort);
    if (p > 1) u.set("page", String(p));
    const s = u.toString();
    return s ? `/captions?${s}` : "/captions";
  };
  const filterPost = postId ? postById.get(postId) : undefined;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight">AI captions</h1>
          <p className="mt-1 text-sm text-muted">
            {captions.length} captions on {posts.length} posts. Create, read, edit or delete any of them.
          </p>
        </div>
        <Link href={postId ? `/captions/new?post=${postId}` : "/captions/new"} className="btn btn-primary">
          + New caption
        </Link>
      </div>

      {msg && (
        <p role="status" className="rounded-lg border border-go/30 bg-go/10 px-4 py-2.5 text-sm">
          {msg}
        </p>
      )}

      <form className="panel flex flex-wrap items-end gap-3 p-4" role="search">
        <div className="min-w-48 flex-1">
          <label className="label" htmlFor="q">
            Search
          </label>
          <input id="q" name="q" defaultValue={q} placeholder="Caption or post text" className="field" />
        </div>
        <div>
          <label className="label" htmlFor="vibe">
            Voice
          </label>
          <select id="vibe" name="vibe" defaultValue={vibe} className="field">
            <option value="">All voices</option>
            {Object.entries(VIBES).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="sort">
            Sort
          </label>
          <select id="sort" name="sort" defaultValue={sort} className="field">
            {Object.entries(SORTS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
        {postId && <input type="hidden" name="post" value={postId} />}
        <button className="btn btn-ghost">Apply</button>
        {(q || vibe || postId || sort !== "new") && (
          <Link href="/captions" className="btn text-muted hover:text-ink">
            Clear
          </Link>
        )}
      </form>

      {filterPost && (
        <p className="text-sm text-muted">
          Showing captions for one post: <span className="text-ink">&ldquo;{filterPost.context ?? "photo only"}&rdquo;</span>
        </p>
      )}

      <div className="panel overflow-x-auto">
        <table className="tbl min-w-[880px]">
          <thead>
            <tr>
              <th>Caption</th>
              <th>Post</th>
              <th>Voice</th>
              <th>Model</th>
              <th>Score</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((c) => (
              <tr key={c.id} className="hover:bg-paper/60">
                <td className="max-w-md">
                  <Link href={`/captions/${c.id}`} className="font-medium hover:underline">
                    {c.text}
                  </Link>
                </td>
                <td className="max-w-56">
                  <Link href={`/captions?post=${c.post_id}`} className="flex items-center gap-2 text-[13px] text-muted hover:text-ink" title="Show all captions for this post">
                    {c.post?.image_url ? (
                      <img src={c.post.image_url} alt="" className="h-9 w-9 shrink-0 rounded-md border object-cover" />
                    ) : (
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-paper text-[10px]">txt</span>
                    )}
                    <span className="line-clamp-2">{c.post?.context ?? "(photo only)"}</span>
                  </Link>
                </td>
                <td>
                  <VibeTag vibe={c.vibe ?? c.post?.vibe ?? null} />
                </td>
                <td className="font-mono text-[12px] text-muted">{c.model}</td>
                <td>
                  <ScorePill up={c.t.up} down={c.t.down} />
                </td>
                <td className="num whitespace-nowrap text-[13px] text-muted">{fmtDateTime(c.created_at)}</td>
              </tr>
            ))}
            {shown.length === 0 && (
              <tr>
                <td colSpan={6} className="py-10 text-center text-muted">
                  No captions match.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <nav aria-label="Pages" className="flex items-center justify-between text-sm">
          {page > 1 ? <Link href={link(page - 1)} className="btn btn-ghost">← Previous</Link> : <span />}
          <span className="text-muted">
            Page {page} of {pages} · {rows.length} captions
          </span>
          {page < pages ? <Link href={link(page + 1)} className="btn btn-ghost">Next →</Link> : <span />}
        </nav>
      )}
    </div>
  );
}
