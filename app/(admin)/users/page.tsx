import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { displayName, loadEverything, tallyVotes } from "@/lib/data";
import { fmtDateTime } from "@/lib/time";
import { Avatar } from "@/app/components/Avatar";

export const metadata: Metadata = { title: "Users" };
export const dynamic = "force-dynamic";

const SORTS = {
  joined: "Newest first",
  votes: "Most votes cast",
  posts: "Most posts",
  score: "Best caption score",
} as const;
type Sort = keyof typeof SORTS;

export default async function UsersPage({ searchParams }: PageProps<"/users">) {
  const { supabase } = await requireAdmin();
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.trim().toLowerCase() : "";
  const sort: Sort = typeof params.sort === "string" && params.sort in SORTS ? (params.sort as Sort) : "joined";

  const { profiles, posts, captions, votes } = await loadEverything(supabase);
  const tallies = tallyVotes(votes);

  const rows = profiles.map((p) => {
    const mine = captions.filter((c) => c.user_id === p.id);
    const cast = votes.filter((v) => v.user_id === p.id);
    const received = mine.reduce(
      (acc, c) => {
        const t = tallies.get(c.id);
        acc.up += t?.up ?? 0;
        acc.down += t?.down ?? 0;
        acc.best = Math.max(acc.best, t?.score ?? 0);
        return acc;
      },
      { up: 0, down: 0, best: 0 }
    );
    return {
      ...p,
      name: displayName(p),
      posts: posts.filter((x) => x.user_id === p.id).length,
      captions: mine.length,
      votesCast: cast.length,
      upsCast: cast.filter((v) => v.value === 1).length,
      received,
    };
  });

  const filtered = rows
    .filter((r) => !q || [r.name, r.email ?? "", r.bio ?? ""].some((s) => s.toLowerCase().includes(q)))
    .sort((a, b) => {
      if (sort === "votes") return b.votesCast - a.votesCast;
      if (sort === "posts") return b.posts - a.posts;
      if (sort === "score") return b.received.best - a.received.best;
      return b.created_at.localeCompare(a.created_at);
    });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight">Users</h1>
          <p className="mt-1 text-sm text-muted">
            Read-only. {profiles.length} profiles, {profiles.filter((p) => p.is_superadmin).length} superadmin.
            Superadmin is granted in the Supabase SQL editor only.
          </p>
        </div>
        <form className="flex flex-wrap gap-2" role="search">
          <input name="q" defaultValue={q} placeholder="Search name, email, bio" className="field w-56" aria-label="Search users" />
          <select name="sort" defaultValue={sort} className="field w-auto" aria-label="Sort">
            {Object.entries(SORTS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <button className="btn btn-ghost">Apply</button>
        </form>
      </div>

      <div className="panel overflow-x-auto">
        <table className="tbl min-w-[860px]">
          <thead>
            <tr>
              <th>User</th>
              <th>Joined</th>
              <th className="text-right">Posts</th>
              <th className="text-right">Captions</th>
              <th className="text-right">Votes cast</th>
              <th className="text-right">Votes received</th>
              <th className="text-right">Best caption</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className="hover:bg-paper/60">
                <td>
                  <Link href={`/users/${r.id}`} className="flex items-center gap-2.5">
                    <Avatar url={r.avatar_url} name={r.name} size={32} />
                    <span className="min-w-0">
                      <span className="flex items-center gap-2 font-medium hover:underline">
                        {r.name}
                        {r.is_superadmin && (
                          <span className="rounded-full bg-metro px-2 py-0.5 text-[11px] font-semibold text-ink">superadmin</span>
                        )}
                        {!(r.first_name && r.last_name) && (
                          <span className="rounded-full border px-2 py-0.5 text-[11px] text-muted">not onboarded</span>
                        )}
                      </span>
                      <span className="block truncate text-[13px] text-muted">{r.email}</span>
                    </span>
                  </Link>
                </td>
                <td className="num whitespace-nowrap text-muted">{fmtDateTime(r.created_at)}</td>
                <td className="num text-right">{r.posts}</td>
                <td className="num text-right">{r.captions}</td>
                <td className="num text-right">
                  {r.votesCast}
                  {r.votesCast > 0 && <span className="ml-1 text-[12px] text-muted">({Math.round((r.upsCast / r.votesCast) * 100)}% up)</span>}
                </td>
                <td className="num text-right whitespace-nowrap">
                  <span className="text-go">▲{r.received.up}</span> <span className="text-muted">▼{r.received.down}</span>
                </td>
                <td className="num text-right">{r.captions ? (r.received.best > 0 ? `+${r.received.best}` : r.received.best) : "—"}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="py-10 text-center text-muted">
                  No users match &ldquo;{q}&rdquo;.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
