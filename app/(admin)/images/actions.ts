"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";

/**
 * Images = photos in the "photos" storage bucket and the posts that show them.
 * The browser uploads the file (storage RLS: into the admin's own folder) and
 * hands us its path; these actions create / update / delete the post row and
 * clean up files. RLS: posts insert own; update/delete need is_superadmin
 * (week7_observability.sql).
 */

export type ImageState = { error?: string; ok?: string } | null;

const UUID = /^[0-9a-f-]{36}$/i;

function str(fd: FormData, k: string) {
  const v = fd.get(k);
  return typeof v === "string" ? v.trim() : "";
}

function publicPrefix() {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/photos/`;
}

/** The uploaded file must be in the admin's folder and the URL must point at it. */
function checkUpload(userId: string, path: string, url: string) {
  if (!path || !url) return "Upload a photo first.";
  if (!path.startsWith(`${userId}/`) || path.includes("..")) return "That upload can't be used. Upload it again.";
  if (url !== publicPrefix() + path) return "That upload can't be used. Upload it again.";
  return null;
}

/** CREATE: a new photo post (no captions yet; generate them from its page). */
export async function createImage(_: ImageState, fd: FormData): Promise<ImageState> {
  const { supabase, user } = await requireAdmin();
  const path = str(fd, "image_path");
  const url = str(fd, "image_url");
  const context = str(fd, "context").slice(0, 200) || null;
  const theme = str(fd, "theme").slice(0, 120) || null;
  const bad = checkUpload(user.id, path, url);
  if (bad) return { error: bad };

  const { data, error } = await supabase
    .from("posts")
    .insert({ user_id: user.id, image_url: url, image_path: path, context, theme, vibe: "conductor" })
    .select("id")
    .single();
  if (error || !data) {
    await supabase.storage.from("photos").remove([path]);
    return { error: error?.message ?? "Could not save the photo." };
  }
  revalidatePath("/images");
  redirect(`/images/${data.id}?msg=created`);
}

/** UPDATE: the description / theme, and optionally swap the photo file. */
export async function updateImage(_: ImageState, fd: FormData): Promise<ImageState> {
  const { supabase, user } = await requireAdmin();
  const id = str(fd, "id");
  if (!UUID.test(id)) return { error: "Unknown image." };
  const context = str(fd, "context").slice(0, 200) || null;
  const theme = str(fd, "theme").slice(0, 120) || null;
  const newPath = str(fd, "image_path");
  const newUrl = str(fd, "image_url");

  const { data: post } = await supabase.from("posts").select("id, image_path, image_url").eq("id", id).maybeSingle<{
    id: string;
    image_path: string | null;
    image_url: string | null;
  }>();
  if (!post) return { error: "This image no longer exists." };

  const patch: Record<string, string | null> = { context, theme };
  if (newPath || newUrl) {
    const bad = checkUpload(user.id, newPath, newUrl);
    if (bad) return { error: bad };
    patch.image_path = newPath;
    patch.image_url = newUrl;
  }
  if (!patch.image_url && !post.image_url && !context) return { error: "A post needs a photo or a description." };

  const { data, error } = await supabase.from("posts").update(patch).eq("id", id).select("id");
  if (error) return { error: error.message };
  if (!data?.length) return { error: "Nothing was updated. Is your account still a superadmin?" };

  // The old file is no longer referenced once the new one is saved.
  if (patch.image_path && post.image_path && post.image_path !== patch.image_path) {
    await supabase.storage.from("photos").remove([post.image_path]);
  }
  revalidatePath("/images");
  revalidatePath(`/images/${id}`);
  return { ok: patch.image_path ? "Photo replaced and saved." : "Saved." };
}

/** DELETE: the post (its captions and votes cascade) and the file. */
export async function deleteImage(fd: FormData) {
  const { supabase } = await requireAdmin();
  const id = str(fd, "id");
  if (!UUID.test(id)) redirect("/images");
  const { data: post } = await supabase.from("posts").select("id, image_path").eq("id", id).maybeSingle<{ id: string; image_path: string | null }>();
  if (!post) redirect("/images");

  const { data, error } = await supabase.from("posts").delete().eq("id", id).select("id");
  if (error || !data?.length) redirect(`/images/${id}?error=delete`);
  if (post.image_path) await supabase.storage.from("photos").remove([post.image_path]);

  revalidatePath("/images");
  revalidatePath("/captions");
  revalidatePath("/media");
  redirect("/images?msg=deleted");
}
