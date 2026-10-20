import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { displayName } from "@/lib/data";
import { Avatar } from "@/app/components/Avatar";
import { LineBullet } from "@/app/components/LineBullet";
import AdminNav from "./AdminNav";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireAdmin();
  const name = displayName(profile);
  const mainApp = process.env.NEXT_PUBLIC_MAIN_APP_URL || "https://humor-hello-world-ten.vercel.app";

  return (
    <>
      <header className="bg-sign text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex items-center justify-between gap-4 py-3">
            <Link href="/" className="flex items-center gap-2.5">
              <LineBullet letter="S" bg="#808183" size={26} />
              <span className="text-[17px] font-bold tracking-tight">
                Control Center<span className="hidden font-normal text-white/60 sm:inline"> · Captioned NYC</span>
              </span>
            </Link>
            <div className="flex items-center gap-3">
              <a href={mainApp} className="hidden text-sm text-white/70 hover:text-white md:inline">
                Open the app ↗
              </a>
              <span className="flex items-center gap-2 text-sm" title={profile.email ?? undefined}>
                <Avatar url={profile.avatar_url} name={name} size={26} />
                <span className="hidden max-w-40 truncate sm:inline">{name}</span>
              </span>
              <form action="/auth/signout" method="post">
                <button className="rounded-full border border-white/30 px-3 py-1 text-[13px] text-white/85 hover:bg-white/10">
                  Sign out
                </button>
              </form>
            </div>
          </div>
          <div aria-hidden="true" className="h-px bg-white/25" />
          <AdminNav />
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 sm:py-8">{children}</main>
    </>
  );
}
