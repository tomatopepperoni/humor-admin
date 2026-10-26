import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { daysAgoIso, fetchSince, fmtMs, OUTCOME_LABEL, pct, RESPONSE_COLS, type LlmResponse } from "@/lib/observability";
import { fmtDateTime } from "@/lib/time";
import { isMissingTable, MissingSql, Notice, PageHeader } from "@/app/components/Notice";

export const metadata: Metadata = { title: "LLM responses" };
export const dynamic = "force-dynamic";

const PERIODS = { "1": "24 hours", "7": "7 days", "30": "30 days", all: "All time" } as const;
type Period = keyof typeof PERIODS;
const PER_PAGE = 100;

/** READ llm_responses: every single model call, newest first. */
export default async function ResponsesPage({ searchParams }: PageProps<"/responses">) {
  const sp = await searchParams;
  const get = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");
  const period: Period = get("days") in PERIODS ? (get("days") as Period) : "7";
  const model = get("model");
  const outcome = get("outcome");
  const page = Math.max(1, Number(get("page")) || 1);

  const { supabase } = await requireAdmin();
  const { rows: all, error } = await fetchSince<LlmResponse>(
    supabase,
    "llm_responses",
    RESPONSE_COLS,
    period === "all" ? null : daysAgoIso(Number(period))
  );
  if (error) {
    return (
      <div className="space-y-5">
        <PageHeader title="LLM responses" />
        {isMissingTable(error) ? <MissingSql what="Generation logging" /> : <Notice tone="error">{error.message}</Notice>}
      </div>
    );
  }

  const rows = all.filter((r) => !model || r.model === model).filter((r) => !outcome || r.outcome === outcome);
  const okCount = rows.filter((r) => r.outcome === "ok").length;
  const pages = Math.max(1, Math.ceil(rows.length / PER_PAGE));
  const shown = rows.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const models = [...new Set(all.map((r) => r.model))].sort();

  const link = (patch: Record<string, string | null>) => {
    const u = new URLSearchParams();
    const cur: Record<string, string> = { days: period === "7" ? "" : period, model, outcome, page: "" };
    for (const [k, v] of Object.entries({ ...cur, ...patch })) if (v) u.set(k, v);
    const s = u.toString();
    return s ? `/responses?${s}` : "/responses";
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="LLM responses"
        intro="Every call to a model: status, latency, tokens and finish reason. Open one to see the raw answer and the run it belonged to."
      >
        <div className="flex gap-1 rounded-full border bg-card p-1 text-sm">
          {(Object.keys(PERIODS) as Period[]).map((p) => (
            <Link
              key={p}
              href={link({ days: p === "7" ? "" : p })}
              className={`rounded-full px-3 py-1 ${p === period ? "bg-ink text-white" : "hover:bg-paper"}`}
            >
              {PERIODS[p]}
            </Link>
          ))}
        </div>
      </PageHeader>

      <form className="panel flex flex-wrap items-end gap-3 p-4">
        {period !== "7" && <input type="hidden" name="days" value={period} />}
        <div>
          <label className="label" htmlFor="model">
            Model
          </label>
          <select id="model" name="model" defaultValue={model} className="field">
            <option value="">All models</option>
            {models.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="outcome">
            Outcome
          </label>
          <select id="outcome" name="outcome" defaultValue={outcome} className="field">
            <option value="">Any</option>
            {Object.entries(OUTCOME_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
        <button className="btn btn-ghost">Filter</button>
        {(model || outcome) && (
          <Link href={link({ model: null, outcome: null })} className="text-sm text-muted hover:text-ink">
            Clear
          </Link>
        )}
        <p className="ml-auto text-sm text-muted">
          {rows.length} calls · {pct(okCount, rows.length)} OK
        </p>
      </form>

      <section className="panel overflow-hidden">
        {shown.length === 0 ? (
          <p className="p-6 text-sm text-muted">
            No model calls logged{model || outcome ? " that match" : " in this period"}. Calls are recorded from the first caption
            run after the week 7 update.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead>
                <tr>
                  <th scope="col">When</th>
                  <th scope="col">Model</th>
                  <th scope="col">Outcome</th>
                  <th scope="col">HTTP</th>
                  <th scope="col">Latency</th>
                  <th scope="col">Finish</th>
                  <th scope="col">Tokens (thinking)</th>
                  <th scope="col">Call</th>
                  <th scope="col">Error</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((r) => (
                  <tr key={r.id}>
                    <td className="whitespace-nowrap">
                      <Link href={`/requests/${r.request_id}#attempt-${r.attempt}`} className="font-medium hover:underline">
                        {fmtDateTime(r.created_at)}
                      </Link>
                    </td>
                    <td className="font-mono text-[12px]">{r.model}</td>
                    <td className={`whitespace-nowrap text-[13px] font-semibold ${r.outcome === "ok" ? "text-go" : "text-stop"}`}>
                      {OUTCOME_LABEL[r.outcome]}
                    </td>
                    <td className="num">{r.http_status ?? "—"}</td>
                    <td className="num whitespace-nowrap">{fmtMs(r.latency_ms)}</td>
                    <td className="text-[12px]">{r.finish_reason ?? "—"}</td>
                    <td className="num">
                      {r.total_tokens ?? "—"}
                      {r.thinking_tokens ? <span className="text-muted"> ({r.thinking_tokens})</span> : null}
                    </td>
                    <td className="num text-[13px]">
                      #{r.attempt}
                      {r.round > 1 && <span className="text-muted"> · r{r.round}</span>}
                    </td>
                    <td className="max-w-xs truncate text-[12px] text-muted" title={r.error ?? undefined}>
                      {r.error ?? ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {pages > 1 && (
          <div className="flex items-center justify-between border-t px-4 py-3 text-sm">
            {page > 1 ? <Link href={link({ page: String(page - 1) })}>← Newer</Link> : <span />}
            <span className="text-muted">
              Page {page} of {pages}
            </span>
            {page < pages ? <Link href={link({ page: String(page + 1) })}>Older →</Link> : <span />}
          </div>
        )}
      </section>
    </div>
  );
}
