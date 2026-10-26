"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { Field, Option } from "@/lib/crud";
import type { CrudState } from "./actions";

type Values = Record<string, string | number | boolean | null>;

/** Create / edit form for one resource row. Fields come from lib/crud.ts. */
export default function CrudForm({
  action,
  fields,
  options,
  record,
  singular,
  cancelHref,
}: {
  action: (prev: CrudState, fd: FormData) => Promise<CrudState>;
  fields: Field[];
  /** resolved options for selects that load from a table */
  options: Record<string, Option[]>;
  /** the row being edited; null = create */
  record: (Values & { id: number }) | null;
  singular: string;
  cancelHref: string;
}) {
  const [state, formAction, pending] = useActionState<CrudState, FormData>(action, null);

  // After a failed submit, show what was typed (React resets uncontrolled forms).
  const value = (f: Field): string | number | boolean | undefined => {
    if (state?.values) {
      if (f.kind === "bool") return state.values[f.name] === "on";
      return state.values[f.name] ?? "";
    }
    if (record) {
      const v = record[f.name];
      return v === null || v === undefined ? (f.kind === "bool" ? false : "") : v;
    }
    return f.defaultValue ?? (f.kind === "bool" ? false : "");
  };

  return (
    <form key={state?.at ?? "initial"} action={formAction} className="grid gap-4 sm:grid-cols-2">
      {record && <input type="hidden" name="id" value={record.id} />}
      {fields.map((f) => {
        const id = `f-${f.name}`;
        const span = f.half ? "" : "sm:col-span-2";
        const v = value(f);

        if (f.kind === "bool") {
          return (
            <label key={f.name} className={`flex items-center gap-2.5 text-sm ${span}`}>
              <input type="checkbox" name={f.name} defaultChecked={!!v} className="h-4 w-4 accent-ink" />
              {f.label}
            </label>
          );
        }

        const opts = Array.isArray(f.options) ? f.options : f.options ? options[f.options] ?? [] : [];
        return (
          <div key={f.name} className={span}>
            <label className="label" htmlFor={id}>
              {f.label}
              {f.required && <span className="text-stop"> *</span>}
            </label>
            {f.kind === "textarea" ? (
              <textarea
                id={id}
                name={f.name}
                rows={3}
                maxLength={f.maxLength}
                required={f.required}
                placeholder={f.placeholder}
                defaultValue={String(v ?? "")}
                className={`field ${f.mono ? "font-mono" : ""}`}
              />
            ) : f.kind === "select" ? (
              <select id={id} name={f.name} required={f.required} defaultValue={String(v ?? "")} className="field">
                {!f.required && <option value="">{f.emptyLabel ?? "None"}</option>}
                {f.required && v === "" && <option value="">Pick one</option>}
                {opts.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            ) : (
              <input
                id={id}
                name={f.name}
                type={f.kind === "number" ? "number" : "text"}
                min={f.min}
                max={f.max}
                step={f.step}
                maxLength={f.maxLength}
                required={f.required}
                placeholder={f.placeholder}
                defaultValue={String(v ?? "")}
                autoComplete="off"
                className={`field ${f.mono ? "font-mono" : ""}`}
              />
            )}
            {f.help && <p className="mt-1 text-[12px] text-muted">{f.help}</p>}
          </div>
        );
      })}

      <div className="flex flex-wrap items-center justify-end gap-3 sm:col-span-2">
        {state?.error && (
          <p role="alert" className="mr-auto text-sm text-stop">
            {state.error}
          </p>
        )}
        {record && (
          <Link href={cancelHref} className="btn btn-ghost">
            Cancel
          </Link>
        )}
        <button className="btn btn-primary" disabled={pending}>
          {pending ? "Saving…" : record ? "Save changes" : `Add ${singular}`}
        </button>
      </div>
    </form>
  );
}
