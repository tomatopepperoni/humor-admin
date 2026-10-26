import "server-only";
import type { SupabaseServer } from "@/lib/supabase/server";

/**
 * Week 7 observability: generation_requests (one per caption run) and
 * llm_responses (one per model call inside a run), written by both apps
 * through public.log_generation().
 */

export type GenerationRequest = {
  id: string;
  user_id: string | null;
  post_id: string | null;
  chain_id: number | null;
  vibe: string | null;
  kind: "create" | "more" | "admin" | "backfill";
  app: "caption-app" | "admin";
  status: "success" | "failed";
  has_image: boolean;
  model: string | null;
  attempt_count: number;
  caption_count: number;
  error: string | null;
  duration_ms: number | null;
  config_source: "database" | "code" | null;
  started_at: string;
  finished_at: string | null;
  created_at: string;
};

export type LlmResponse = {
  id: number;
  request_id: string;
  attempt: number;
  round: number;
  model: string;
  outcome: "ok" | "unusable" | "http_error" | "blocked" | "empty" | "timeout" | "network";
  http_status: number | null;
  latency_ms: number | null;
  finish_reason: string | null;
  prompt_tokens: number | null;
  output_tokens: number | null;
  thinking_tokens: number | null;
  total_tokens: number | null;
  raw_text: string | null;
  error: string | null;
  created_at: string;
};

// Everything except the (long) prompt.
export const REQUEST_COLS =
  "id, user_id, post_id, chain_id, vibe, kind, app, status, has_image, model, attempt_count, caption_count, error, duration_ms, config_source, started_at, finished_at, created_at";
// Everything except raw_text, for lists.
export const RESPONSE_COLS =
  "id, request_id, attempt, round, model, outcome, http_status, latency_ms, finish_reason, prompt_tokens, output_tokens, thinking_tokens, total_tokens, error, created_at";

export const OUTCOME_LABEL: Record<LlmResponse["outcome"], string> = {
  ok: "OK",
  unusable: "Unusable output",
  http_error: "HTTP error",
  blocked: "Blocked",
  empty: "Empty answer",
  timeout: "Timed out",
  network: "Unreachable",
};

export const KIND_LABEL: Record<GenerationRequest["kind"], string> = {
  create: "New post",
  more: "Write 3 more",
  admin: "Admin",
  backfill: "Before week 7",
};

const PAGE = 1000;

/** All rows of a log table since `sinceIso` (paged; fine at class scale). */
export async function fetchSince<T>(supabase: SupabaseServer, table: string, cols: string, sinceIso: string | null) {
  const out: T[] = [];
  for (let from = 0; ; from += PAGE) {
    let q = supabase.from(table).select(cols).order("created_at", { ascending: false }).order("id", { ascending: false });
    if (sinceIso) q = q.gte("created_at", sinceIso);
    const { data, error } = await q.range(from, from + PAGE - 1);
    if (error) return { rows: out, error };
    out.push(...((data ?? []) as T[]));
    if (!data || data.length < PAGE) break;
  }
  return { rows: out, error: null };
}

export function percentile(values: number[], p: number): number | null {
  const v = values.filter((x) => Number.isFinite(x)).sort((a, b) => a - b);
  if (v.length === 0) return null;
  const i = Math.min(v.length - 1, Math.max(0, Math.ceil((p / 100) * v.length) - 1));
  return v[i];
}

export function fmtMs(ms: number | null | undefined) {
  if (ms === null || ms === undefined) return "—";
  return ms < 1000 ? `${Math.round(ms)} ms` : `${(ms / 1000).toFixed(ms < 10_000 ? 1 : 0)} s`;
}

export function pct(n: number, d: number) {
  return d === 0 ? "—" : `${Math.round((100 * n) / d)}%`;
}

export type ModelStats = {
  model: string;
  calls: number;
  ok: number;
  unusable: number;
  failed: number;
  p50: number | null;
  p95: number | null;
  avgTokens: number | null;
  avgThinking: number | null;
};

export function statsByModel(responses: LlmResponse[]): Map<string, ModelStats> {
  const groups = new Map<string, LlmResponse[]>();
  for (const r of responses) groups.set(r.model, [...(groups.get(r.model) ?? []), r]);
  const out = new Map<string, ModelStats>();
  for (const [model, rs] of groups) {
    const lat = rs.map((r) => r.latency_ms ?? NaN);
    const okRows = rs.filter((r) => r.outcome === "ok");
    const tok = rs.map((r) => r.total_tokens).filter((x): x is number => typeof x === "number");
    const think = rs.map((r) => r.thinking_tokens).filter((x): x is number => typeof x === "number");
    out.set(model, {
      model,
      calls: rs.length,
      ok: okRows.length,
      unusable: rs.filter((r) => r.outcome === "unusable").length,
      failed: rs.filter((r) => r.outcome !== "ok" && r.outcome !== "unusable").length,
      p50: percentile(okRows.map((r) => r.latency_ms ?? NaN), 50) ?? percentile(lat, 50),
      p95: percentile(okRows.map((r) => r.latency_ms ?? NaN), 95) ?? percentile(lat, 95),
      avgTokens: tok.length ? Math.round(tok.reduce((a, b) => a + b, 0) / tok.length) : null,
      avgThinking: think.length ? Math.round(think.reduce((a, b) => a + b, 0) / think.length) : null,
    });
  }
  return out;
}

export function daysAgoIso(days: number) {
  return new Date(Date.now() - days * 86_400_000).toISOString();
}
