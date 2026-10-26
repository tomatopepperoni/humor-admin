"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";

/** UPDATE prompt_chain_mix: one row per voice (is_enabled, weight). */
export async function saveMix(fd: FormData) {
  const { supabase } = await requireAdmin();
  const ids = fd.getAll("chain_id").map((v) => Number(v)).filter((n) => Number.isInteger(n));
  if (ids.length === 0) redirect("/mix?err=nothing");

  const updates = ids.map((id) => {
    const weight = Math.round(Number(fd.get(`weight_${id}`)));
    return { id, is_enabled: fd.get(`enabled_${id}`) === "on", weight: Number.isFinite(weight) ? Math.min(100, Math.max(0, weight)) : 0 };
  });
  if (!updates.some((u) => u.is_enabled)) redirect("/mix?err=none-enabled");

  for (const u of updates) {
    const { data, error } = await supabase
      .from("prompt_chain_mix")
      .update({ is_enabled: u.is_enabled, weight: u.weight })
      .eq("chain_id", u.id)
      .select("chain_id");
    if (error || !data?.length) redirect(`/mix?err=${encodeURIComponent(error?.message ?? "denied")}`);
  }

  revalidatePath("/mix");
  revalidatePath("/chains");
  redirect("/mix?msg=saved");
}
