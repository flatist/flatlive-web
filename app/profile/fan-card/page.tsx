import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";

import { AuthService } from "@/lib/auth/auth-service";
import { SESSION_COOKIE_NAME } from "@/lib/auth/session";

import FanCardSettingsClient from "./FanCardSettingsClient";

export const dynamic = "force-dynamic";

export default async function FanCardSettingsPage() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionToken) {
    redirect("/login");
  }

  const snapshot = await new AuthService().getCurrentUserSnapshot(sessionToken);

  if (!snapshot) {
    redirect("/login");
  }

  return (
    <main className="min-h-screen bg-black px-4 pb-28 pt-8 text-white md:px-6 md:pt-24">
      <div className="mx-auto max-w-5xl">
        <div className="mb-5">
          <Link
            href="/profile"
            className="inline-flex items-center rounded-full border border-white/10 px-4 py-2 text-xs font-bold text-zinc-400 transition hover:bg-white hover:text-black"
          >
            ← 마이페이지로
          </Link>
        </div>

        <section className="rounded-3xl border border-white/[0.08] bg-zinc-950 p-5 md:p-7">
          <p className="text-xs font-black uppercase tracking-[0.3em] text-yellow-300/80">
            FAN CARD
          </p>

          <h1 className="mt-3 text-2xl font-black md:text-4xl">
            팬카드 · VIP 패스 설정
          </h1>

          <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-400">
            일반 팬가입은 메시지만 보여주고, VIP 팬가입은 이미지와 메시지를 함께 보여줍니다.
            이 설정은 방송자별로 따로 저장되며 다른 방송자 방에는 적용되지 않습니다.
          </p>
        </section>

        <FanCardSettingsClient />
      </div>
    </main>
  );
}
