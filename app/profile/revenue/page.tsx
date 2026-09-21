import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";

import { AuthService } from "@/lib/auth/auth-service";
import {
  SESSION_COOKIE_NAME,
} from "@/lib/auth/session";

import {
  readFlits,
} from "@/lib/flit/flit-store";

import {
  readVods,
} from "@/lib/vod/vod-store";

import {
  WalletService,
} from "@/lib/wallet/wallet-service";

import {
  getCreatorSettlementAffiliation,
} from "@/lib/settlement/affiliation-store";

function formatDate(
  value: string,
) {
  return new Date(
    value,
  ).toLocaleString(
    "ko-KR",
  );
}

function money(
  value: number,
) {
  return value.toLocaleString(
    "ko-KR",
  );
}

export default async function RevenuePage() {
  const cookieStore =
    await cookies();

  const sessionToken =
    cookieStore.get(
      SESSION_COOKIE_NAME,
    )?.value;

  if (!sessionToken) {
    redirect("/login");
  }

  const snapshot =
    await new AuthService()
      .getCurrentUserSnapshot(
        sessionToken,
      );

  if (!snapshot) {
    redirect("/login");
  }

  const walletService =
    new WalletService();

  const [
    revenue,
    allFlits,
    allVods,
    affiliation,
  ] = await Promise.all([
    walletService
      .getReceivedDonationSummary(
        snapshot.userId,
      ),
    readFlits(),
    readVods(),
    getCreatorSettlementAffiliation(
      snapshot.userId,
    ),
  ]);

  const myFlits =
    allFlits.filter(
      (item) =>
        item.userId ===
        snapshot.userId,
    );

  const myVods =
    allVods.filter(
      (item) =>
        item.userId ===
        snapshot.userId,
    );

  const contentRows = [
    ...myFlits.map(
      (item) => ({
        id: item.id,
        type: "FLIT" as const,
        title: item.title,
        likes: item.likes,
        greats: item.greats,
        bests: item.bests,
      }),
    ),

    ...myVods.map(
      (item) => ({
        id: item.id,
        type: "VOD" as const,
        title: item.title,
        likes: item.likes,
        greats: item.greats,
        bests: item.bests,
      }),
    ),
  ];

  const reactionGross =
    contentRows.reduce(
      (sum, item) =>
        sum +
        item.greats * 10 +
        item.bests * 50,
      0,
    );

  const creatorRate =
    affiliation.affiliation ===
    "AGENCY"
      ? 60
      : 55;

  const liveGross =
    revenue.liveReceived;

  const liveCreatorShare =
    Math.floor(
      liveGross *
        creatorRate /
        100,
    );

  const videoCreatorRate = 50;

  const reactionCreatorShare =
    Math.floor(
      reactionGross *
        videoCreatorRate /
        100,
    );

  const totalCreatorRevenue =
    liveCreatorShare +
    reactionCreatorShare;

  return (
    <main className="min-h-screen bg-black px-4 pb-28 pt-8 text-white md:px-6 md:pt-24">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-black tracking-widest text-flat-yellow">
              REVENUE
            </p>

            <h1 className="mt-2 text-3xl font-black">
              받은 수익
            </h1>

            <p className="mt-2 text-sm text-zinc-500">
              LIVE 후원과 영상 반응 수익을
              구분해서 확인합니다.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/profile/settlement"
              className="rounded-full bg-flat-yellow px-4 py-2 text-xs font-black text-black"
            >
              정산 신청
            </Link>

            <Link
              href="/profile"
              className="rounded-full border border-white/15 px-4 py-2 text-xs font-bold hover:bg-white hover:text-black"
            >
              마이페이지
            </Link>
          </div>
        </div>

        <section className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Link
            href="/profile/revenue/live"
            className="group rounded-2xl border border-white/[0.08] bg-zinc-950 p-5 transition hover:border-flat-yellow/30 hover:bg-zinc-900"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="text-xs font-bold text-zinc-500">
                LIVE 후원
              </div>

              <div className="text-xs font-bold text-zinc-600 transition group-hover:text-flat-yellow">
                상세보기 →
              </div>
            </div>

            <div className="mt-2 text-2xl font-black">
              {money(
                liveGross,
              )}{" "}
              <span className="text-sm text-zinc-500">
                FLAT
              </span>
            </div>

            <div className="mt-1 text-[11px] text-zinc-600">
              총 후원 {money(
                revenue.liveCount,
              )}건
            </div>

            <div className="mt-3 border-t border-white/[0.06] pt-3">
              <div className="text-[11px] text-zinc-500">
                내 수익 {videoCreatorRate}%
              </div>

              <div className="mt-1 text-lg font-black text-flat-yellow">
                {money(
                  liveCreatorShare,
                )}{" "}
                FLAT
              </div>
            </div>
          </Link>

          <div className="rounded-2xl border border-white/[0.08] bg-zinc-950 p-5">
            <div className="text-xs font-bold text-zinc-500">
              영상 후원
            </div>

            <div className="mt-2 text-2xl font-black">
              {money(
                reactionGross,
              )}{" "}
              <span className="text-sm text-zinc-500">
                FLAT
              </span>
            </div>

            <div className="mt-1 text-[11px] text-zinc-600">
              총 영상 후원 발생액
            </div>

            <div className="mt-3 border-t border-white/[0.06] pt-3">
              <div className="text-[11px] text-zinc-500">
                내 수익 {videoCreatorRate}%
              </div>

              <div className="mt-1 text-lg font-black text-flat-yellow">
                {money(
                  reactionCreatorShare,
                )}{" "}
                FLAT
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-flat-yellow/30 bg-zinc-950 p-5">
            <div className="text-xs font-bold text-flat-yellow">
              총 정산 수익
            </div>

            <div className="mt-2 text-2xl font-black">
              {money(
                totalCreatorRevenue,
              )}{" "}
              <span className="text-sm text-zinc-500">
                FLAT
              </span>
            </div>

            <div className="mt-1 text-[11px] text-zinc-600">
              LIVE 내 수익 + 영상 내 수익
            </div>
          </div>
        </section>


        
        <section className="mt-10">
          <h2 className="text-xl font-black">
            영상 후원 상세
          </h2>

          <p className="mt-1 text-xs text-zinc-600">
            VOD·FLIT 영상별로 받은
            멋져요·최고예요 후원을 확인합니다.
          </p>

          <div className="mt-4 space-y-3">
            {contentRows.length ===
            0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 py-10 text-center text-sm text-zinc-600">
                아직 영상 후원 내역이
                없습니다.
              </div>
            ) : (
              contentRows.map(
                (item) => {
                  const greatGross =
                    item.greats * 10;

                  const bestGross =
                    item.bests * 50;

                  const gross =
                    greatGross +
                    bestGross;

                  const myShare =
                    Math.floor(
                      gross *
                        videoCreatorRate /
                        100,
                    );

                  return (
                    <div
                      key={`${item.type}-${item.id}`}
                      className="rounded-2xl border border-white/[0.08] bg-zinc-950 p-5"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="text-xs font-black text-flat-yellow">
                            {item.type}
                          </div>

                          <h3 className="mt-1 truncate font-black">
                            {item.title}
                          </h3>
                        </div>

                        <div className="shrink-0 text-right">
                          <div className="text-xs text-zinc-500">
                            내 수익 {videoCreatorRate}%
                          </div>

                          <div className="mt-1 font-black text-flat-yellow">
                            {money(
                              myShare,
                            )}{" "}
                            FLAT
                          </div>
                        </div>
                      </div>

                      <div className="mt-5 grid grid-cols-3 gap-2 text-center">
                        <div className="rounded-xl bg-black p-3">
                          <div className="font-black">
                            {money(
                              item.likes,
                            )}
                          </div>

                          <div className="mt-1 text-[10px] text-zinc-600">
                            좋아요
                          </div>

                          <div className="mt-1 text-[10px] text-zinc-700">
                            무료
                          </div>
                        </div>

                        <div className="rounded-xl bg-black p-3">
                          <div className="font-black">
                            {money(
                              item.greats,
                            )}
                          </div>

                          <div className="mt-1 text-[10px] text-zinc-600">
                            멋져요
                          </div>

                          <div className="mt-1 text-[10px] text-zinc-500">
                            총{" "}
                            {money(
                              greatGross,
                            )}{" "}
                            FLAT
                          </div>
                        </div>

                        <div className="rounded-xl bg-black p-3">
                          <div className="font-black">
                            {money(
                              item.bests,
                            )}
                          </div>

                          <div className="mt-1 text-[10px] text-zinc-600">
                            최고예요
                          </div>

                          <div className="mt-1 text-[10px] text-zinc-500">
                            총{" "}
                            {money(
                              bestGross,
                            )}{" "}
                            FLAT
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 flex items-center justify-between border-t border-white/[0.06] pt-4 text-sm">
                        <span className="text-zinc-500">
                          영상 후원 총액
                        </span>

                        <span className="font-bold">
                          {money(
                            gross,
                          )}{" "}
                          FLAT
                        </span>
                      </div>

                      <div className="mt-2 flex items-center justify-between text-sm">
                        <span className="text-zinc-500">
                          내 수익 {videoCreatorRate}%
                        </span>

                        <span className="font-black text-flat-yellow">
                          {money(
                            myShare,
                          )}{" "}
                          FLAT
                        </span>
                      </div>
                    </div>
                  );
                },
              )
            )}
          </div>
        </section>

      </div>
    </main>
  );
}
