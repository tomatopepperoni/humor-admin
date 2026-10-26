/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { CAPTION_COLS, displayName, POST_COLS, type Caption, type Post, type Profile, type Vote, VOTE_COLS } from "@/lib/data";
import { fmtDateTime } from "@/lib/time";
import { VIBES } from "@/lib/vibes";
import { Avatar } from "@/app/components/Avatar";
import { ScorePill } from "@/app/components/charts";
import { VibeTag } from "@/app/components/VibeTag";
import { deleteCaption, promoteToExample } from "../actions";
import EditCaptionForm from "./EditCaptionForm";

export const metadata: Metadata = { title: "Caption" };
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f-]{36}$/i;

export default async function CaptionPage({ params, searchParams }: PageProps<"/captions/[id]">) {
  const { id } = await params;
  const sp = await searchParams;
  if (!UUID.test(id)) notFound();
  const { supabase } = await requireAdmin();

  const { data: caption } = await supabase.from("captions").select(CAPTION_COLS).eq("id", id).maybeSingle<Caption>();
  if (!caption) notFound();

  const [{ data: post }, { data: votesData }, { data: prompt }, { data: siblingsData }] = await Promise.all([
    supabase.from("posts").select(POST_COLS).eq("id", caption.post_id).maybeSingle<Post>(),
    supabase.from("votes").select(VOTE_COLS).eq("caption_id", id).order("created_at", { ascending: false }),
    supabase.rpc("admin_caption_prompt", { caption_id: id }),
    supabase.from("captions").select("id, text, position").eq("post_id", caption.post_id).neq("id", id).order("position"),
  ]);
  // Week 7 columns/tables, read separately so this page still works before the SQL runs.
  const [{ data: runRow }, { data: exampleRow }] = await Promise.all([
    supabase.from("captions").select("generation_request_id").eq("id", id).maybeSingle<{ generation_request_id: string | null }>(),
    supabase.from("generation_examples").select("id").eq("source_caption_id", id).maybeSingle<{ id: number }>(),
  ]);
  const requestId = runRow?.generation_request_id ?? null;
  const votes = (votesData ?? []) as Vote[];
  const siblings = (siblingsData ?? []) as { id: string; text: string }[];

  const people = [...new Set([...votes.map((v) => v.user_id), caption.user_id, post?.user_id].filter(Boolean))] as string[];
  const { data: profData } = await supabase.from("profiles").select("id, first_name, last_name, email, avatar_url").in("id", people);
  const profiles = new Map(((profData ?? []) as Profile[]).map((p) => [p.id, p]));

  const up = votes.filter((v) => v.value === 1).length;
  const down = votes.length - up;
  const poster = post ? profiles.get(post.user_id) : undefined;
  const creator = profiles.get(caption.user_id);

  return (
    <div className="space-y-6">
      <Link href="/captions" className="text-sm text-muted hover:text-ink">
        ← All captions
      </Link>

      {sp.error === "delete" && (
        <p role="alert" className="rounded-lg border border-stop/30 bg-stop/10 px-4 py-2.5 text-sm">
          Couldn&apos;t delete this caption. Check that your account is still a superadmin.
        </p>
      )}

      {sp.msg === "promoted" && (
        <p role="status" className="rounded-lg border border-go/30 bg-go/10 px-4 py-2.5 text-sm">
          Added to the few-shot examples. The caption app now shows it to Gemini as a tone reference for this voice.{" "}
          <Link href="/examples" className="font-medium underline">
            See examples
          </Link>
        </p>
      )}
      {sp.error === "promote" && (
        <p role="alert" className="rounded-lg border border-stop/30 bg-stop/10 px-4 py-2.5 text-sm">
          Couldn&apos;t add this caption as an example. Has the week 7 SQL been run?
        </p>
      )}

      <section className="panel p-6">
        <p className="text-[22px] font-semibold leading-snug tracking-tight">&ldquo;{caption.text}&rdquo;</p>
        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted">
          <ScorePill up={up} down={down} />
          <VibeTag vibe={caption.vibe ?? post?.vibe ?? null} />
          <span className="font-mono text-[12px]">{caption.model}</span>
          <span>Position {caption.position + 1}</span>
          <span>{fmtDateTime(caption.created_at)}</span>
          <span>Created by {displayName(creator)}</span>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
        <div className="space-y-6">
          <section className="panel p-5">
            <h2 className="panel-title">Edit</h2>
            <p className="panel-sub">The post and the original prompt stay as they were.</p>
            <div className="mt-4">
              <EditCaptionForm
                caption={caption}
                vibes={Object.entries(VIBES).map(([k, v]) => ({ key: k, label: v.label }))}
              />
            </div>
          </section>

          <section className="panel p-5">
            <h2 className="panel-title">Prompt sent to the model</h2>
            <p className="panel-sub">Hidden from the public API; readable here through admin_caption_prompt().</p>
            <pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap rounded-lg bg-paper p-3 font-mono text-[12px] leading-relaxed">
              {typeof prompt === "string" ? prompt : "(not available)"}
            </pre>
          </section>

          <section className="rounded-xl border border-stop/40 bg-card p-5">
            <h2 className="panel-title text-stop">Delete</h2>
            <p className="panel-sub">
              Removes the caption and its {votes.length} vote{votes.length === 1 ? "" : "s"}. Can&apos;t be undone.
            </p>
            <details className="mt-3">
              <summary className="btn btn-ghost cursor-pointer list-none">Delete this caption…</summary>
              <form action={deleteCaption} className="mt-3 flex items-center gap-3">
                <input type="hidden" name="id" value={caption.id} />
                <button className="btn btn-danger">Yes, delete it</button>
                <span className="text-[13px] text-muted">Last check.</span>
              </form>
            </details>
          </section>
        </div>

        <div className="space-y-6">
          {post && (
            <section className="panel p-5">
              <h2 className="panel-title">Post</h2>
              {post.image_url && <img src={post.image_url} alt="" className="mt-3 max-h-72 w-full rounded-lg border object-cover" />}
              <p className="mt-3 text-sm">{post.context ?? <span className="text-muted">(photo only)</span>}</p>
              <div className="mt-2 flex items-center gap-2 text-[13px] text-muted">
                <Avatar url={poster?.avatar_url ?? null} name={displayName(poster)} size={20} />
                <Link href={`/users/${post.user_id}`} className="hover:underline">
                  {displayName(poster)}
                </Link>
                · {fmtDateTime(post.created_at)}
              </div>
              {siblings.length > 0 && (
                <>
                  <p className="mt-4 text-[12px] font-medium uppercase tracking-wide text-muted">Other captions on this post</p>
                  <ul className="mt-1.5 space-y-1 text-[13px]">
                    {siblings.map((s) => (
                      <li key={s.id}>
                        <Link href={`/captions/${s.id}`} className="hover:underline">
                          {s.text}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </>
              )}
              <Link href={`/captions/new?post=${post.id}`} className="btn btn-ghost mt-4">
                + Add caption to this post
              </Link>
            </section>
          )}

          <section className="panel p-5">
            <h2 className="panel-title">Generation</h2>
            <p className="panel-sub">
              {requestId
                ? "The run that wrote this caption: prompt, every model call, latency and tokens."
                : "No run logged: written by hand, or before week 7 logging."}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {requestId && (
                <Link href={`/requests/${requestId}`} className="btn btn-ghost">
                  Open the run →
                </Link>
              )}
              {exampleRow ? (
                <Link href={`/examples?edit=${exampleRow.id}`} className="btn btn-ghost">
                  ✓ Few-shot example
                </Link>
              ) : (
                <form action={promoteToExample}>
                  <input type="hidden" name="id" value={caption.id} />
                  <button className="btn btn-ghost">Use as few-shot example</button>
                </form>
              )}
            </div>
          </section>

          <section className="panel p-5">
            <h2 className="panel-title">Votes</h2>
            <p className="panel-sub">
              {up} up, {down} down.
            </p>
            {votes.length ? (
              <ul className="mt-3 divide-y text-sm">
                {votes.map((v) => {
                  const p = profiles.get(v.user_id);
                  return (
                    <li key={v.id} className="flex items-center gap-2.5 py-2">
                      <span className={`font-semibold ${v.value === 1 ? "text-go" : "text-hold"}`}>{v.value === 1 ? "▲ up" : "▼ down"}</span>
                      <Link href={`/users/${v.user_id}`} className="min-w-0 flex-1 truncate hover:underline">
                        {displayName(p)}
                      </Link>
                      <span className="shrink-0 text-[12px] text-muted">{fmtDateTime(v.created_at)}</span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-muted">No votes yet.</p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
