import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import {
  parseSessionToken,
  SESSION_COOKIE_NAME,
} from "@/lib/auth/session";
import { FitService } from "@/lib/fit/fit-service";

function formatAmount(
  value: number,
) {
  return new Intl.NumberFormat(
    "ko-KR",
  ).format(value);
}

const ACTIVITY_LABELS: Record<
  string,
  string
> = {
  DAILY_LOGIN: "일일 로그인",
  PROFILE_COMPLETE: "프로필 완성",
  LIVE_WATCH: "LIVE 시청",
  LIVE_CHAT: "LIVE 댓글",
  LIVE_LIKE: "LIVE 좋아요",
  LIVE_SHARE: "LIVE 공유",
  LIVE_FOLLOW: "LIVE 방송 팔로우",
  LIVE_DONATION: "LIVE 후원",
  CLUTCH_PARTICIPATE: "CLUTCH 참여",
  CLUTCH_WATCH: "CLUTCH 시청",
  FLIT_WATCH: "FLIT 시청",
  FLIT_LIKE: "FLIT 좋아요",
  FLIT_COMMENT: "FLIT 댓글",
  FLIT_SHARE: "FLIT 공유",
  FLIT_GREAT: "FLIT 멋져요",
  FLIT_BEST: "FLIT 최고예요",
  VOD_WATCH: "VOD 시청",
  VOD_LIKE: "VOD 좋아요",
  VOD_COMMENT: "VOD 댓글",
  VOD_GREAT: "VOD 멋져요",
  VOD_BEST: "VOD 최고예요",
  FOLLOW_USER: "계정 팔로우",
  LOUNGE_VISIT: "라운지 방문",
  LOUNGE_ACTIVITY: "라운지 활동",
  PLSHOP_VISIT: "플핑 방문",
  PLSHOP_PURCHASE: "플핑 구매",
  PLSHOP_REVIEW: "플핑 리뷰",
  EVENT: "이벤트",
};

function sourceLabel(
  sourceType: string,
) {
  if (
    sourceType.startsWith(
      "FIT_ACTIVITY:",
    )
  ) {
    const code =
      sourceType.slice(
        "FIT_ACTIVITY:".length,
      );

    return (
      ACTIVITY_LABELS[code] ??
      code
    );
  }

  return sourceType;
}

export default async function FitPage() {
  const token =
    (await cookies()).get(
      SESSION_COOKIE_NAME,
    )?.value;

  const userId =
    token
      ? parseSessionToken(token)
          ?.userId ?? null
      : null;

  if (!userId) {
    redirect("/login");
  }

  const fit =
    await new FitService().getSummary(
      userId,
    );

  return (
    <main className="min-h-screen bg-black px-4 pb-28 pt-8 text-white md:px-6 md:pt-24">
      <div className="mx-auto max-w-4xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black tracking-[0.24em] text-yellow-400">
              FIT POINT
            </p>

            <h1 className="mt-2 text-3xl font-black">
              내 FIT
            </h1>

            <p className="mt-2 text-sm leading-6 text-zinc-500">
              플랫라이브 활동으로 적립되는 포인트입니다.
              활동별 지급량과 일일 한도는 관리자 설정을 따릅니다.
            </p>
          </div>

          <Link
            href="/profile"
            className="shrink-0 rounded-full border border-white/15 px-4 py-2 text-xs font-bold transition hover:bg-white hover:text-black"
          >
            마이로
          </Link>
        </div>

        <section className="mt-8 grid gap-3 md:grid-cols-2">
          <article className="rounded-3xl border border-yellow-400/20 bg-gradient-to-br from-zinc-950 to-yellow-950/25 p-6">
            <p className="text-sm font-black text-yellow-300">
              현재 보유 FIT
            </p>

            <p className="mt-3 text-4xl font-black">
              {formatAmount(
                fit.balanceFit,
              )}
            </p>

            <p className="mt-2 text-xs text-zinc-500">
              현재 사용 가능한 FIT 잔액
            </p>
          </article>

          <article className="rounded-3xl border border-white/10 bg-zinc-950 p-6">
            <p className="text-sm font-black text-zinc-400">
              총 적립 FIT
            </p>

            <p className="mt-3 text-4xl font-black">
              {formatAmount(
                fit.totalEarnedFit,
              )}
            </p>

            <p className="mt-2 text-xs text-zinc-500">
              지금까지 정상 적립된 CREDIT 합계
            </p>
          </article>
        </section>

        <button
          type="button"
          disabled
          className="mt-4 w-full rounded-2xl border border-yellow-400/20 bg-yellow-400/10 px-4 py-4 text-sm font-black text-yellow-300 opacity-70"
        >
          시아로 전환 · 준비중
        </button>

        <section className="mt-8 rounded-3xl border border-white/10 bg-zinc-950 p-5 md:p-6">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-black tracking-[0.2em] text-zinc-600">
                HISTORY
              </p>

              <h2 className="mt-1 text-xl font-black">
                최근 FIT 내역
              </h2>
            </div>

            <span className="text-xs text-zinc-600">
              최근 50건
            </span>
          </div>

          {fit.recentTransactions.length ===
          0 ? (
            <div className="py-12 text-center text-sm text-zinc-600">
              아직 FIT 적립 내역이 없습니다.
            </div>
          ) : (
            <div className="mt-4 divide-y divide-white/5">
              {fit.recentTransactions.map(
                (entry) => (
                  <div
                    key={
                      entry.transactionId
                    }
                    className="flex items-center justify-between gap-4 py-4"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black">
                        {sourceLabel(
                          entry.sourceType,
                        )}
                      </p>

                      <p className="mt-1 text-xs text-zinc-600">
                        {new Date(
                          entry.createdAt,
                        ).toLocaleString(
                          "ko-KR",
                        )}
                      </p>
                    </div>

                    <div className="shrink-0 text-right">
                      <p
                        className={[
                          "font-black",
                          entry.direction ===
                          "CREDIT"
                            ? "text-yellow-300"
                            : "text-red-300",
                        ].join(" ")}
                      >
                        {entry.direction ===
                        "CREDIT"
                          ? "+"
                          : "-"}
                        {formatAmount(
                          entry.amount,
                        )}{" "}
                        FIT
                      </p>

                      <p className="mt-1 text-xs text-zinc-600">
                        잔액{" "}
                        {formatAmount(
                          entry.balanceAfter,
                        )}
                      </p>
                    </div>
                  </div>
                ),
              )}
            </div>
          )}
        </section>

        <p className="mt-5 text-xs leading-5 text-zinc-600">
          FIT은 FLAT과 별도 자산으로 관리합니다.
          시아 전환은 실제 연동 API가 준비된 뒤 활성화합니다.
        </p>
      </div>
    </main>
  );
}
