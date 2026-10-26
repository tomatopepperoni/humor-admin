/** Status / error banners shared by the admin pages. */
export function Notice({ tone = "ok", children }: { tone?: "ok" | "error" | "info"; children: React.ReactNode }) {
  const cls =
    tone === "error"
      ? "border-stop/30 bg-stop/10"
      : tone === "info"
        ? "border-lineA/25 bg-lineA/5"
        : "border-go/30 bg-go/10";
  return (
    <p role={tone === "error" ? "alert" : "status"} className={`rounded-lg border px-4 py-2.5 text-sm ${cls}`}>
      {children}
    </p>
  );
}

/** PostgREST / Postgres "relation does not exist": the week-7 SQL hasn't been run. */
export function isMissingTable(err: { code?: string; message?: string } | null | undefined) {
  if (!err) return false;
  return err.code === "42P01" || err.code === "PGRST205" || err.code === "PGRST202" || /does not exist|schema cache/i.test(err.message ?? "");
}

export function MissingSql({ what }: { what: string }) {
  return (
    <div className="panel p-6">
      <h2 className="panel-title">{what} isn&apos;t set up yet</h2>
      <p className="panel-sub max-w-2xl">
        Run <code className="font-mono text-ink">supabase/week7_observability.sql</code> (in the humor-hello-world repo) in
        the Supabase SQL editor for project humor-joke, then reload this page. It creates the tables, the security rules
        and the starting data.
      </p>
    </div>
  );
}

export function PageHeader({
  title,
  intro,
  children,
}: {
  title: string;
  intro?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="max-w-3xl">
        <h1 className="text-[26px] font-bold tracking-tight">{title}</h1>
        {intro && <p className="mt-1 text-sm text-muted">{intro}</p>}
      </div>
      {children}
    </div>
  );
}

export function StatusBadge({ status }: { status: "success" | "failed" }) {
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-[11.5px] font-semibold ${
        status === "success" ? "bg-go/15 text-go" : "bg-stop/15 text-stop"
      }`}
    >
      {status === "success" ? "Success" : "Failed"}
    </span>
  );
}
