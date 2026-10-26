import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin";
import { displayName, type Profile } from "@/lib/data";
import { daysAgoIso, fetchSince, pct, type GenerationRequest } from "@/lib/observability";
import { fmtDateTime } from "@/lib/time";
import { VibeTag } from "@/app/components/VibeTag";
import { isMissingTable, MissingSql, Notice, PageHeader } from "@/app/components/Notice";
import { saveMix } from "./actions";

export const metadata: Metadata = { title: "Prompt chain mix" };
export const dynamic = "force-dynamic";

type Row = {
  chain_id: number;
  is_enabled: boolean;
  weight: number;
  updated_at: string;
  updated_by: string | null;
  prompt_chains: { slug: string; name: string; is_active: boolean } | null;
};

const ERRORS: Record<string, string> = {
  "none-enabled": "Keep at least one voice switched on, or nobody can post.",
  nothing: "Nothing to save.",
  denied: "The database refused the change. Is your account still a superadmin?",
};

/** READ/UPDATE prompt_chain_mix. */
export default async function MixPage({ searchParams }: PageProps<"/mix">) {
  const sp = await searchParams;
  const { supabase } = await requireAdmin();
  const [{ data, error }, reqs] = await Promise.all([
    supabase
      .from("prompt_chain_mix")
      .select("chain_id, is_enabled, weight, updated_at, updated_by, prompt_chains ( slug, name, is_active )")
      .order("chain_id"),
    fetchSince<GenerationRequest>(supabase, "generation_requests", "id, vibe, kind, status, created_at", daysAgoIso(7)),
  ]);

  if (error) {
    return (
      <div className="space-y-5">
        <PageHeader title="Prompt chain mix" />
        {isMissingTable(error) ? <MissingSql what="The prompt chain mix" /> : <Notice tone="error">{error.message}</Notice>}
      </div>
    );
  }

  const rows = (data ?? []) as unknown as Row[];
  const editors = [...new Set(rows.map((r) => r.updated_by).filter(Boolean))] as string[];
  const { data: profs } = editors.length
    ? await supabase.from("profiles").select("id, first_name, last_name, email").in("id", editors)
    : { data: [] };
  const who = new Map(((profs ?? []) as Profile[]).map((p) => [p.id, p]));
  const lastEdit = rows.reduce<Row | null>((a, r) => (!a || r.updated_at > a.updated_at ? r : a), null);

  const totalWeight = rows.filter((r) => r.is_enabled).reduce((s, r) => s + r.weight, 0);
  const picks = reqs.rows.filter((r) => r.kind === "create" || r.kind === "more");
  const err = typeof sp.err === "string" ? ERRORS[sp.err] ?? sp.err : null;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Prompt chain mix"
        intro="Which voices people can pick when they post, and how often “Surprise me” lands on each. Switching a voice off hides it from the picker and the caption app refuses it; old captions keep their voice."
      />

      {sp.msg === "saved" && <Notice>Mix saved. The caption app uses it on the next page load.</Notice>}
      {err && <Notice tone="error">{err}</Notice>}

      <form action={saveMix} className="panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="tbl">
            <thead>
              <tr>
                <th scope="col">Voice</th>
                <th scope="col">In the picker</th>
                <th scope="col">Weight (0–100)</th>
                <th scope="col" className="w-[30%]">“Surprise me” share</th>
                <th scope="col">Picked, last 7 days</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const slug = r.prompt_chains?.slug ?? null;
                const share = r.is_enabled && totalWeight > 0 ? r.weight / totalWeight : 0;
                const used = picks.filter((p) => p.vibe === slug).length;
                return (
                  <tr key={r.chain_id}>
                    <td className="font-medium">
                      <input type="hidden" name="chain_id" value={r.chain_id} />
                      <VibeTag vibe={slug} />
                    </td>
                    <td>
                      <label className="inline-flex items-center gap-2">
                        <input type="checkbox" name={`enabled_${r.chain_id}`} defaultChecked={r.is_enabled} className="h-4 w-4 accent-ink" />
                        <span className="sr-only">Offer {r.prompt_chains?.name}</span>
                      </label>
                    </td>
                    <td>
                      <input
                        type="number"
                        name={`weight_${r.chain_id}`}
                        min={0}
                        max={100}
                        step={1}
                        defaultValue={r.weight}
                        aria-label={`Weight for ${r.prompt_chains?.name}`}
                        className="field w-24 py-1.5"
                      />
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-paper">
                          <div className="h-full rounded-full bg-ink" style={{ width: `${Math.round(share * 100)}%` }} />
                        </div>
                        <span className="num w-10 text-right text-[13px]">{r.is_enabled ? `${Math.round(share * 100)}%` : "off"}</span>
                      </div>
                    </td>
                    <td className="num text-[13px]">
                      {used} <span className="text-muted">({pct(used, picks.length)})</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3">
          <p className="text-[13px] text-muted">
            Shares use the saved weights.{" "}
            {lastEdit?.updated_by
              ? `Last changed ${fmtDateTime(lastEdit.updated_at)} by ${displayName(who.get(lastEdit.updated_by))}.`
              : "Not changed since setup."}
          </p>
          <button className="btn btn-primary">Save mix</button>
        </div>
      </form>
    </div>
  );
}
