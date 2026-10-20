import type { Metadata } from "next";
import GoogleSignInButton from "./GoogleSignInButton";
import { LineBullet } from "@/app/components/LineBullet";
import { safeNext } from "@/lib/safe-next";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const next = safeNext(params.next, "");
  const hadError = params.error === "auth";

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-10">
      <div className="rounded-2xl bg-sign p-6 text-white sm:p-8">
        <div aria-hidden="true" className="h-px bg-white/60" />
        <div className="mt-5 flex items-center gap-2">
          <LineBullet letter="S" bg="#808183" size={26} />
          <span className="text-[13px] font-medium uppercase tracking-[0.14em] text-white/70">Staff only</span>
        </div>
        <h1 className="mt-4 text-[30px] font-bold leading-tight tracking-tight">Captioned NYC Control Center</h1>
        <p className="mt-2 text-[15px] text-white/80">
          Sign in with Google. Only accounts marked as superadmin in the database get past this door.
        </p>

        {hadError && (
          <p role="alert" className="mt-4 rounded-lg bg-white/10 p-3 text-sm">
            Google sign-in didn&apos;t finish. Try again.
          </p>
        )}

        <div className="mt-7">
          <GoogleSignInButton next={next || undefined} />
        </div>
      </div>
    </main>
  );
}
