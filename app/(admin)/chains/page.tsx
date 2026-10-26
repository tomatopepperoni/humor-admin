import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { daysAgoIso, fetchSince, pct, type GenerationRequest } from "@/lib/observability";
import { VibeTag } from "@/app/components/VibeTag";
import { isMissingTable, MissingSql, Notice, PageHeader } from "@/app/components/Notice";

export const metadata: Metadata = { title: "Prompt chains" };
export const dynamic = "force-dynamic";

type Chain = { id: number; slug: string; name: string; description: string | null; is_active: boolean; updated_at: string };
type Step = { id: number; chain_id: number; step_order: number; name: string; condition: string | null };
type Mix = { chain_id: number; is_enabled: boolean; weight: number };

/** READ prompt chains: one per subway voice, with their steps, mix setting and recent runs. */
export default async function ChainsPage() {
  const { supabase } = await requireAdmin();
  const [{ data: chainData, error }, { data: stepData }, { data: mixData }, reqs] = await Promise.all([
    supabase.from("prompt_chains").select("id, slug, name, description, is_active, updated_at").order("is_active", { ascending: false }).order("id"),
    supabase.from("prompt_chain_steps").select("id, chain_id, step_order, name, condition").order("step_order"),
    supabase.from("prompt_chain_mix").select("chain_id, is_enabled, weight"),
    fetchSince<GenerationRequest>(supabase, "generation_requests", "id, chain_id, status, kind, created_at", daysAgoIso(7)),
  ]);

  if (error) {
    return (
      <div className="space-y-5">
        <PageHeader title="Prompt chains" />
        {isMissingTable(error) ? <MissingSql what="Prompt chains" /> : <Notice tone="error">{error.message}</Notice>}
      </div>
    );
  }

  const chains = (chainData ?? []) as Chain[];
  const steps = (stepData ?? []) as Step[];
  const mix = new Map(((mixData ?? []) as Mix[]).map((m) => [m.chain_id, m]));
  const runs = reqs.rows.filter((r) => r.kind !== "backfill");
  const totalWeight = [...mix.values()].filter((m) => m.is_enabled).reduce((s, m) => s + m.weight, 0);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Prompt chains"
        intro="Each subway voice is a chain: an ordered list of steps that both apps join into one Gemini prompt. Steps with a condition are left out when that input is missing (no photo, no theme…). Read-only here; the mix (which voices are offered) is editable."
      >
        <Link href="/mix" className="btn btn-ghost">
          Edit the mix →
        </Link>
      </PageHeader>

      <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
        {chains.map((c) => {
          const s = steps.filter((x) => x.chain_id === c.id);
          const m = mix.get(c.id);
          const r = runs.filter((x) => x.chain_id === c.id);
          const ok = r.filter((x) => x.status === "success").length;
          return (
            <Link key={c.id} href={`/chains/${c.id}`} className="panel block p-5 transition-colors hover:border-ink/40">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[17px] font-semibold">
                    <VibeTag vibe={c.slug} size={22} />
                  </p>
                  <p className="mt-1 text-[13px] text-muted">{c.description}</p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                    !c.is_active ? "bg-paper text-muted" : m?.is_enabled ? "bg-go text-white" : "bg-hold text-white"
                  }`}
                >
                  {!c.is_active ? "Retired" : m?.is_enabled ? "In the picker" : "Switched off"}
                </span>
              </div>
              <ol className="mt-4 flex flex-wrap gap-1.5">
                {s.map((st) => (
                  <li
                    key={st.id}
                    title={st.condition ? `Only when ${st.condition.replace("has_", "there is a ")}` : "Always"}
                    className={`rounded-md border px-1.5 py-0.5 text-[11.5px] ${st.condition ? "border-dashed text-muted" : "bg-paper"}`}
                  >
                    {st.step_order}. {st.name}
                  </li>
                ))}
              </ol>
              <dl className="mt-4 grid grid-cols-3 gap-2 border-t pt-3 text-[13px]">
                <div>
                  <dt className="text-muted">Steps</dt>
                  <dd className="num font-semibold">{s.length}</dd>
                </div>
                <div>
                  <dt className="text-muted">Mix share</dt>
                  <dd className="num font-semibold">{m?.is_enabled && totalWeight ? pct(m.weight, totalWeight) : "—"}</dd>
                </div>
                <div>
                  <dt className="text-muted">Runs, 7 days</dt>
                  <dd className="num font-semibold">
                    {r.length}
                    {r.length > 0 && <span className="font-normal text-muted"> · {pct(ok, r.length)} ok</span>}
                  </dd>
                </div>
              </dl>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
