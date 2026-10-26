import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { daysAgoIso, fetchSince, fmtMs, pct, RESPONSE_COLS, statsByModel, type LlmResponse } from "@/lib/observability";
import CrudPage from "../_crud/CrudPage";

export const metadata: Metadata = { title: "LLM models" };
export const dynamic = "force-dynamic";

/** CRUD for llm_models, plus how each model actually behaved in the last 7 days. */
export default async function ModelsPage({ searchParams }: PageProps<"/models">) {
  const { supabase } = await requireAdmin();
  const { rows } = await fetchSince<LlmResponse>(supabase, "llm_responses", RESPONSE_COLS, daysAgoIso(7));
  const stats = statsByModel(rows);

  return (
    <CrudPage
      resource="models"
      searchParams={await searchParams}
      extraLabel="Last 7 days"
      rowExtra={(row) => {
        const s = stats.get(String(row.model_id));
        if (!s) return <span className="text-muted">no calls</span>;
        return (
          <Link href={`/responses?model=${encodeURIComponent(s.model)}`} className="block whitespace-nowrap text-[13px] hover:underline">
            <span className="num">{s.calls}</span> calls · <span className={s.ok / s.calls >= 0.8 ? "text-go" : "text-stop"}>{pct(s.ok, s.calls)} ok</span>
            <span className="block text-muted">p50 {fmtMs(s.p50)} · p95 {fmtMs(s.p95)}</span>
          </Link>
        );
      }}
    />
  );
}
