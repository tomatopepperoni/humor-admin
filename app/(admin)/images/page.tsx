/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { displayName, fetchAll, POST_COLS, type Post, type Profile } from "@/lib/data";
import { fmtDateTime } from "@/lib/time";
import { Notice, PageHeader } from "@/app/components/Notice";
import ImageForm from "./ImageForm";
import { createImage } from "./actions";

export const metadata: Metadata = { title: "Images" };
export const dynamic = "force-dynamic";

/** CREATE (upload) / READ images. Update and delete live on each image's page. */
export default async function ImagesPage({ searchParams }: PageProps<"/images">) {
  const sp = await searchParams;
  const q = (typeof sp.q === "string" ? sp.q : "").trim().toLowerCase();
  const { supabase, user } = await requireAdmin();
  const [posts, { data: capData }] = await Promise.all([
    fetchAll<Post & { image_path?: string | null }>(supabase, "posts", POST_COLS),
    supabase.from("captions").select("post_id").limit(20000),
  ]);
  const photos = posts.filter((p) => p.image_url).sort((a, b) => b.created_at.localeCompare(a.created_at));
  const counts = new Map<string, number>();
  for (const c of (capData ?? []) as { post_id: string }[]) counts.set(c.post_id, (counts.get(c.post_id) ?? 0) + 1);

  const owners = [...new Set(photos.map((p) => p.user_id))];
  const { data: profs } = owners.length
    ? await supabase.from("profiles").select("id, first_name, last_name, email").in("id", owners)
    : { data: [] };
  const people = new Map(((profs ?? []) as Profile[]).map((p) => [p.id, p]));
  const shown = q ? photos.filter((p) => (p.context ?? "").toLowerCase().includes(q) || (p.theme ?? "").toLowerCase().includes(q)) : photos;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Images"
        intro={`${photos.length} photos in the photos bucket, each shown as a post. Upload one here, then generate captions for it from its page.`}
      />
      {sp.msg === "deleted" && <Notice>Image deleted, with its captions and votes.</Notice>}

      <section className="panel p-5">
        <h2 className="panel-title">Upload an image</h2>
        <p className="panel-sub">It becomes a post by you, with no captions until you generate or write some.</p>
        <div className="mt-4">
          <ImageForm action={createImage} adminId={user.id} />
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">{q ? `${shown.length} of ${photos.length}` : photos.length} images</p>
        <form role="search" className="flex items-center gap-2">
          <label htmlFor="q" className="sr-only">
            Search descriptions
          </label>
          <input id="q" name="q" defaultValue={q} placeholder="Search descriptions" className="field w-60 py-1.5" />
        </form>
      </div>

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
        {shown.map((p) => (
          <li key={p.id}>
            <Link href={`/images/${p.id}`} className="panel block overflow-hidden transition-colors hover:border-ink/40">
              <img src={p.image_url!} alt={p.context ?? "Post photo"} loading="lazy" className="aspect-[4/3] w-full object-cover" />
              <div className="p-3">
                <p className="line-clamp-2 text-sm font-medium">{p.context || <span className="text-muted">No description</span>}</p>
                <p className="mt-1 text-[12px] text-muted">
                  {displayName(people.get(p.user_id))} · {fmtDateTime(p.created_at)} · {counts.get(p.id) ?? 0} captions
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
