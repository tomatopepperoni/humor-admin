import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { fmtDateTime } from "@/lib/time";
import { VIBES, VIBE_KEYS } from "@/lib/vibes";
import NewCaptionForm from "./NewCaptionForm";

export const metadata: Metadata = { title: "New caption" };
export const dynamic = "force-dynamic";
// Gemini can take ~50 s when it's overloaded (see lib/gemini.ts).
export const maxDuration = 60;

export default async function NewCaptionPage({ searchParams }: PageProps<"/captions/new">) {
  const { supabase } = await requireAdmin();
  const sp = await searchParams;
  const initialPost = typeof sp.post === "string" ? sp.post : "";

  const { data: postsData } = await supabase
    .from("posts")
    .select("id, image_url, context, vibe, created_at")
    .order("created_at", { ascending: false })
    .limit(200);
  const posts = (postsData ?? []) as { id: string; image_url: string | null; context: string | null; vibe: string | null; created_at: string }[];

  const ids = posts.map((p) => p.id);
  const { data: capData } = ids.length
    ? await supabase.from("captions").select("post_id, text, position").in("post_id", ids).order("position")
    : { data: [] };
  const caps = (capData ?? []) as { post_id: string; text: string }[];

  const options = posts.map((p) => {
    const ctx = p.context ? (p.context.length > 60 ? p.context.slice(0, 57) + "…" : p.context) : "Photo only";
    return {
      id: p.id,
      label: `${fmtDateTime(p.created_at)} — ${ctx}`,
      image_url: p.image_url,
      context: p.context,
      vibe: p.vibe,
      captions: caps.filter((c) => c.post_id === p.id).map((c) => c.text),
    };
  });

  return (
    <div className="space-y-5">
      <div>
        <Link href="/captions" className="text-sm text-muted hover:text-ink">
          ← All captions
        </Link>
        <h1 className="mt-2 text-[26px] font-bold tracking-tight">New caption</h1>
        <p className="mt-1 text-sm text-muted">Add AI-generated (or hand-written) captions to any post.</p>
      </div>
      <NewCaptionForm
        posts={options}
        vibes={VIBE_KEYS.map((k) => ({ key: k, label: VIBES[k].label, blurb: VIBES[k].blurb }))}
        initialPost={initialPost}
        geminiReady={!!process.env.GEMINI_API_KEY}
      />
    </div>
  );
}
