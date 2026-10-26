/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { CAPTION_COLS, fetchAll, POST_COLS, tallyVotes, VOTE_COLS, type Caption, type Post, type Vote } from "@/lib/data";
import { fmtDateTime } from "@/lib/time";
import { VIBES } from "@/lib/vibes";
import { ScorePill } from "@/app/components/charts";
import { VibeTag } from "@/app/components/VibeTag";
import { PageHeader } from "@/app/components/Notice";

export const metadata: Metadata = { title: "AI generated media" };
export const dynamic = "force-dynamic";

const PER_PAGE = 48;
const SORTS = { new: "Newest", best: "Best score", worst: "Worst score" } as const;
type Sort = keyof typeof SORTS;

/**
 * READ/VIEW AI generated media: every Gemini-written caption as the meme card
 * people see (its photo + the caption), with the run that produced it.
 * Hand-written admin captions are left out.
 */
export default async function MediaPage({ searchParams }: PageProps<"/media">) {
  const sp = await searchParams;
  const get = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");
  const vibe = get("vibe");
  const model = get("model");
  const sort: Sort = get("sort") in SORTS ? (get("sort") as Sort) : "new";
  const page = Math.max(1, Number(get("page")) || 1);

  const { supabase } = await requireAdmin();
  const [captions, posts, votes, runs] = await Promise.all([
    fetchAll<Caption>(supabase, "captions", CAPTION_COLS),
    fetchAll<Post>(supabase, "posts", POST_COLS),
    fetchAll<Vote>(supabase, "votes", VOTE_COLS),
    // week-7 column, read on its own so the gallery works before the SQL runs
    supabase.from("captions").select("id, generation_request_id").not("generation_request_id", "is", null).limit(10000),
  ]);
  const postById = new Map(posts.map((p) => [p.id, p]));
  const tallies = tallyVotes(votes);
  const runOf = new Map(((runs.data ?? []) as { id: string; generation_request_id: string }[]).map((r) => [r.id, r.generation_request_id]));

  const ai = captions.filter((c) => !c.model.startsWith("admin ("));
  const models = [...new Set(ai.map((c) => c.model))].sort();
  const rows = ai
    .map((c) => ({ ...c, post: postById.get(c.post_id), t: tallies.get(c.id) ?? { up: 0, down: 0, score: 0 } }))
    .filter((c) => !vibe || (c.vibe ?? c.post?.vibe) === vibe)
    .filter((c) => !model || c.model === model)
    .sort((a, b) =>
      sort === "best" ? b.t.score - a.t.score : sort === "worst" ? a.t.score - b.t.score : b.created_at.localeCompare(a.created_at)
    );
  const pages = Math.max(1, Math.ceil(rows.length / PER_PAGE));
  const shown = rows.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const withPhoto = ai.filter((c) => postById.get(c.post_id)?.image_url).length;

  const link = (p: number) => {
    const u = new URLSearchParams();
    if (vibe) u.set("vibe", vibe);
    if (model) u.set("model", model);
    if (sort !== "new") u.set("sort", sort);
    if (p > 1) u.set("page", String(p));
    const s = u.toString();
    return s ? `/media?${s}` : "/media";
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="AI generated media"
        intro={`${ai.length} Gemini-written captions, ${withPhoto} of them on a photo. Each card is one meme as the feed shows it. Open a card for its votes, or follow “run” to the generation request.`}
      />

      <form className="panel flex flex-wrap items-end gap-3 p-4">
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
          <label className="label" htmlFor="model">
            Model
          </label>
          <select id="model" name="model" defaultValue={model} className="field">
            <option value="">All models</option>
            {models.map((m) => (
              <option key={m} value={m}>
                {m}
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
        <button className="btn btn-ghost">Apply</button>
        <p className="ml-auto text-sm text-muted">{rows.length} cards</p>
      </form>

      {shown.length === 0 ? (
        <p className="panel p-6 text-sm text-muted">Nothing matches.</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {shown.map((c) => {
            const run = runOf.get(c.id);
            return (
              <li key={c.id} className="panel flex flex-col overflow-hidden">
                <Link href={`/captions/${c.id}`} className="block">
                  {c.post?.image_url ? (
                    <img src={c.post.image_url} alt={c.post.context ?? "Post photo"} loading="lazy" className="aspect-[4/3] w-full object-cover" />
                  ) : (
                    <div className="flex aspect-[4/3] w-full items-center justify-center bg-sign p-5 text-center text-[15px] font-semibold text-white">
                      {c.post?.context ?? "Text post"}
                    </div>
                  )}
                  <p className="px-4 pt-3 text-[15px] font-semibold leading-snug">{c.text}</p>
                </Link>
                <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1.5 px-4 pb-3 pt-2.5 text-[12px] text-muted">
                  <VibeTag vibe={c.vibe ?? c.post?.vibe ?? null} size={16} />
                  <ScorePill up={c.t.up} down={c.t.down} />
                  <span className="font-mono">{c.model}</span>
                  <span>{fmtDateTime(c.created_at)}</span>
                  {run && (
                    <Link href={`/requests/${run}`} className="font-medium text-ink hover:underline">
                      run →
                    </Link>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {pages > 1 && (
        <div className="flex items-center justify-between text-sm">
          {page > 1 ? <Link href={link(page - 1)}>← Previous</Link> : <span />}
          <span className="text-muted">
            Page {page} of {pages}
          </span>
          {page < pages ? <Link href={link(page + 1)}>Next →</Link> : <span />}
        </div>
      )}
    </div>
  );
}
