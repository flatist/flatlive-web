import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";

import { AuthService } from "@/lib/auth/auth-service";
import { SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { readFlits } from "@/lib/flit/flit-store";
import { readVods } from "@/lib/vod/vod-store";
import { WalletService } from "@/lib/wallet/wallet-service";

function money(
  value: number,
) {
  return value.toLocaleString(
    "ko-KR",
  );
}

export default async function ContentRevenuePage() {
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
  ] = await Promise.all([
    walletService
      .getReceivedDonationSummary(
        snapshot.userId,
      ),
    readFlits(),
    readVods(),
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

  const reactionCreatorShare =
    reactionGross / 2;

  return (
    <main className="min-h-screen bg-black px-4 pb-28 pt-8 text-white md:px-6 md:pt-24">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-black tracking-widest text-flat-yellow">
              CONTENT REVENUE
            </p>

            <h1 className="mt-2 text-3xl font-black">
              영상 반응 수익
            </h1>

            <p className="mt-2 text-sm text-zinc-500">
              FLIT과 VOD에서 받은 반응과
              수익을 확인합니다.
            </p>
          </div>

          <Link
            href="/profile/revenue"
            className="rounded-full border border-white/15 px-4 py-2 text-xs font-bold hover:bg-white hover:text-black"
          >
            받은 수익
          </Link>
        </div>

        <section className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/[0.08] bg-zinc-950 p-5">
            <div className="text-xs font-bold text-zinc-500">
              반응 총 발생액
            </div>

            <div className="mt-2 text-2xl font-black">
              {money(
                reactionGross,
              )}{" "}
              <span className="text-sm text-zinc-500">
                FLAT
              </span>
            </div>
          </div>

          <div className="rounded-2xl border border-flat-yellow/30 bg-zinc-950 p-5">
            <div className="text-xs font-bold text-flat-yellow">
              내 수익 50%
            </div>

            <div className="mt-2 text-2xl font-black">
              {money(
                reactionCreatorShare,
              )}{" "}
              <span className="text-sm text-zinc-500">
                FLAT
              </span>
            </div>
          </div>

          <div className="rounded-2xl border border-white/[0.08] bg-zinc-950 p-5">
            <div className="text-xs font-bold text-zinc-500">
              실제 적립
            </div>

            <div className="mt-2 text-2xl font-black">
              {money(
                revenue.contentReceived,
              )}{" "}
              <span className="text-sm text-zinc-500">
                FLAT
              </span>
            </div>

            <div className="mt-1 text-[11px] text-zinc-600">
              CREATOR 원장 기준
            </div>
          </div>
        </section>

        <section className="mt-10">
          <div className="mb-4">
            <h2 className="text-xl font-black">
              내 영상별 반응
            </h2>

            <p className="mt-1 text-xs text-zinc-600">
              좋아요는 무료입니다.
              멋져요 10 FLAT,
              최고예요 50 FLAT이며
              계정주 수익은 50%입니다.
            </p>
          </div>

          {contentRows.length ===
          0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 py-12 text-center text-sm text-zinc-600">
              아직 등록한 영상이 없습니다.
            </div>
          ) : (
            <div className="space-y-3">
              {contentRows.map(
                (item) => {
                  const greatGross =
                    item.greats * 10;

                  const bestGross =
                    item.bests * 50;

                  const gross =
                    greatGross +
                    bestGross;

                  const myShare =
                    gross / 2;

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
                            내 수익 50%
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
                          총 발생액
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
                          계정주 수익 50%
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
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
