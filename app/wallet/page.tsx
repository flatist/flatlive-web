import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { parseSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { WalletService } from "@/lib/wallet/wallet-service";

function formatAmount(value: number) {
  return new Intl.NumberFormat("ko-KR").format(value);
}

export default async function WalletPage() {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  const userId = token ? parseSessionToken(token)?.userId ?? null : null;
  if (!userId) redirect("/login");

  const wallet = await new WalletService().getUserSummary(userId);

  return (
    <main className="min-h-screen bg-black px-4 pb-24 pt-8 text-white md:px-6 md:pt-24">
      <div className="mx-auto max-w-4xl">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold tracking-widest text-zinc-500">MY ASSETS</p>
            <h1 className="mt-1 text-3xl font-black">지갑</h1>
            <p className="mt-2 text-sm text-zinc-500">
              잔액은 화면 값이 아니라 서버 거래원장을 기준으로 계산합니다.
            </p>
          </div>
          <Link
            href="/profile"
            className="rounded-full border border-white/15 px-4 py-2 text-xs font-bold hover:bg-white hover:text-black"
          >
            마이로 돌아가기
          </Link>
        </div>

        <section className="mt-8 grid gap-4 md:grid-cols-2">
          <article className="rounded-3xl border border-white/10 bg-zinc-950 p-6">
            <p className="text-sm font-bold text-zinc-400">FLAT</p>
            <p className="mt-2 text-4xl font-black">{formatAmount(wallet.balances.FLAT)}</p>
            <p className="mt-3 text-xs leading-5 text-zinc-600">
              플랫티스트㈜ 원장 · 후원/사연/장독대/룰렛/영상후원/플#에 사용
            </p>
            <Link
              href="/charge"
              className="mt-5 block w-full rounded-xl bg-white py-3 text-center text-sm font-black text-black transition hover:bg-zinc-200"
            >
              FLAT 충전
            </Link>
          </article>

          <article className="rounded-3xl border border-yellow-400/15 bg-zinc-950 p-6">
            <p className="text-sm font-bold text-zinc-400">FIT</p>
            <p className="mt-2 text-4xl font-black">{formatAmount(wallet.balances.FIT)}</p>
            <p className="mt-3 text-xs leading-5 text-zinc-600">
              활동으로 적립되는 포인트 · FLAT과 별도 자산으로 관리합니다.
            </p>
            <Link
              href="/fit"
              className="mt-5 block w-full rounded-xl border border-yellow-400/25 bg-yellow-400/10 py-3 text-center text-sm font-black text-yellow-300 transition hover:bg-yellow-400 hover:text-black"
            >
              FIT 상세 · 적립내역
            </Link>
          </article>
        </section>

        <section className="mt-8 rounded-3xl border border-white/10 bg-zinc-950 p-6">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold tracking-widest text-zinc-500">LEDGER</p>
              <h2 className="mt-1 text-xl font-black">최근 거래내역</h2>
            </div>
            <p className="text-xs text-zinc-600">원거래 삭제 없이 역거래로 정정</p>
          </div>

          {wallet.recentTransactions.length === 0 ? (
            <div className="py-12 text-center text-sm text-zinc-600">
              아직 거래내역이 없습니다.
            </div>
          ) : (
            <div className="mt-5 divide-y divide-white/5">
              {wallet.recentTransactions.map((entry) => (
                <div key={entry.transactionId} className="flex items-center justify-between gap-4 py-4">
                  <div>
                    <p className="font-bold">
                      {entry.assetType} · {entry.sourceType}
                    </p>
                    <p className="mt-1 text-xs text-zinc-600">
                      {new Date(entry.createdAt).toLocaleString("ko-KR")}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-black">
                      {entry.direction === "CREDIT" ? "+" : "-"}
                      {formatAmount(entry.amount)}
                    </p>
                    <p className="mt-1 text-xs text-zinc-600">
                      잔액 {formatAmount(entry.balanceAfter)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <p className="mt-5 text-xs leading-5 text-zinc-600">
          개발 단계에서는 실제 충전·후원·환불 API를 아직 열지 않습니다.
          이후 모든 금액 변경은 idempotency key와 불변 원장을 거쳐 서버에서만 확정합니다.
        </p>
      </div>
    </main>
  );
}
