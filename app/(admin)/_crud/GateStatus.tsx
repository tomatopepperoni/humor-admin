import { requireAdmin } from "@/lib/admin";

/**
 * How the signup gate (public.signup_allowed()) currently behaves, and which
 * existing members only get in because they joined before it (grandfathered).
 */
export default async function GateStatus() {
  const { supabase } = await requireAdmin();
  const [{ data: domains, error }, { data: emails }, { data: profiles }] = await Promise.all([
    supabase.from("allowed_signup_domains").select("domain"),
    supabase.from("whitelisted_emails").select("email"),
    supabase.from("profiles").select("email, is_superadmin"),
  ]);
  if (error) return null;

  const ds = ((domains ?? []) as { domain: string }[]).map((d) => d.domain);
  const es = new Set(((emails ?? []) as { email: string }[]).map((e) => e.email));
  const people = (profiles ?? []) as { email: string | null; is_superadmin: boolean }[];
  const on = ds.length > 0 || es.size > 0;
  const matches = (email: string | null) => {
    if (!email) return false;
    const e = email.toLowerCase();
    const dom = e.split("@")[1] ?? "";
    return es.has(e) || ds.some((d) => dom === d || dom.endsWith(`.${d}`));
  };
  const outside = people.filter((p) => !p.is_superadmin && !matches(p.email));

  return (
    <section className="panel p-5">
      <div className="flex flex-wrap items-center gap-3">
        <span
          className={`rounded-full px-2.5 py-0.5 text-[12px] font-semibold ${on ? "bg-go text-white" : "bg-paper text-muted"}`}
        >
          Signup gate {on ? "on" : "off"}
        </span>
        <p className="text-sm">
          {on
            ? `New Google sign-ins need one of ${ds.length} domain${ds.length === 1 ? "" : "s"} or one of ${es.size} whitelisted address${es.size === 1 ? "" : "es"}.`
            : "Nothing is configured, so anyone with a Google account can sign up."}
        </p>
      </div>
      <p className="mt-2 text-[13px] text-muted">
        {people.length} accounts today. {outside.length === 0
          ? "All of them match the current rules."
          : `${outside.length} of them are outside these rules but keep access, because the gate only applies to new signups (and superadmins always pass).`}{" "}
        Checked by <code className="font-mono">public.signup_allowed()</code> right after Google sign-in.
      </p>
    </section>
  );
}
