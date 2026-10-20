"use client";

import { useActionState } from "react";
import { updateCaption, type FormState } from "../actions";

export default function EditCaptionForm({
  caption,
  vibes,
}: {
  caption: { id: string; text: string; vibe: string | null; model: string; position: number };
  vibes: { key: string; label: string }[];
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(updateCaption, null);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="id" value={caption.id} />
      <div>
        <label className="label" htmlFor="text">
          Caption text
        </label>
        <textarea id="text" name="text" rows={3} maxLength={300} defaultValue={caption.text} required className="field" />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label className="label" htmlFor="vibe">
            Voice
          </label>
          <select id="vibe" name="vibe" defaultValue={caption.vibe ?? ""} className="field" required>
            {!caption.vibe && <option value="">Pick one</option>}
            {vibes.map((v) => (
              <option key={v.key} value={v.key}>
                {v.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="model">
            Model
          </label>
          <input id="model" name="model" defaultValue={caption.model} className="field font-mono" required />
        </div>
        <div>
          <label className="label" htmlFor="position">
            Position on post
          </label>
          <input id="position" name="position" type="number" min={0} max={50} defaultValue={caption.position} className="field" />
        </div>
      </div>
      <div className="flex items-center justify-end gap-3">
        {state?.error && (
          <p role="alert" className="text-sm text-stop">
            {state.error}
          </p>
        )}
        {state?.ok && (
          <p role="status" className="text-sm text-go">
            {state.ok}
          </p>
        )}
        <button className="btn btn-primary" disabled={pending}>
          {pending ? "Saving…" : "Save changes"}
        </button>
      </div>
    </form>
  );
}
