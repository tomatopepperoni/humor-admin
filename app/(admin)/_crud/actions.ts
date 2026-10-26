"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { RESOURCES, isResourceKey, type Field, type Resource, type ResourceKey } from "@/lib/crud";

export type CrudState = { error?: string; values?: Record<string, string>; at?: number } | null;

type Parsed = { ok: true; row: Record<string, unknown> } | { ok: false; error: string };

function parseField(f: Field, fd: FormData): { value?: unknown; error?: string } {
  if (f.kind === "bool") return { value: fd.get(f.name) === "on" };

  const raw = fd.get(f.name);
  let text = typeof raw === "string" ? raw.trim() : "";
  if (f.stripAt) text = text.replace(/^@+/, "");
  if (f.lowercase) text = text.toLowerCase();

  if (!text) {
    if (f.required) return { error: `${f.label} is required.` };
    return { value: null };
  }
  if (f.maxLength && text.length > f.maxLength) return { error: `${f.label}: keep it under ${f.maxLength} characters.` };

  if (f.kind === "number" || f.numeric) {
    const n = Number(text);
    if (!Number.isFinite(n)) return { error: `${f.label} must be a number.` };
    if (f.min !== undefined && n < f.min) return { error: `${f.label} must be at least ${f.min}.` };
    if (f.max !== undefined && n > f.max) return { error: `${f.label} must be at most ${f.max}.` };
    return { value: n };
  }
  if (f.kind === "select" && Array.isArray(f.options) && !f.options.some((o) => o.value === text)) {
    return { error: `Pick a valid ${f.label.toLowerCase()}.` };
  }
  return { value: text };
}

function parse(res: Resource, fd: FormData): Parsed {
  const row: Record<string, unknown> = {};
  for (const f of res.fields) {
    const { value, error } = parseField(f, fd);
    if (error) return { ok: false, error };
    row[f.name] = value;
  }
  return { ok: true, row };
}

/** Postgres error → message an admin can act on. */
function friendly(res: Resource, err: { code?: string; message: string }) {
  if (err.code === "23505") return res.errors?.unique ?? `That ${res.singular} already exists.`;
  if (err.code === "23503") return res.errors?.fk ?? `Another record still points at this ${res.singular}.`;
  if (err.code === "23514") return res.errors?.check ?? `One of the values isn't allowed.`;
  if (err.code === "42501" || /row-level security/i.test(err.message)) {
    return "The database refused this. Is your account still a superadmin?";
  }
  if (err.code === "42P01" || err.code === "PGRST205") {
    return "This table doesn't exist yet. Run supabase/week7_observability.sql in the Supabase SQL editor.";
  }
  return err.message;
}

function echo(fd: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of fd.entries()) if (typeof v === "string" && !k.startsWith("$")) out[k] = v;
  return out;
}

/** CREATE (no id) or UPDATE (id) one row of a resource table. */
export async function saveRecord(key: ResourceKey, _prev: CrudState, fd: FormData): Promise<CrudState> {
  if (!isResourceKey(key)) return { error: "Unknown resource." };
  const res = RESOURCES[key];
  const { supabase } = await requireAdmin();

  const parsed = parse(res, fd);
  if (!parsed.ok) return { error: parsed.error, values: echo(fd), at: Date.now() };

  const idRaw = String(fd.get("id") ?? "");
  const id = idRaw ? Number(idRaw) : null;
  if (idRaw && !Number.isInteger(id)) return { error: "Unknown record." };

  if (id) {
    const { data, error } = await supabase.from(res.table).update(parsed.row).eq("id", id).select("id");
    if (error) return { error: friendly(res, error), values: echo(fd), at: Date.now() };
    if (!data?.length) return { error: "Nothing was updated. Is your account still a superadmin?", values: echo(fd), at: Date.now() };
  } else {
    const { error } = await supabase.from(res.table).insert(parsed.row);
    if (error) return { error: friendly(res, error), values: echo(fd), at: Date.now() };
  }

  revalidatePath(res.path);
  redirect(`${res.path}?msg=${id ? "saved" : "created"}`);
}

/** DELETE one row. Errors come back as ?err= so the table page can show them. */
export async function deleteRecord(key: ResourceKey, fd: FormData) {
  if (!isResourceKey(key)) redirect("/");
  const res = RESOURCES[key];
  const { supabase } = await requireAdmin();
  const id = Number(fd.get("id"));
  if (!Number.isInteger(id)) redirect(res.path);

  const { data, error } = await supabase.from(res.table).delete().eq("id", id).select("id");
  if (error) redirect(`${res.path}?err=${encodeURIComponent(friendly(res, error))}`);
  if (!data?.length) redirect(`${res.path}?err=${encodeURIComponent("Nothing was deleted. Is your account still a superadmin?")}`);

  revalidatePath(res.path);
  redirect(`${res.path}?msg=deleted`);
}
