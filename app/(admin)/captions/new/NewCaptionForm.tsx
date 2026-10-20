"use client";

/* eslint-disable @next/next/no-img-element */
import { useActionState, useState } from "react";
import { createCaption, generateCaptions, type FormState } from "../actions";

type PostOption = { id: string; label: string; image_url: string | null; context: string | null; vibe: string | null; captions: string[] };
type VibeOption = { key: string; label: string; blurb: string };

export default function NewCaptionForm({
  posts,
  vibes,
  initialPost,
  geminiReady,
}: {
  posts: PostOption[];
  vibes: VibeOption[];
  initialPost: string;
  geminiReady: boolean;
}) {
  const [mode, setMode] = useState<"ai" | "manual">(geminiReady ? "ai" : "manual");
  const [postId, setPostId] = useState(initialPost || posts[0]?.id || "");
  const post = posts.find((p) => p.id === postId);
  const defaultVibe = vibes.find((v) => v.key === post?.vibe)?.key ?? vibes[0]?.key;

  const [aiState, aiAction, aiPending] = useActionState<FormState, FormData>(generateCaptions, null);
  const [mState, mAction, mPending] = useActionState<FormState, FormData>(createCaption, null);
  const state = mode === "ai" ? aiState : mState;
  const pending = mode === "ai" ? aiPending : mPending;

  if (posts.length === 0) {
    return <p className="panel p-5 text-sm text-muted">There are no posts yet. Captions always belong to a post.</p>;
  }

  return (
    <form action={mode === "ai" ? aiAction : mAction} className="grid gap-6 lg:grid-cols-[2fr_3fr]">
      <section className="panel p-5">
        <label className="label" htmlFor="post_id">
          Post
        </label>
        <select id="post_id" name="post_id" value={postId} onChange={(e) => setPostId(e.target.value)} className="field">
          {posts.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
        {post && (
          <div className="mt-4">
            {post.image_url && <img src={post.image_url} alt="" className="max-h-64 w-full rounded-lg border object-cover" />}
            <p className="mt-3 text-sm">{post.context ?? <span className="text-muted">(no text — photo only)</span>}</p>
            {post.captions.length > 0 && (
              <>
                <p className="mt-4 text-[12px] font-medium uppercase tracking-wide text-muted">Existing captions</p>
                <ul className="mt-1.5 list-disc space-y-1 pl-5 text-[13px] text-muted">
                  {post.captions.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              </>
            )}
          </div>
        )}
      </section>

      <section className="panel p-5">
        <div role="tablist" aria-label="How to create" className="flex gap-1 rounded-full bg-paper p-1">
          {(
            [
              ["ai", "Generate with Gemini"],
              ["manual", "Write by hand"],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              type="button"
              role="tab"
              aria-selected={mode === k}
              onClick={() => setMode(k)}
              disabled={k === "ai" && !geminiReady}
              className={`flex-1 rounded-full px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-40 ${
                mode === k ? "bg-card shadow-sm" : "text-muted hover:text-ink"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <fieldset className="mt-5">
          <legend className="label">Voice</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {vibes.map((v) => (
              <label key={`${postId}-${v.key}`} className="flex cursor-pointer items-start gap-2 rounded-lg border p-2.5 text-sm has-[:checked]:border-ink has-[:checked]:bg-paper">
                <input type="radio" name="vibe" value={v.key} defaultChecked={v.key === defaultVibe} className="mt-1" />
                <span>
                  <span className="font-medium">{v.label}</span>
                  <span className="block text-[12px] text-muted">{v.blurb}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        {mode === "ai" ? (
          <div className="mt-5">
            <label className="label" htmlFor="count">
              How many
            </label>
            <select id="count" name="count" defaultValue="3" className="field w-28">
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="3">3</option>
            </select>
            <p className="mt-2 text-[13px] text-muted">
              Uses the same prompt as the main app, tells Gemini to avoid the existing captions, and saves the full prompt
              and model with each new row. Can take up to a minute when Gemini is busy.
            </p>
          </div>
        ) : (
          <div className="mt-5">
            <label className="label" htmlFor="text">
              Caption
            </label>
            <textarea id="text" name="text" rows={3} maxLength={300} required className="field" placeholder="This is a Butler-bound student…" />
            <p className="mt-2 text-[13px] text-muted">Saved with model “admin (hand-written)” so it stays separate in the stats.</p>
          </div>
        )}

        {state?.error && (
          <p role="alert" className="mt-4 rounded-lg border border-stop/30 bg-stop/10 px-3 py-2 text-sm">
            {state.error}
          </p>
        )}

        <div className="mt-6 flex justify-end">
          <button type="submit" disabled={pending} className="btn btn-primary">
            {pending ? (mode === "ai" ? "Asking Gemini…" : "Saving…") : mode === "ai" ? "Generate and save" : "Save caption"}
          </button>
        </div>
      </section>
    </form>
  );
}
