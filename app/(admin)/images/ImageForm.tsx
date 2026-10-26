"use client";

/* eslint-disable @next/next/no-img-element */
import { useActionState, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { resizeImage } from "@/lib/resize-image";
import type { ImageState } from "./actions";

const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_BYTES = 8 * 1024 * 1024; // the photos bucket's limit

/**
 * Upload (create) or edit (update, optionally replacing the file) a photo.
 * The file goes straight from the browser to the photos bucket, into
 * <adminId>/…, which storage RLS allows; the server action then saves the post.
 */
export default function ImageForm({
  action,
  adminId,
  record,
}: {
  action: (prev: ImageState, fd: FormData) => Promise<ImageState>;
  adminId: string;
  record?: { id: string; image_url: string | null; context: string | null; theme: string | null };
}) {
  const [state, formAction, saving] = useActionState<ImageState, FormData>(action, null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [path, setPath] = useState("");
  const [url, setUrl] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  async function upload(original: File) {
    setUploadError(null);
    if (!original.type.startsWith("image/") && !/\.(heic|heif)$/i.test(original.name)) {
      setUploadError("That file isn't an image.");
      return;
    }
    setUploading(true);
    try {
      const file = await resizeImage(original);
      if (!ALLOWED.includes(file.type)) throw new Error("This format can't be read here. Use a JPG, PNG or WebP.");
      if (file.size > MAX_BYTES) throw new Error("Still over 8 MB after resizing. Pick a smaller image.");
      const supabase = createClient();
      const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : file.type === "image/gif" ? "gif" : "jpg";
      const p = `${adminId}/admin-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from("photos").upload(p, file, { contentType: file.type, upsert: false });
      if (error) throw error;
      const { data } = supabase.storage.from("photos").getPublicUrl(p);
      setPath(p);
      setUrl(data.publicUrl);
      setPreview((old) => {
        if (old) URL.revokeObjectURL(old);
        return URL.createObjectURL(file);
      });
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed. Try again.");
      setPath("");
      setUrl("");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  const shown = preview ?? record?.image_url ?? null;
  const canSave = !saving && !uploading && (record ? true : !!path);

  return (
    <form action={formAction} className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
      {record && <input type="hidden" name="id" value={record.id} />}
      <input type="hidden" name="image_path" value={path} />
      <input type="hidden" name="image_url" value={url} />

      <div>
        <input
          ref={inputRef}
          id="image-file"
          type="file"
          accept="image/*"
          className="sr-only"
          disabled={uploading || saving}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) upload(f);
          }}
        />
        <label
          htmlFor="image-file"
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            const f = e.dataTransfer.files?.[0];
            if (f) upload(f);
          }}
          className={`flex aspect-[4/3] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-dashed bg-paper text-center transition-colors has-[:focus-visible]:outline-2 ${
            dragging ? "border-lineA bg-lineA/5" : "hover:border-ink/40"
          } ${uploading ? "pointer-events-none opacity-60" : ""}`}
        >
          {shown ? (
            <img src={shown} alt="Selected" className="h-full w-full object-cover" />
          ) : (
            <span className="px-6">
              <span className="block text-[15px] font-medium">{uploading ? "Uploading…" : "Choose or drop an image"}</span>
              <span className="mt-1 block text-[13px] text-muted">JPG, PNG, WebP or GIF. Large photos are resized to 1600 px.</span>
            </span>
          )}
        </label>
        <p className="mt-2 text-[13px] text-muted">
          {uploading
            ? "Uploading…"
            : path
              ? record
                ? "New file uploaded. Save to swap it in (the old file is deleted)."
                : "Uploaded. Add a description and save."
              : record
                ? "Click or drop to replace the photo."
                : ""}
        </p>
        {uploadError && (
          <p role="alert" className="mt-1 text-sm text-stop">
            {uploadError}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-4">
        <div>
          <label className="label" htmlFor="context">
            Description <span className="font-normal">(shown with the photo, and given to Gemini)</span>
          </label>
          <textarea
            id="context"
            name="context"
            rows={3}
            maxLength={200}
            defaultValue={record?.context ?? ""}
            placeholder="Rat carrying a bagel down the 116 St stairs"
            className="field"
          />
        </div>
        <div>
          <label className="label" htmlFor="theme">
            Daily theme <span className="font-normal">(optional)</span>
          </label>
          <input id="theme" name="theme" maxLength={120} defaultValue={record?.theme ?? ""} className="field" />
        </div>
        <div className="mt-auto flex flex-wrap items-center justify-end gap-3">
          {state?.error && (
            <p role="alert" className="mr-auto text-sm text-stop">
              {state.error}
            </p>
          )}
          {state?.ok && (
            <p role="status" className="mr-auto text-sm text-go">
              {state.ok}
            </p>
          )}
          <button className="btn btn-primary" disabled={!canSave}>
            {saving ? "Saving…" : record ? "Save changes" : "Upload image"}
          </button>
        </div>
      </div>
    </form>
  );
}
