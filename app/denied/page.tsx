import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { LineBullet } from "@/app/components/LineBullet";

export const metadata: Metadata = { title: "No access" };

export default async function DeniedPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-10">
      <div className="rounded-2xl bg-sign p-6 text-white sm:p-8">
        <div aria-hidden="true" className="h-px bg-white/60" />
        <div className="mt-5 flex items-center gap-2">
          <LineBullet letter="!" bg="#c4161c" size={26} />
          <span className="text-[13px] font-medium uppercase tracking-[0.14em] text-white/70">No access</span>
        </div>
        <h1 className="mt-4 text-[28px] font-bold leading-tight tracking-tight">This train is not in service</h1>
        <p className="mt-2 text-[15px] text-white/80">
          {user?.email ? (
            <>
              <span className="font-semibold text-white">{user.email}</span> is signed in, but it isn&apos;t a
              superadmin.
            </>
          ) : (
            "You aren't signed in."
          )}{" "}
          Ask the project owner to set <code className="font-mono text-metro">profiles.is_superadmin</code> for
          your account, or sign in with a different Google account.
        </p>
        <form action="/auth/signout" method="post" className="mt-7">
          <button className="w-full rounded-full bg-white px-5 py-3 font-semibold text-ink hover:bg-white/90">
            Sign out and switch account
          </button>
        </form>
      </div>
    </main>
  );
}
