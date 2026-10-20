import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { displayName, loadEverything } from "@/lib/data";
import { fmtDateTime } from "@/lib/time";
import { Avatar } from "@/app/components/Avatar";
import { Kpi, pct } from "@/app/components/charts";
import { VibeTag } from "@/app/components/VibeTag";

export const metadata: Metadata = { title: "Votes" };
export const dynamic = "force-dynamic";

const PER_PAGE = 50;

export default async function VotesPage({ searchParams }: PageProps<"/votes">) {
  const { supabase } = await requireAdmin();
  const sp = await searchParams;
  const get = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");
  const kind = get("kind") === "up" || get("kind") === "down" ? get("kind") : "";
  const q = get("q").trim().toLowerCase();
  const page = Math.max(1, Number(get("page")) || 1);

  const { profiles, posts, captions, votes } = await loadEverything(supabase);
  const profileById = new Map(profiles.map((p) => [p.id, p]));
  const captionById = new Map(captions.map((c) => [c.id, c]));
  const postById = new Map(posts.map((p) => [p.id, p]));

  const up = votes.filter((v) => v.value === 1).length;
  const voters = new Set(votes.map((v) => v.user_id)).size;
  const since = new Date(new Date().getTime() - 86_400_000).toISOString();
  const last24 = votes.filter((v) => v.created_at >= since).length;

  const rows = votes
    .map((v) => {
      const c = captionById.get(v.caption_id);
      return { ...v, voter: profileById.get(v.user_id), caption: c, post: c ? postById.get(c.post_id) : undefined };
    })
    .filter((v) => !kind || (kind === "up" ? v.value === 1 : v.value === -1))
    .filter(
      (v) =>
        !q ||
        displayName(v.voter).toLowerCase().includes(q) ||
        (v.voter?.email ?? "").toLowerCase().includes(q) ||
        (v.caption?.text ?? "").toLowerCase().includes(q)
    )
    .sort((a, b) => b.created_at.localeCompare(a.created_at));

  const pages = Math.max(1, Math.ceil(rows.length / PER_PAGE));
  const shown = rows.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const link = (p: number) => {
    const u = new URLSearchParams();
    if (kind) u.set("kind", kind);
    if (q) u.set("q", q);
    if (p > 1) u.set("page", String(p));
    const s = u.toString();
    return s ? `/votes?${s}` : "/votes";
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[26px] font-bold tracking-tight">Votes</h1>
        <p className="mt-1 text-sm text-muted">Read-only. Every upvote and downvote, newest first.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="Total votes" value={votes.length.toLocaleString()} />
        <Kpi label="Upvotes" value={up.toLocaleString()} sub={pct(votes.length ? up / votes.length : null)} />
        <Kpi label="Downvotes" value={(votes.length - up).toLocaleString()} sub={pct(votes.length ? (votes.length - up) / votes.length : null)} />
        <Kpi label="Last 24 hours" value={last24.toLocaleString()} sub={`${voters} different voters all-time`} />
      </div>

      <form className="panel flex flex-wrap items-end gap-3 p-4" role="search">
        <div className="min-w-48 flex-1">
          <label className="label" htmlFor="q">
            Search
          </label>
          <input id="q" name="q" defaultValue={q} placeholder="Voter name, email or caption text" className="field" />
        </div>
        <div>
          <label className="label" htmlFor="kind">
            Type
          </label>
          <select id="kind" name="kind" defaultValue={kind} className="field">
            <option value="">Up and down</option>
            <option value="up">Upvotes only</option>
            <option value="down">Downvotes only</option>
          </select>
        </div>
        <button className="btn btn-ghost">Apply</button>
        {(q || kind) && (
          <Link href="/votes" className="btn text-muted hover:text-ink">
            Clear
          </Link>
        )}
      </form>

      <div className="panel overflow-x-auto">
        <table className="tbl min-w-[820px]">
          <thead>
            <tr>
              <th className="w-20">Vote</th>
              <th>Voter</th>
              <th>Caption</th>
              <th>Voice</th>
              <th>When</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((v) => {
              const name = displayName(v.voter);
              const own = v.caption?.user_id === v.user_id;
              return (
                <tr key={v.id} className="hover:bg-paper/60">
                  <td>
                    <span className={`num font-semibold ${v.value === 1 ? "text-go" : "text-hold"}`}>{v.value === 1 ? "▲ +1" : "▼ −1"}</span>
                  </td>
                  <td>
                    <Link href={`/users/${v.user_id}`} className="flex items-center gap-2 hover:underline">
                      <Avatar url={v.voter?.avatar_url ?? null} name={name} size={24} />
                      <span className="truncate">{name}</span>
                    </Link>
                  </td>
                  <td className="max-w-md">
                    {v.caption ? (
                      <Link href={`/captions/${v.caption_id}`} className="hover:underline">
                        {v.caption.text}
                      </Link>
                    ) : (
                      <span className="text-muted">(deleted)</span>
                    )}
                    {own && <span className="ml-2 rounded-full border px-2 py-0.5 text-[11px] text-muted">own caption</span>}
                  </td>
                  <td>
                    <VibeTag vibe={v.caption?.vibe ?? v.post?.vibe ?? null} />
                  </td>
                  <td className="num whitespace-nowrap text-[13px] text-muted">{fmtDateTime(v.created_at)}</td>
                </tr>
              );
            })}
            {shown.length === 0 && (
              <tr>
                <td colSpan={5} className="py-10 text-center text-muted">
                  No votes match.
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
            Page {page} of {pages} · {rows.length} votes
          </span>
          {page < pages ? <Link href={link(page + 1)} className="btn btn-ghost">Next →</Link> : <span />}
        </nav>
      )}
    </div>
  );
}
