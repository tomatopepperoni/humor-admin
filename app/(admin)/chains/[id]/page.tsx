import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { renderChain, type GenerationConfig } from "@/lib/prompt-chain";
import { isVibe, todaysTheme } from "@/lib/vibes";
import { VibeTag } from "@/app/components/VibeTag";

export const metadata: Metadata = { title: "Prompt chain" };
export const dynamic = "force-dynamic";

type Step = { id: number; step_order: number; name: string; condition: string | null; template: string };

const CONDITION: Record<string, string> = {
  has_image: "only with a photo",
  has_theme: "only for themed posts",
  has_context: "only when the poster wrote something",
  has_terms: "only when there are active terms",
  has_examples: "only when there are active examples",
  has_avoid: "only for “write 3 more”",
};

/** Highlights {{placeholders}} so it's clear what gets filled in per run. */
function Template({ text }: { text: string }) {
  const parts = text.split(/(\{\{\s*\w+\s*\}\})/g);
  return (
    <pre className="whitespace-pre-wrap break-words font-mono text-[12.5px] leading-relaxed">
      {parts.map((p, i) =>
        /^\{\{/.test(p) ? (
          <mark key={i} className="rounded bg-metro/40 px-0.5 text-ink">
            {p}
          </mark>
        ) : (
          <span key={i}>{p}</span>
        )
      )}
    </pre>
  );
}

/** READ prompt chain steps for one voice, plus the prompt they produce today. */
export default async function ChainPage({ params, searchParams }: PageProps<"/chains/[id]">) {
  const { id } = await params;
  const sp = await searchParams;
  const chainId = Number(id);
  if (!Number.isInteger(chainId)) notFound();
  const { supabase } = await requireAdmin();

  const { data: chain } = await supabase
    .from("prompt_chains")
    .select("id, slug, name, description, is_active, created_at")
    .eq("id", chainId)
    .maybeSingle<{ id: number; slug: string; name: string; description: string | null; is_active: boolean; created_at: string }>();
  if (!chain) notFound();

  const [{ data: stepData }, { data: termData }, { data: exampleData }, { data: mix }] = await Promise.all([
    supabase.from("prompt_chain_steps").select("id, step_order, name, condition, template").eq("chain_id", chainId).order("step_order"),
    supabase.from("terms").select("term, definition").eq("is_active", true).order("term").limit(10),
    supabase
      .from("generation_examples")
      .select("moment, caption, chain_id")
      .eq("is_active", true)
      .or(`chain_id.eq.${chainId},chain_id.is.null`)
      .limit(3),
    supabase.from("prompt_chain_mix").select("is_enabled, weight").eq("chain_id", chainId).maybeSingle<{ is_enabled: boolean; weight: number }>(),
  ]);
  const steps = (stepData ?? []) as Step[];

  // Preview inputs: switchable with ?photo=0 / ?theme=0 / ?more=1.
  const withPhoto = sp.photo !== "0";
  const withTheme = sp.theme !== "0";
  const more = sp.more === "1";
  const cfg: GenerationConfig = {
    chain: { id: chain.id, slug: chain.slug, name: chain.name },
    steps: steps.map((s) => ({ order: s.step_order, name: s.name, condition: s.condition, template: s.template })),
    terms: (termData ?? []) as GenerationConfig["terms"],
    examples: (exampleData ?? []) as GenerationConfig["examples"],
    models: [],
  };
  const preview = isVibe(chain.slug)
    ? renderChain(cfg, {
        vibe: chain.slug,
        count: 3,
        context: "45 minutes in line at Levain for one cookie",
        hasImage: withPhoto,
        theme: withTheme ? todaysTheme() : null,
        avoid: more ? ["An earlier caption on this post"] : [],
      })
    : "";
  const toggle = (k: "photo" | "theme" | "more", on: boolean) => {
    const u = new URLSearchParams();
    const state = { photo: withPhoto, theme: withTheme, more };
    state[k] = on;
    if (!state.photo) u.set("photo", "0");
    if (!state.theme) u.set("theme", "0");
    if (state.more) u.set("more", "1");
    const s = u.toString();
    return `/chains/${chain.id}${s ? `?${s}` : ""}`;
  };

  return (
    <div className="space-y-6">
      <Link href="/chains" className="text-sm text-muted hover:text-ink">
        ← All prompt chains
      </Link>

      <section className="panel p-6">
        <h1 className="text-[24px] font-bold tracking-tight">
          <VibeTag vibe={chain.slug} size={28} />
        </h1>
        <p className="mt-1 text-sm text-muted">{chain.description}</p>
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm">
          <span>
            Slug <code className="font-mono">{chain.slug}</code>
          </span>
          <span>{chain.is_active ? "Active" : "Retired (kept so week-4 captions still map to a chain)"}</span>
          {mix && (
            <span>
              Mix: {mix.is_enabled ? "in the picker" : "switched off"}, weight {mix.weight}{" "}
              <Link href="/mix" className="underline">
                edit
              </Link>
            </span>
          )}
          <span>{steps.length} steps</span>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[3fr_2fr]">
        <section className="panel overflow-hidden">
          <h2 className="panel-title border-b px-5 py-3">Steps</h2>
          <ol className="divide-y">
            {steps.map((s) => (
              <li key={s.id} className="grid gap-3 px-5 py-4 sm:grid-cols-[9rem_1fr]">
                <div>
                  <p className="font-semibold">
                    <span className="num text-muted">{s.step_order}.</span> {s.name}
                  </p>
                  <p className="mt-0.5 text-[12px] text-muted">{s.condition ? CONDITION[s.condition] ?? s.condition : "always"}</p>
                </div>
                <Template text={s.template} />
              </li>
            ))}
          </ol>
        </section>

        <section className="panel h-fit p-5 xl:sticky xl:top-6">
          <h2 className="panel-title">Prompt preview</h2>
          <p className="panel-sub">
            What Gemini receives for a sample post today. Terms and examples are picked at random on each real run (up to
            10 and 3).
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-[13px]">
            <Link href={toggle("photo", !withPhoto)} className={`rounded-full border px-2.5 py-0.5 ${withPhoto ? "bg-ink text-white" : ""}`}>
              {withPhoto ? "✓ " : ""}Photo
            </Link>
            <Link href={toggle("theme", !withTheme)} className={`rounded-full border px-2.5 py-0.5 ${withTheme ? "bg-ink text-white" : ""}`}>
              {withTheme ? "✓ " : ""}Today&apos;s theme
            </Link>
            <Link href={toggle("more", !more)} className={`rounded-full border px-2.5 py-0.5 ${more ? "bg-ink text-white" : ""}`}>
              {more ? "✓ " : ""}Write 3 more
            </Link>
          </div>
          <pre className="mt-3 max-h-[36rem] overflow-auto whitespace-pre-wrap break-words rounded-lg bg-paper p-3 font-mono text-[12px] leading-relaxed">
            {preview || "No preview for this voice."}
          </pre>
        </section>
      </div>
    </div>
  );
}
