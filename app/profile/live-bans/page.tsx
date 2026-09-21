import {
  cookies,
} from "next/headers";

import {
  redirect,
} from "next/navigation";

import Link from "next/link";

import { AuthService } from "@/lib/auth/auth-service";
import { SESSION_COOKIE_NAME } from "@/lib/auth/session";

import StudioBanManager from "@/app/live/studio/StudioBanManager";

export default async function LiveBanSettingsPage() {
  const cookieStore =
    await cookies();

  const token =
    cookieStore.get(
      SESSION_COOKIE_NAME,
    )?.value;

  if (!token) {
    redirect("/login");
  }

  const snapshot =
    await new AuthService()
      .getCurrentUserSnapshot(
        token,
      );

  if (!snapshot) {
    redirect("/login");
  }

  return (
    <main className="min-h-screen bg-black px-4 pb-28 pt-8 text-white md:px-6 md:pt-24">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/profile"
          className="text-xs font-bold text-zinc-500 hover:text-white"
        >
          ← 마이페이지
        </Link>

        <div className="mt-5">
          <p className="text-xs font-black text-red-400">
            LIVE 관리
          </p>

          <h1 className="mt-2 text-2xl font-black">
            강퇴 관리
          </h1>

          <p className="mt-2 text-sm text-zinc-500">
            방송 중이 아니어도 1일·영구 강퇴
            사용자를 확인하고 해제할 수 있습니다.
          </p>
        </div>

        <section className="mt-8 rounded-3xl border border-white/[0.08] bg-zinc-950 p-5">
          <StudioBanManager />
        </section>
      </div>
    </main>
  );
}
