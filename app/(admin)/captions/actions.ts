"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { tidyCaption } from "@/lib/caption-text";
import { GeminiError, generateText, parseCaptionList } from "@/lib/gemini";
import { buildPrompt } from "@/lib/prompt";
import { isVibe, type Vibe } from "@/lib/vibes";

export type FormState = { error?: string; ok?: string } | null;

const UUID = /^[0-9a-f-]{36}$/i;

function str(fd: FormData, key: string) {
  const v = fd.get(key);
  return typeof v === "string" ? v.trim() : "";
}

async function loadPost(supabase: Awaited<ReturnType<typeof requireAdmin>>["supabase"], postId: string) {
  if (!UUID.test(postId)) return null;
  const { data } = await supabase
    .from("posts")
    .select("id, image_url, context, theme, vibe")
    .eq("id", postId)
    .maybeSingle<{ id: string; image_url: string | null; context: string | null; theme: string | null; vibe: string | null }>();
  return data;
}

async function nextPosition(supabase: Awaited<ReturnType<typeof requireAdmin>>["supabase"], postId: string) {
  const { data } = await supabase.from("captions").select("position, text").eq("post_id", postId);
  const rows = (data ?? []) as { position: number; text: string }[];
  return { next: rows.reduce((m, r) => Math.max(m, r.position + 1), 0), existing: rows.map((r) => r.text) };
}

function done(postId: string) {
  revalidatePath("/captions");
  revalidatePath("/");
  redirect(`/captions?post=${postId}&msg=created`);
}

/** CREATE (by hand): an admin-written caption on an existing post. */
export async function createCaption(_: FormState, fd: FormData): Promise<FormState> {
  const { supabase, user } = await requireAdmin();
  const postId = str(fd, "post_id");
  const vibe = str(fd, "vibe");
  const text = tidyCaption(str(fd, "text"));

  if (!text) return { error: "Write the caption first." };
  if (text.length > 300) return { error: "Keep it under 300 characters." };
  if (!isVibe(vibe)) return { error: "Pick a voice." };
  const post = await loadPost(supabase, postId);
  if (!post) return { error: "Pick a post." };

  const { next } = await nextPosition(supabase, post.id);
  const { error } = await supabase.from("captions").insert({
    post_id: post.id,
    user_id: user.id,
    text,
    vibe,
    model: "admin (hand-written)",
    prompt: `Written by hand in the admin area by ${user.email ?? user.id}.`,
    position: next,
  });
  if (error) return { error: error.message };
  done(post.id);
  return null;
}

/** CREATE (AI): ask Gemini for 1–3 new captions on an existing post. */
export async function generateCaptions(_: FormState, fd: FormData): Promise<FormState> {
  const { supabase, user } = await requireAdmin();
  const postId = str(fd, "post_id");
  const vibe = str(fd, "vibe");
  const count = Math.min(3, Math.max(1, Number(str(fd, "count")) || 3));

  if (!isVibe(vibe)) return { error: "Pick a voice." };
  const post = await loadPost(supabase, postId);
  if (!post) return { error: "Pick a post." };

  let image: { mimeType: string; base64: string } | undefined;
  // Only fetch our own storage bucket (image_url is user-supplied data).
  const photoPrefix = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/photos/`;
  if (post.image_url?.startsWith(photoPrefix)) {
    try {
      const res = await fetch(post.image_url, { signal: AbortSignal.timeout(10_000) });
      if (res.ok) {
        const mimeType = res.headers.get("content-type")?.split(";")[0] || "image/jpeg";
        image = { mimeType, base64: Buffer.from(await res.arrayBuffer()).toString("base64") };
      }
    } catch {
      /* fall back to text-only */
    }
  }

  const { next, existing } = await nextPosition(supabase, post.id);
  const prompt = buildPrompt({
    vibe: vibe as Vibe,
    count,
    context: post.context,
    hasImage: !!image,
    theme: post.theme,
    avoid: existing,
  });

  let captions: string[];
  let model: string;
  try {
    const out = await generateText(prompt, image, (t) => parseCaptionList(t, count));
    captions = out.value;
    model = out.model;
  } catch (err) {
    return { error: err instanceof GeminiError ? err.message : "Gemini is unavailable right now." };
  }

  const { error } = await supabase.from("captions").insert(
    captions.map((text, i) => ({
      post_id: post.id,
      user_id: user.id,
      text,
      vibe,
      model,
      prompt,
      position: next + i,
    }))
  );
  if (error) return { error: error.message };
  done(post.id);
  return null;
}

/** UPDATE: text, voice, model label, position. The prompt and post never change. */
export async function updateCaption(_: FormState, fd: FormData): Promise<FormState> {
  const { supabase } = await requireAdmin();
  const id = str(fd, "id");
  const text = tidyCaption(str(fd, "text"));
  const vibe = str(fd, "vibe");
  const model = str(fd, "model");
  const position = Number(str(fd, "position"));

  if (!UUID.test(id)) return { error: "Unknown caption." };
  if (!text) return { error: "Caption text can't be empty." };
  if (text.length > 300) return { error: "Keep it under 300 characters." };
  if (!isVibe(vibe)) return { error: "Pick a voice." };
  if (!model) return { error: "Model can't be empty." };
  if (!Number.isInteger(position) || position < 0 || position > 50) return { error: "Position must be 0–50." };

  const { data, error } = await supabase
    .from("captions")
    .update({ text, vibe, model, position })
    .eq("id", id)
    .select("id");
  if (error) return { error: error.message };
  if (!data?.length) return { error: "Nothing was updated. Is your account still a superadmin?" };

  revalidatePath(`/captions/${id}`);
  revalidatePath("/captions");
  revalidatePath("/");
  return { ok: "Saved." };
}

/** DELETE: removes the caption; its votes go with it (on delete cascade). */
export async function deleteCaption(fd: FormData) {
  const { supabase } = await requireAdmin();
  const id = str(fd, "id");
  if (!UUID.test(id)) redirect("/captions?error=unknown");

  const { data, error } = await supabase.from("captions").delete().eq("id", id).select("id");
  if (error || !data?.length) redirect(`/captions/${id}?error=delete`);

  revalidatePath("/captions");
  revalidatePath("/");
  redirect("/captions?msg=deleted");
}
