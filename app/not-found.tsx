import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex max-w-md flex-1 flex-col items-center justify-center px-4 py-16 text-center">
      <p className="text-[13px] font-medium uppercase tracking-[0.14em] text-muted">404</p>
      <h1 className="mt-2 text-2xl font-bold tracking-tight">No train at this platform</h1>
      <p className="mt-2 text-sm text-muted">That record doesn&apos;t exist, or it was deleted.</p>
      <Link href="/" className="btn btn-primary mt-6">
        Back to the dashboard
      </Link>
    </main>
  );
}
