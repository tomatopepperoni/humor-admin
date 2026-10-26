import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { displayName, type Profile } from "@/lib/data";
import {
  daysAgoIso,
  fetchSince,
  fmtMs,
  KIND_LABEL,
  OUTCOME_LABEL,
  pct,
  percentile,
  REQUEST_COLS,
  RESPONSE_COLS,
  statsByModel,
  type GenerationRequest,
  type LlmResponse,
} from "@/lib/observability";
import { fmtDateTime } from "@/lib/time";
import { VIBES } from "@/lib/vibes";
import { Kpi } from "@/app/components/charts";
import { VibeTag } from "@/app/components/VibeTag";
import { isMissingTable, MissingSql, Notice, PageHeader, StatusBadge } from "@/app/components/Notice";

export const metadata: Metadata = { title: "Generation requests" };
export const dynamic = "force-dynamic";

const PERIODS = { "1": "24 hours", "7": "7 days", "30": "30 days", all: "All time" } as const;
type Period = keyof typeof PERIODS;
const PER_PAGE = 50;

/** READ generation requests, with the numbers that tell you whether generation is healthy. */
export default async function RequestsPage({ searchParams }: PageProps<"/requests">) {
  const sp = await searchParams;
  const get = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");
  const period: Period = get("days") in PERIODS ? (get("days") as Period) : "7";
  const status = get("status");
  const kind = get("kind");
  const vibe = get("vibe");
  const model = get("model");
  const page = Math.max(1, Number(get("page")) || 1);

  const { supabase } = await requireAdmin();
  const since = period === "all" ? null : daysAgoIso(Number(period));
  const [reqs, resps] = await Promise.all([
    fetchSince<GenerationRequest>(supabase, "generation_requests", REQUEST_COLS, since),
    fetchSince<LlmResponse>(supabase, "llm_responses", RESPONSE_COLS, since),
  ]);

  if (reqs.error) {
    return (
      <div className="space-y-5">
        <PageHeader title="Generation requests" />
        {isMissingTable(reqs.error) ? <MissingSql what="Generation logging" /> : <Notice tone="error">{reqs.error.message}</Notice>}
      </div>
    );
  }

  // Health numbers use real (logged) runs only; backfilled rows have no timing.
  const live = reqs.rows.filter((r) => r.kind !== "backfill");
  const ok = live.filter((r) => r.status === "success");
  const durations = ok.map((r) => r.duration_ms ?? NaN);
  const firstModel = new Map<string, string>();
  for (const r of [...resps.rows].sort((a, b) => a.attempt - b.attempt)) {
    if (!firstModel.has(r.request_id)) firstModel.set(r.request_id, r.model);
  }
  const fellBack = ok.filter((r) => r.attempt_count > 1).length;
  const notFirstChoice = ok.filter((r) => firstModel.get(r.id) && firstModel.get(r.id) !== r.model).length;
  const tokens = resps.rows.reduce((s, r) => s + (r.total_tokens ?? 0), 0);
  const calls = resps.rows.length;
  const models = [...statsByModel(resps.rows).values()].sort((a, b) => b.calls - a.calls);
  const outcomes = new Map<string, number>();
  for (const r of resps.rows) {
    if (r.outcome === "ok") continue;
    const k = `${OUTCOME_LABEL[r.outcome]}${r.http_status && r.outcome === "http_error" ? ` ${r.http_status}` : ""}`;
    outcomes.set(k, (outcomes.get(k) ?? 0) + 1);
  }
  const failReasons = [...outcomes].sort((a, b) => b[1] - a[1]);

  // Table
  const rows = reqs.rows
    .filter((r) => !status || r.status === status)
    .filter((r) => !kind || r.kind === kind)
    .filter((r) => !vibe || r.vibe === vibe)
    .filter((r) => !model || r.model === model);
  const pages = Math.max(1, Math.ceil(rows.length / PER_PAGE));
  const shown = rows.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const userIds = [...new Set(shown.map((r) => r.user_id).filter(Boolean))] as string[];
  const { data: profs } = userIds.length
    ? await supabase.from("profiles").select("id, first_name, last_name, email").in("id", userIds)
    : { data: [] };
  const people = new Map(((profs ?? []) as Profile[]).map((p) => [p.id, p]));
  const allModels = [...new Set(reqs.rows.map((r) => r.model).filter(Boolean))].sort() as string[];

  const link = (patch: Record<string, string | null>) => {
    const u = new URLSearchParams();
    const cur: Record<string, string> = { days: period === "7" ? "" : period, status, kind, vibe, model, page: "" };
    for (const [k, v] of Object.entries({ ...cur, ...patch })) if (v) u.set(k, v);
    const s = u.toString();
    return s ? `/requests?${s}` : "/requests";
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Generation requests"
        intro="One row per caption run in either app (a new post, “write 3 more”, or an admin generating). Each run lists every model call it made in LLM responses."
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

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Kpi label="Runs" value={String(live.length)} sub={`${reqs.rows.length - live.length} older runs backfilled`} />
        <Kpi label="Success rate" value={pct(ok.length, live.length)} sub={`${live.length - ok.length} failed`} />
        <Kpi label="Duration p50" value={fmtMs(percentile(durations, 50))} sub={`p95 ${fmtMs(percentile(durations, 95))}`} />
        <Kpi label="Model calls per run" value={live.length ? (calls / live.length).toFixed(2) : "—"} sub={`${calls} calls in total`} />
        <Kpi
          label="Needed a retry"
          value={pct(fellBack, ok.length)}
          sub={`${notFirstChoice} answered by a fallback model`}
        />
        <Kpi label="Tokens" value={tokens.toLocaleString("en-US")} sub={live.length ? `${Math.round(tokens / Math.max(1, live.length)).toLocaleString("en-US")} per run` : undefined} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[2fr_1fr]">
        <section className="panel overflow-hidden">
          <div className="border-b px-4 py-3">
            <h2 className="panel-title">Models</h2>
            <p className="panel-sub">Every call, including the ones that failed and were retried on another model.</p>
          </div>
          {models.length === 0 ? (
            <p className="p-4 text-sm text-muted">No model calls logged in this period yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="tbl">
                <thead>
                  <tr>
                    <th scope="col">Model</th>
                    <th scope="col">Calls</th>
                    <th scope="col">OK</th>
                    <th scope="col">Unusable</th>
                    <th scope="col">Errors</th>
                    <th scope="col">Latency p50 / p95</th>
                    <th scope="col">Avg tokens (thinking)</th>
                  </tr>
                </thead>
                <tbody>
                  {models.map((m) => (
                    <tr key={m.model}>
                      <td className="whitespace-nowrap">
                        <Link href={`/responses?model=${encodeURIComponent(m.model)}`} className="font-mono text-[12.5px] hover:underline">
                          {m.model}
                        </Link>
                      </td>
                      <td className="num">{m.calls}</td>
                      <td className={`num ${m.ok / m.calls >= 0.8 ? "text-go" : "text-stop"}`}>{pct(m.ok, m.calls)}</td>
                      <td className="num">{m.unusable}</td>
                      <td className="num">{m.failed}</td>
                      <td className="num whitespace-nowrap">
                        {fmtMs(m.p50)} / {fmtMs(m.p95)}
                      </td>
                      <td className="num">
                        {m.avgTokens?.toLocaleString("en-US") ?? "—"}
                        {m.avgThinking ? <span className="text-muted"> ({m.avgThinking.toLocaleString("en-US")})</span> : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="panel p-4">
          <h2 className="panel-title">Why calls failed</h2>
          <p className="panel-sub">A failed call is retried; a run only fails when every model did.</p>
          {failReasons.length === 0 ? (
            <p className="mt-3 text-sm text-muted">No failed calls in this period.</p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm">
              {failReasons.map(([k, n]) => (
                <li key={k} className="flex items-center gap-2">
                  <span className="min-w-0 flex-1">{k}</span>
                  <span className="num font-semibold">{n}</span>
                  <span className="num w-10 text-right text-[12px] text-muted">{pct(n, calls)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <form className="panel flex flex-wrap items-end gap-3 p-4">
        {period !== "7" && <input type="hidden" name="days" value={period} />}
        <div>
          <label className="label" htmlFor="status">
            Status
          </label>
          <select id="status" name="status" defaultValue={status} className="field">
            <option value="">Any</option>
            <option value="success">Success</option>
            <option value="failed">Failed</option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor="kind">
            Kind
          </label>
          <select id="kind" name="kind" defaultValue={kind} className="field">
            <option value="">Any</option>
            {Object.entries(KIND_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="vibe">
            Voice
          </label>
          <select id="vibe" name="vibe" defaultValue={vibe} className="field">
            <option value="">Any</option>
            {Object.entries(VIBES).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="model">
            Answered by
          </label>
          <select id="model" name="model" defaultValue={model} className="field">
            <option value="">Any model</option>
            {allModels.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
        <button className="btn btn-ghost">Filter</button>
        {(status || kind || vibe || model) && (
          <Link href={link({ status: null, kind: null, vibe: null, model: null })} className="text-sm text-muted hover:text-ink">
            Clear
          </Link>
        )}
        <p className="ml-auto text-sm text-muted">{rows.length} runs</p>
      </form>

      <section className="panel overflow-hidden">
        {shown.length === 0 ? (
          <p className="p-6 text-sm text-muted">No runs match.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead>
                <tr>
                  <th scope="col">When</th>
                  <th scope="col">Who</th>
                  <th scope="col">Voice</th>
                  <th scope="col">Kind</th>
                  <th scope="col">Status</th>
                  <th scope="col">Answered by</th>
                  <th scope="col">Calls</th>
                  <th scope="col">Duration</th>
                  <th scope="col">Captions</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((r) => (
                  <tr key={r.id}>
                    <td className="whitespace-nowrap">
                      <Link href={`/requests/${r.id}`} className="font-medium hover:underline">
                        {fmtDateTime(r.created_at)}
                      </Link>
                    </td>
                    <td className="max-w-40 truncate">
                      {r.user_id ? (
                        <Link href={`/users/${r.user_id}`} className="hover:underline">
                          {displayName(people.get(r.user_id))}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td>
                      <VibeTag vibe={r.vibe} />
                    </td>
                    <td className="whitespace-nowrap text-[13px]">
                      {KIND_LABEL[r.kind]}
                      {r.has_image && <span className="text-muted"> · photo</span>}
                    </td>
                    <td>
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="font-mono text-[12px]">{r.model ?? "—"}</td>
                    <td className="num">{r.kind === "backfill" ? "—" : r.attempt_count}</td>
                    <td className="num whitespace-nowrap">{fmtMs(r.duration_ms)}</td>
                    <td className="num">{r.caption_count}</td>
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
