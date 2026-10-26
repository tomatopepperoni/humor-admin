import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { RESOURCES, type Column, type Option, type ResourceKey } from "@/lib/crud";
import { fmtDateTime } from "@/lib/time";
import { isMissingTable, MissingSql, Notice, PageHeader } from "@/app/components/Notice";
import ConfirmButton from "./ConfirmButton";
import CrudForm from "./CrudForm";
import { deleteRecord, saveRecord } from "./actions";

type Row = Record<string, unknown> & { id: number };
type SP = Record<string, string | string[] | undefined>;

const MESSAGES: Record<string, string> = {
  created: "Added.",
  saved: "Saved.",
  deleted: "Deleted.",
};

/**
 * One page per simple resource: create/edit form on top, searchable table
 * below, edit via ?edit=<id>, delete with a confirm. `children` renders extra
 * panels between the form and the table (e.g. model usage stats).
 */
export default async function CrudPage({
  resource,
  searchParams,
  children,
  rowExtra,
  extraLabel,
}: {
  resource: ResourceKey;
  searchParams: SP;
  children?: React.ReactNode;
  /** an extra cell per row (e.g. live usage numbers) */
  rowExtra?: (row: Row) => React.ReactNode;
  extraLabel?: string;
}) {
  const res = RESOURCES[resource];
  const { supabase } = await requireAdmin();
  const get = (k: string) => (typeof searchParams[k] === "string" ? (searchParams[k] as string) : "");
  const q = get("q").trim().toLowerCase();
  const editId = Number(get("edit")) || null;

  let query = supabase.from(res.table).select("*");
  for (const o of res.order) query = query.order(o.column, { ascending: o.ascending, nullsFirst: o.ascending });
  const { data, error } = await query.limit(1000);

  if (error) {
    return (
      <div className="space-y-5">
        <PageHeader title={res.title} intro={res.intro} />
        {isMissingTable(error) ? <MissingSql what={res.title} /> : <Notice tone="error">{error.message}</Notice>}
      </div>
    );
  }
  const rows = (data ?? []) as Row[];

  // Options for selects that point at other tables.
  const options: Record<string, Option[]> = {};
  const needs = new Set(res.fields.map((f) => f.options).filter((o): o is "chains" | "providers" => typeof o === "string"));
  if (needs.has("chains")) {
    const { data: chains } = await supabase.from("prompt_chains").select("id, name, is_active").order("is_active", { ascending: false }).order("id");
    options.chains = ((chains ?? []) as { id: number; name: string; is_active: boolean }[]).map((c) => ({
      value: String(c.id),
      label: c.is_active ? c.name : `${c.name} (retired)`,
    }));
  }
  if (needs.has("providers")) {
    const { data: providers } = await supabase.from("llm_providers").select("id, name, slug").order("slug");
    options.providers = ((providers ?? []) as { id: number; name: string; slug: string }[]).map((p) => ({
      value: String(p.id),
      label: `${p.name} (${p.slug})`,
    }));
  }

  const optionLabel = (field: string, value: unknown) => {
    const f = res.fields.find((x) => x.name === field);
    if (value === null || value === undefined || value === "") return f?.emptyLabel ?? "—";
    const list = Array.isArray(f?.options) ? f.options : f?.options ? options[f.options] ?? [] : [];
    return list.find((o) => o.value === String(value))?.label ?? String(value);
  };

  const cell = (c: Column, row: Row) => {
    const v = row[c.field];
    switch (c.kind) {
      case "bool":
        return v ? <span className="font-semibold text-go">✓ yes</span> : <span className="text-muted">no</span>;
      case "date":
        return typeof v === "string" ? <span className="whitespace-nowrap text-muted">{fmtDateTime(v)}</span> : "—";
      case "option":
        return optionLabel(c.field, v);
      case "mono":
        return <span className="break-all font-mono text-[12.5px]">{v === null || v === undefined || v === "" ? "—" : String(v)}</span>;
      case "number":
        return <span className="num">{v === null || v === undefined ? "—" : String(v)}</span>;
      case "long":
        return <span className="line-clamp-3 max-w-md">{v === null || v === undefined ? "—" : String(v)}</span>;
      default:
        return v === null || v === undefined || v === "" ? "—" : String(v);
    }
  };

  const shown = q
    ? rows.filter((r) => res.search.some((k) => String(r[k] ?? "").toLowerCase().includes(q)))
    : rows;
  const editing = editId ? rows.find((r) => r.id === editId) ?? null : null;
  const msg = MESSAGES[get("msg")];
  const err = get("err");
  const save = saveRecord.bind(null, resource);
  const remove = deleteRecord.bind(null, resource);

  return (
    <div className="space-y-5">
      <PageHeader title={res.title} intro={res.intro} />

      {msg && <Notice>{msg}</Notice>}
      {err && <Notice tone="error">{err}</Notice>}

      <section className={`panel p-5 ${editing ? "ring-2 ring-metro" : ""}`} id="form">
        <h2 className="panel-title">{editing ? `Edit ${res.singular}` : `Add a ${res.singular}`}</h2>
        <div className="mt-4">
          <CrudForm
            key={editing ? `edit-${editing.id}` : "create"}
            action={save}
            fields={res.fields}
            options={options}
            record={editing as never}
            singular={res.singular}
            cancelHref={res.path}
          />
        </div>
      </section>

      {children}

      <section className="panel overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
          <p className="text-sm text-muted">
            {q ? `${shown.length} of ${rows.length}` : rows.length} {rows.length === 1 ? res.singular : `${res.singular}s`}
          </p>
          <form role="search" className="flex items-center gap-2">
            <label htmlFor="q" className="sr-only">
              Search
            </label>
            <input id="q" name="q" defaultValue={get("q")} placeholder="Search" className="field w-56 py-1.5" />
            {q && (
              <Link href={res.path} className="text-sm text-muted hover:text-ink">
                Clear
              </Link>
            )}
          </form>
        </div>
        {shown.length === 0 ? (
          <p className="p-6 text-sm text-muted">{q ? "Nothing matches that search." : `No ${res.singular}s yet. Add one above.`}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead>
                <tr>
                  {res.columns.map((c) => (
                    <th key={c.field} scope="col">
                      {c.label}
                    </th>
                  ))}
                  {rowExtra && <th scope="col">{extraLabel}</th>}
                  <th scope="col" className="text-right">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {shown.map((row) => (
                  <tr key={row.id} className={editing?.id === row.id ? "bg-metro/10" : undefined}>
                    {res.columns.map((c) => (
                      <td key={c.field} className={c.className}>
                        {cell(c, row)}
                      </td>
                    ))}
                    {rowExtra && <td>{rowExtra(row)}</td>}
                    <td className="whitespace-nowrap text-right">
                      <Link href={`${res.path}?edit=${row.id}#form`} className="mr-4 text-[13px] font-medium hover:underline">
                        Edit
                      </Link>
                      <form action={remove} className="inline">
                        <input type="hidden" name="id" value={row.id} />
                        <ConfirmButton message={`Delete this ${res.singular}? This can't be undone.`}>Delete</ConfirmButton>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
