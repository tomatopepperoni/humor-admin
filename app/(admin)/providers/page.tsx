import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin";
import CrudPage from "../_crud/CrudPage";

export const metadata: Metadata = { title: "LLM providers" };
export const dynamic = "force-dynamic";

export default async function ProvidersPage({ searchParams }: PageProps<"/providers">) {
  const { supabase } = await requireAdmin();
  const { data } = await supabase.from("llm_models").select("provider_id, is_active");
  const counts = new Map<number, { all: number; active: number }>();
  for (const m of (data ?? []) as { provider_id: number; is_active: boolean }[]) {
    const c = counts.get(m.provider_id) ?? { all: 0, active: 0 };
    c.all++;
    if (m.is_active) c.active++;
    counts.set(m.provider_id, c);
  }

  return (
    <CrudPage
      resource="providers"
      searchParams={await searchParams}
      extraLabel="Models"
      rowExtra={(row) => {
        const c = counts.get(row.id);
        return c ? (
          <a href="/models" className="num whitespace-nowrap hover:underline">
            {c.active} active / {c.all}
          </a>
        ) : (
          <span className="text-muted">none</span>
        );
      }}
    />
  );
}
