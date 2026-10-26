import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { displayName, type Profile } from "@/lib/data";
import { fmtDateTime } from "@/lib/time";
import { Notice } from "@/app/components/Notice";
import ConfirmButton from "../../_crud/ConfirmButton";
import ImageForm from "../ImageForm";
import { deleteImage, updateImage } from "../actions";

export const metadata: Metadata = { title: "Image" };
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f-]{36}$/i;

/** READ / UPDATE (replace file, edit text) / DELETE one image. */
export default async function ImagePage({ params, searchParams }: PageProps<"/images/[id]">) {
  const { id } = await params;
  const sp = await searchParams;
  if (!UUID.test(id)) notFound();
  const { supabase, user } = await requireAdmin();

  const { data: post } = await supabase
    .from("posts")
    .select("id, user_id, image_url, image_path, context, theme, vibe, created_at")
    .eq("id", id)
    .maybeSingle<{
      id: string;
      user_id: string;
      image_url: string | null;
      image_path: string | null;
      context: string | null;
      theme: string | null;
      vibe: string;
      created_at: string;
    }>();
  if (!post) notFound();

  const [{ data: capData }, { data: owner }] = await Promise.all([
    supabase.from("captions").select("id, text, model").eq("post_id", id).order("position"),
    supabase.from("profiles").select("id, first_name, last_name, email").eq("id", post.user_id).maybeSingle<Profile>(),
  ]);
  const captions = (capData ?? []) as { id: string; text: string; model: string }[];

  return (
    <div className="space-y-6">
      <Link href="/images" className="text-sm text-muted hover:text-ink">
        ← All images
      </Link>
      {sp.msg === "created" && <Notice>Image uploaded. Generate captions for it below.</Notice>}
      {sp.error === "delete" && <Notice tone="error">Couldn&apos;t delete this image. Is your account still a superadmin?</Notice>}

      <section className="panel p-5">
        <h1 className="text-[22px] font-bold tracking-tight">Image</h1>
        <p className="mt-1 text-sm text-muted">
          Posted by{" "}
          <Link href={`/users/${post.user_id}`} className="hover:underline">
            {displayName(owner)}
          </Link>{" "}
          · {fmtDateTime(post.created_at)}
          {post.image_path && (
            <>
              {" "}
              · <code className="font-mono text-[12px]">photos/{post.image_path}</code>
            </>
          )}
        </p>
        <div className="mt-5">
          <ImageForm action={updateImage} adminId={user.id} record={post} />
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <section className="panel p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="panel-title">Captions on this image ({captions.length})</h2>
            <Link href={`/captions/new?post=${post.id}`} className="btn btn-ghost">
              + Generate or write captions
            </Link>
          </div>
          {captions.length === 0 ? (
            <p className="mt-3 text-sm text-muted">None yet.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {captions.map((c) => (
                <li key={c.id}>
                  <Link href={`/captions/${c.id}`} className="flex items-start justify-between gap-3 rounded-lg border p-3 text-sm hover:border-ink/40">
                    <span>{c.text}</span>
                    <span className="shrink-0 font-mono text-[11px] text-muted">{c.model}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="h-fit rounded-xl border border-stop/40 bg-card p-5">
          <h2 className="panel-title text-stop">Delete</h2>
          <p className="panel-sub">
            Removes the photo file and the post, with its {captions.length} caption{captions.length === 1 ? "" : "s"} and their votes.
            Can&apos;t be undone.
          </p>
          <form action={deleteImage} className="mt-4">
            <input type="hidden" name="id" value={post.id} />
            <ConfirmButton message="Delete this image, its captions and their votes?" className="btn btn-danger">
              Delete image
            </ConfirmButton>
          </form>
        </section>
      </div>
    </div>
  );
}
