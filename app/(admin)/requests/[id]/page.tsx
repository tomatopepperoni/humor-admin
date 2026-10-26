/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { CAPTION_COLS, displayName, POST_COLS, type Caption, type Post, type Profile } from "@/lib/data";
import { fmtMs, KIND_LABEL, OUTCOME_LABEL, REQUEST_COLS, type GenerationRequest, type LlmResponse } from "@/lib/observability";
import { fmtDateTime } from "@/lib/time";
import { VibeTag } from "@/app/components/VibeTag";
import { StatusBadge } from "@/app/components/Notice";

export const metadata: Metadata = { title: "Generation request" };
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f-]{36}$/i;

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[12px] text-muted">{label}</dt>
      <dd className="mt-0.5 text-sm">{children}</dd>
    </div>
  );
}

/** One generation request: what was asked, every model call, what came out. */
export default async function RequestPage({ params }: PageProps<"/requests/[id]">) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const { supabase } = await requireAdmin();

  const { data: req } = await supabase
    .from("generation_requests")
    .select(`${REQUEST_COLS}, prompt`)
    .eq("id", id)
    .maybeSingle<GenerationRequest & { prompt: string | null }>();
  if (!req) notFound();

  const [{ data: respData }, { data: capData }, { data: post }, { data: who }] = await Promise.all([
    supabase.from("llm_responses").select("*").eq("request_id", id).order("attempt"),
    supabase.from("captions").select(CAPTION_COLS).eq("generation_request_id", id).order("position"),
    req.post_id ? supabase.from("posts").select(POST_COLS).eq("id", req.post_id).maybeSingle<Post>() : Promise.resolve({ data: null }),
    req.user_id
      ? supabase.from("profiles").select("id, first_name, last_name, email, avatar_url").eq("id", req.user_id).maybeSingle<Profile>()
      : Promise.resolve({ data: null }),
  ]);
  const responses = (respData ?? []) as LlmResponse[];
  const captions = (capData ?? []) as Caption[];
  const t0 = new Date(req.started_at).getTime();

  return (
    <div className="space-y-6">
      <Link href="/requests" className="text-sm text-muted hover:text-ink">
        ← All generation requests
      </Link>

      <section className="panel p-6">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-[22px] font-bold tracking-tight">
            {KIND_LABEL[req.kind]} · {fmtDateTime(req.created_at)}
          </h1>
          <StatusBadge status={req.status} />
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <Fact label="Who">
            {req.user_id ? (
              <Link href={`/users/${req.user_id}`} className="hover:underline">
                {displayName(who)}
              </Link>
            ) : (
              "—"
            )}
          </Fact>
          <Fact label="Voice">
            {req.chain_id ? (
              <Link href={`/chains/${req.chain_id}`} className="hover:underline">
                <VibeTag vibe={req.vibe} />
              </Link>
            ) : (
              <VibeTag vibe={req.vibe} />
            )}
          </Fact>
          <Fact label="Answered by">
            <span className="font-mono text-[12.5px]">{req.model ?? "nobody"}</span>
          </Fact>
          <Fact label="Duration">{fmtMs(req.duration_ms)}</Fact>
          <Fact label="Model calls">{req.kind === "backfill" ? "not logged" : req.attempt_count}</Fact>
          <Fact label="Prompt from">
            {req.config_source === "database" ? "Prompt chain (DB)" : req.config_source === "code" ? "Built-in fallback" : "—"}
          </Fact>
          <Fact label="App">{req.app === "admin" ? "Admin area" : "Caption app"}</Fact>
          <Fact label="Photo">{req.has_image ? "Yes" : "No"}</Fact>
          <Fact label="Captions saved">{req.caption_count}</Fact>
          <Fact label="Post">
            {req.post_id ? (
              post ? (
                <Link href={`/captions?post=${req.post_id}`} className="hover:underline">
                  Open captions
                </Link>
              ) : (
                <span className="text-muted">deleted</span>
              )
            ) : req.status === "failed" ? (
              "none (the run failed)"
            ) : (
              "—"
            )}
          </Fact>
          <Fact label="Request id">
            <span className="break-all font-mono text-[11px]">{req.id}</span>
          </Fact>
        </dl>
        {req.error && (
          <p role="alert" className="mt-4 rounded-lg border border-stop/30 bg-stop/10 px-4 py-2.5 text-sm">
            {req.error}
          </p>
        )}
        {req.kind === "backfill" && (
          <p className="mt-4 text-[13px] text-muted">
            Written before week 7 logging existed: rebuilt from the saved captions, so there are no model calls or timing.
          </p>
        )}
      </section>

      <div className="grid gap-6 xl:grid-cols-[3fr_2fr]">
        <div className="space-y-6">
          <section className="panel overflow-hidden">
            <div className="border-b px-5 py-3">
              <h2 className="panel-title">Model calls</h2>
              <p className="panel-sub">In order. A failed or unusable answer moves on to the next model.</p>
            </div>
            {responses.length === 0 ? (
              <p className="p-5 text-sm text-muted">No calls logged.</p>
            ) : (
              <ol className="divide-y">
                {responses.map((r) => (
                  <li key={r.id} id={`attempt-${r.attempt}`} className="px-5 py-4">
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                      <span className="num text-muted">#{r.attempt}</span>
                      <span className="font-mono text-[13px] font-medium">{r.model}</span>
                      <span className={`text-[13px] font-semibold ${r.outcome === "ok" ? "text-go" : "text-stop"}`}>
                        {OUTCOME_LABEL[r.outcome]}
                        {r.http_status ? ` · ${r.http_status}` : ""}
                      </span>
                      <span className="num text-[13px]">{fmtMs(r.latency_ms)}</span>
                      <span className="num text-[12px] text-muted">
                        +{fmtMs(new Date(r.created_at).getTime() - t0)} · round {r.round}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-4 text-[12px] text-muted">
                      {r.finish_reason && <span>finish: {r.finish_reason}</span>}
                      {r.prompt_tokens != null && <span>prompt {r.prompt_tokens}</span>}
                      {r.output_tokens != null && <span>output {r.output_tokens}</span>}
                      {r.thinking_tokens != null && <span>thinking {r.thinking_tokens}</span>}
                      {r.total_tokens != null && <span>total {r.total_tokens}</span>}
                    </div>
                    {r.error && <p className="mt-2 text-[13px] text-stop">{r.error}</p>}
                    {r.raw_text && (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-[13px] font-medium">Raw answer</summary>
                        <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-paper p-3 font-mono text-[12px]">
                          {r.raw_text}
                        </pre>
                      </details>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </section>

          <section className="panel p-5">
            <h2 className="panel-title">Prompt</h2>
            <p className="panel-sub">Exactly what was sent (the photo, if any, went alongside it).</p>
            <pre className="mt-3 max-h-[32rem] overflow-auto whitespace-pre-wrap break-words rounded-lg bg-paper p-3 font-mono text-[12px] leading-relaxed">
              {req.prompt ?? "(not stored)"}
            </pre>
          </section>
        </div>

        <section className="panel h-fit p-5">
          <h2 className="panel-title">What it produced</h2>
          {post?.image_url && <img src={post.image_url} alt="" className="mt-3 max-h-72 w-full rounded-lg object-cover" />}
          {post?.context && <p className="mt-3 text-sm text-muted">“{post.context}”</p>}
          {captions.length === 0 ? (
            <p className="mt-3 text-sm text-muted">{req.status === "failed" ? "Nothing: the run failed." : "Those captions were deleted."}</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {captions.map((c) => (
                <li key={c.id}>
                  <Link href={`/captions/${c.id}`} className="block rounded-lg border p-3 text-sm hover:border-ink/40">
                    {c.text}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
