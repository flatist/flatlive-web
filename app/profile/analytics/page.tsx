import Link from "next/link";
import AnalyticsLiveRefresh from "./AnalyticsLiveRefresh";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import {
  AuthService,
} from "@/lib/auth/auth-service";

import {
  SESSION_COOKIE_NAME,
} from "@/lib/auth/session";

import {
  readLiveAnalyticsByBroadcaster,
} from "@/lib/analytics/live-analytics-store";

import {
  readFlits,
} from "@/lib/flit/flit-store";

import {
  readVods,
} from "@/lib/vod/vod-store";


import {
  readAllVideoAnalytics,
} from "@/lib/analytics/video-analytics-store";

import {
  WalletService,
} from "@/lib/wallet/wallet-service";

function formatNumber(
  value: number,
) {
  return new Intl.NumberFormat(
    "ko-KR",
  ).format(value);
}

function formatDate(
  value: number,
) {
  return new Intl.DateTimeFormat(
    "ko-KR",
    {
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    },
  ).format(
    new Date(value),
  );
}

function formatDuration(
  value: number,
) {
  const safe =
    Math.max(
      0,
      Math.floor(value),
    );

  const totalMinutes =
    Math.floor(
      safe / 60000,
    );

  const hours =
    Math.floor(
      totalMinutes / 60,
    );

  const minutes =
    totalMinutes % 60;

  if (hours > 0) {
    return `${hours}시간 ${minutes}분`;
  }

  if (minutes > 0) {
    return `${minutes}분`;
  }

  const seconds =
    Math.floor(
      safe / 1000,
    );

  return `${seconds}초`;
}

const AGE_GROUPS = [
  "10대",
  "20대",
  "30대",
  "40대",
  "50대",
  "60대+",
  "연령 미확인",
];

export default async function ProfileAnalyticsPage() {
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
    liveRecords,
    allFlits,
    allVods,
    revenue,
    videoAnalyticsRecords,
  ] =
    await Promise.all([
      readLiveAnalyticsByBroadcaster(
        snapshot.userId,
      ),

      readFlits(),

      readVods(),

      walletService
        .getReceivedDonationSummary(
          snapshot.userId,
        ),

      readAllVideoAnalytics(),
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

  const totalContentViews =
    myFlits.reduce(
      (
        sum,
        item,
      ) =>
        sum +
        (Number(
          item.views,
        ) || 0),
      0,
    ) +
    myVods.reduce(
      (
        sum,
        item,
      ) =>
        sum +
        (Number(
          item.views,
        ) || 0),
      0,
    );

  const now =
    Date.now();

  const totalLiveDuration =
    liveRecords.reduce(
      (
        sum,
        item,
      ) => {
        const duration =
          item.endedAt !==
          null
            ? item.durationMs
            : Math.max(
                0,
                now -
                  item.startedAt,
              );

        return (
          sum +
          duration
        );
      },
      0,
    );

  const totalUniqueViewerEntries =
    liveRecords.reduce(
      (
        sum,
        item,
      ) =>
        sum +
        item.totalUniqueViewers,
      0,
    );

  const peakConcurrentViewers =
    liveRecords.reduce(
      (
        peak,
        item,
      ) =>
        Math.max(
          peak,
          item
            .peakConcurrentViewers,
        ),
      0,
    );

  const recentLives =
    [...liveRecords]
      .sort(
        (
          a,
          b,
        ) =>
          b.startedAt -
          a.startedAt,
      )
      .slice(
        0,
        10,
      );

  function getVideoPerformance(
    type: "FLIT" | "VOD",
    contentId: string,
  ) {
    const sessions =
      videoAnalyticsRecords.filter(
        (record) =>
          record.contentType === type &&
          record.contentId === contentId,
      );

    const uniqueViewers =
      new Set(
        sessions.map(
          (record) =>
            record.viewerUserId
              ? `USER:${record.viewerUserId}`
              : `SESSION:${record.viewerSessionId}`,
        ),
      ).size;

    const totalWatchedSeconds =
      sessions.reduce(
        (sum, record) =>
          sum +
          (
            Number(
              record.watchedSeconds,
            ) || 0
          ),
        0,
      );

    const averageWatchSeconds =
      sessions.length > 0
        ? totalWatchedSeconds /
          sessions.length
        : 0;

    const completedSessions =
      sessions.filter(
        (record) =>
          record.completed === true,
      ).length;

    const completionRate =
      sessions.length > 0
        ? (
            completedSessions /
            sessions.length
          ) * 100
        : 0;

    const totalPlayCount =
      sessions.reduce(
        (sum, record) =>
          sum +
          (
            Number(
              record.playCount,
            ) || 0
          ),
        0,
      );

    const replayCount =
      sessions.reduce(
        (sum, record) =>
          sum +
          Math.max(
            0,
            (
              Number(
                record.playCount,
              ) || 0
            ) - 1,
          ),
        0,
      );

    const durationSeconds =
      sessions.reduce(
        (max, record) =>
          Math.max(
            max,
            Number(
              record.durationSeconds,
            ) || 0,
          ),
        0,
      );

    const bucketCounts =
      new Map<number, number>();

    for (const record of sessions) {
      for (
        const bucket
        of record.reachedBuckets || []
      ) {
        bucketCounts.set(
          bucket,
          (
            bucketCounts.get(
              bucket,
            ) || 0
          ) + 1,
        );
      }
    }

    const reached = Array.from(
      bucketCounts.entries(),
    ).sort(
      (a, b) =>
        a[0] - b[0],
    );

    let biggestDropSecond:
      number | null =
      null;

    let biggestDropCount =
      0;

    for (
      let index = 1;
      index < reached.length;
      index += 1
    ) {
      const previous =
        reached[index - 1][1];

      const current =
        reached[index][1];

      const drop =
        previous - current;

      if (
        drop >
        biggestDropCount
      ) {
        biggestDropCount =
          drop;

        biggestDropSecond =
          reached[index][0];
      }
    }

    const sourceCounts =
      new Map<string, number>();

    for (const record of sessions) {
      const source =
        record.source ||
        "UNKNOWN";

      sourceCounts.set(
        source,
        (
          sourceCounts.get(
            source,
          ) || 0
        ) + 1,
      );
    }

    const topSource =
      Array.from(
        sourceCounts.entries(),
      ).sort(
        (a, b) =>
          b[1] - a[1],
      )[0]?.[0] ||
      "-";

    return {
      sessionCount:
        sessions.length,

      uniqueViewers,

      totalWatchedSeconds,

      averageWatchSeconds,

      completionRate,

      completedSessions,

      totalPlayCount,

      replayCount,

      durationSeconds,

      biggestDropSecond,

      topSource,
    };
  }

  const contentItems = [
    ...myFlits.map(
      (item) => ({
        id:
          item.id,

        type:
          "FLIT" as const,

        title:
          item.title,

        views:
          Number(
            item.views,
          ) || 0,

        likes:
          Number(
            item.likes,
          ) || 0,

        greats:
          Number(
            item.greats,
          ) || 0,

        bests:
          Number(
            item.bests,
          ) || 0,

        createdAt:
          item.createdAt,

        analytics:
          getVideoPerformance(
            "FLIT",
            item.id,
          ),
      }),
    ),

    ...myVods.map(
      (item) => ({
        id:
          item.id,

        type:
          "VOD" as const,

        title:
          item.title,

        views:
          Number(
            item.views,
          ) || 0,

        likes:
          Number(
            item.likes,
          ) || 0,

        greats:
          Number(
            item.greats,
          ) || 0,

        bests:
          Number(
            item.bests,
          ) || 0,

        createdAt:
          item.createdAt,

        analytics:
          getVideoPerformance(
            "VOD",
            item.id,
          ),
      }),
    ),
  ]
    .sort(
      (
        a,
        b,
      ) =>
        new Date(
          b.createdAt,
        ).getTime() -
        new Date(
          a.createdAt,
        ).getTime(),
    )
    .slice(
      0,
      10,
    );

  const liveSummary = [
    {
      label:
        "총 방송",

      value:
        `${formatNumber(
          liveRecords.length,
        )}회`,

      caption:
        "분석 기록 기준",
    },
    {
      label:
        "총 방송 시간",

      value:
        formatDuration(
          totalLiveDuration,
        ),

      caption:
        "진행 중 포함",
    },
    {
      label:
        "최고 동시",

      value:
        `${formatNumber(
          peakConcurrentViewers,
        )}명`,

      caption:
        "전체 LIVE 최고",
    },
    {
      label:
        "받은 FLAT",

      value:
        formatNumber(
          revenue.liveReceived,
        ),

      caption:
        `${formatNumber(
          revenue.liveCount,
        )}건의 LIVE 후원`,
    },
  ];

  return (
    <main className="min-h-screen bg-black px-4 pb-28 pt-8 text-white md:px-6 md:pt-24">
      <AnalyticsLiveRefresh />

      <div className="mx-auto max-w-6xl">

        <header className="mb-8">
          <Link
            href="/profile"
            className="text-sm font-bold text-zinc-500 transition hover:text-white"
          >
            ← 마이페이지
          </Link>

          <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="text-xs font-black tracking-[0.2em] text-flat-yellow">
                CREATOR ANALYTICS
              </div>

              <h1 className="mt-2 text-3xl font-black">
                콘텐츠 분석
              </h1>

              <p className="mt-2 text-sm text-zinc-500">
                실제 활동 데이터를 기준으로 집계합니다.
              </p>
            </div>

            <div className="rounded-full border border-white/10 bg-zinc-950 px-4 py-2 text-xs font-bold text-zinc-400">
              현재 기준 · 전체
            </div>
          </div>
        </header>

        <section>
          <div className="mb-4">
            <div className="text-xs font-black tracking-[0.16em] text-flat-yellow">
              LIVE SUMMARY
            </div>

            <div className="mt-1 flex items-end justify-between gap-3">
              <div>
                <h2 className="text-xl font-black">
                  LIVE 누적 성과
                </h2>

                <p className="mt-1 text-xs text-zinc-600">
                  지금까지 방송한 전체 LIVE 기준
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {liveSummary.map(
              (
                item,
                index,
              ) => (
                <article
                  key={
                    item.label
                  }
                  className={`relative overflow-hidden rounded-2xl border p-5 ${
                    index ===
                    3
                      ? "border-flat-yellow/30 bg-flat-yellow/[0.07]"
                      : "border-white/[0.08] bg-zinc-950"
                  }`}
                >
                  <div className="text-xs font-bold text-zinc-500">
                    {
                      item.label
                    }
                  </div>

                  <div
                    className={`mt-2 break-words text-2xl font-black md:text-3xl ${
                      index ===
                      3
                        ? "text-flat-yellow"
                        : "text-white"
                    }`}
                  >
                    {
                      item.value
                    }
                  </div>

                  <div className="mt-2 text-[11px] text-zinc-600">
                    {
                      item.caption
                    }
                  </div>
                </article>
              ),
            )}
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-white/[0.08] bg-zinc-950 px-5 py-4">
              <div className="text-xs text-zinc-500">
                방송별 순 시청자 합계
              </div>

              <div className="mt-1 text-xl font-black">
                {formatNumber(
                  totalUniqueViewerEntries,
                )}
                명
              </div>

              <div className="mt-1 text-[10px] text-zinc-700">
                방송별 중복 제거 후 합산
              </div>
            </div>

            <div className="rounded-2xl border border-white/[0.08] bg-zinc-950 px-5 py-4">
              <div className="text-xs text-zinc-500">
                FLIT · VOD 총 조회수
              </div>

              <div className="mt-1 text-xl font-black">
                {formatNumber(
                  totalContentViews,
                )}
              </div>

              <div className="mt-1 text-[10px] text-zinc-700">
                내 영상 콘텐츠 누적
              </div>
            </div>
          </div>
        </section>

        <section className="mt-10">
          <div className="mb-4">
            <div className="text-xs font-black tracking-[0.16em] text-flat-yellow">
              RECENT LIVE
            </div>

            <h2 className="mt-1 text-xl font-black">
              최근 LIVE 성과
            </h2>

            <p className="mt-1 text-xs text-zinc-600">
              방송별 성과를 한눈에 확인합니다.
            </p>
          </div>

          {recentLives.length ===
          0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 bg-zinc-950 px-5 py-12 text-center text-sm text-zinc-600">
              아직 분석 기록이 있는 LIVE가 없습니다.
            </div>
          ) : (
            <div className="space-y-3">
              {recentLives.map(
                (
                  item,
                ) => {
                  const duration =
                    item.endedAt !==
                    null
                      ? item.durationMs
                      : Math.max(
                          0,
                          now -
                            item.startedAt,
                        );

                  return (
                    <article
                      key={
                        item.roomId
                      }
                      className="overflow-hidden rounded-2xl border border-white/[0.08] bg-zinc-950"
                    >
                      <div className="border-b border-white/[0.06] px-5 py-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-black text-flat-yellow">
                                LIVE
                              </span>

                              <span className="text-[10px] font-bold text-zinc-600">
                                {
                                  item.category
                                }
                              </span>

                              {item.endedAt ===
                              null ? (
                                <span className="rounded-full bg-red-500/15 px-2 py-1 text-[10px] font-black text-red-400">
                                  방송 중
                                </span>
                              ) : (
                                <span className="rounded-full bg-white/5 px-2 py-1 text-[10px] font-bold text-zinc-500">
                                  종료
                                </span>
                              )}
                            </div>

                            <h3 className="mt-2 truncate text-base font-black">
                              {
                                item.title
                              }
                            </h3>

                            <p className="mt-1 text-xs text-zinc-600">
                              {formatDate(
                                item.startedAt,
                              )}
                            </p>
                          </div>

                          <div className="text-right">
                            <div className="text-[10px] text-zinc-600">
                              방송시간
                            </div>

                            <div className="mt-1 text-sm font-black">
                              {formatDuration(
                                duration,
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 divide-x divide-white/[0.06]">
                        <div className="px-5 py-4 text-center">
                          <div className="text-[10px] text-zinc-600">
                            순 시청자
                          </div>

                          <div className="mt-1 text-xl font-black">
                            {formatNumber(
                              item.totalUniqueViewers,
                            )}
                            명
                          </div>
                        </div>

                        <div className="px-5 py-4 text-center">
                          <div className="text-[10px] text-zinc-600">
                            최고 동시
                          </div>

                          <div className="mt-1 text-xl font-black">
                            {formatNumber(
                              item.peakConcurrentViewers,
                            )}
                            명
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                },
              )}
            </div>
          )}
        </section>

        <section className="mt-10">
          <div className="mb-4">
            <div className="text-xs font-black tracking-[0.16em] text-flat-yellow">
              VIDEO PERFORMANCE
            </div>

            <h2 className="mt-1 text-xl font-black">
              FLIT · VOD 성과
            </h2>

            <p className="mt-1 text-xs text-zinc-600">
              최근 콘텐츠의 조회와 반응
            </p>
          </div>

          <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-zinc-950">
            {contentItems.length ===
            0 ? (
              <div className="px-5 py-10 text-center text-sm text-zinc-600">
                아직 분석할 FLIT 또는 VOD가 없습니다.
              </div>
            ) : (
              contentItems.map(
                (
                  item,
                ) => (
                  <article
                    key={`${item.type}-${item.id}`}
                    className="border-b border-white/[0.06] p-5 last:border-b-0"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-[10px] font-black text-flat-yellow">
                          {
                            item.type
                          }
                        </div>

                        <div className="mt-1 truncate text-sm font-black">
                          {
                            item.title
                          }
                        </div>
                      </div>

                      <div className="shrink-0 text-right">
                        <div className="text-[10px] text-zinc-600">
                          조회수
                        </div>

                        <div className="mt-1 text-xl font-black">
                          {formatNumber(
                            item.views,
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-3 gap-2">
                      <div className="rounded-xl bg-black px-3 py-3 text-center">
                        <div className="text-[10px] text-zinc-600">
                          좋아요
                        </div>

                        <div className="mt-1 font-black">
                          {formatNumber(
                            item.likes,
                          )}
                        </div>
                      </div>

                      <div className="rounded-xl bg-black px-3 py-3 text-center">
                        <div className="text-[10px] text-zinc-600">
                          멋져요
                        </div>

                        <div className="mt-1 font-black">
                          {formatNumber(
                            item.greats,
                          )}
                        </div>
                      </div>

                      <div className="rounded-xl bg-black px-3 py-3 text-center">
                        <div className="text-[10px] text-zinc-600">
                          최고예요
                        </div>

                        <div className="mt-1 font-black">
                          {formatNumber(
                            item.bests,
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
                      <div className="rounded-xl border border-white/[0.06] bg-black/50 px-3 py-3">
                        <div className="text-[10px] text-zinc-600">
                          평균 시청시간
                        </div>

                        <div className="mt-1 text-sm font-black">
                          {item.analytics.sessionCount > 0
                            ? `${item.analytics.averageWatchSeconds.toFixed(1)}초`
                            : "-"}
                        </div>
                      </div>

                      <div className="rounded-xl border border-white/[0.06] bg-black/50 px-3 py-3">
                        <div className="text-[10px] text-zinc-600">
                          완주율
                        </div>

                        <div className="mt-1 text-sm font-black">
                          {item.analytics.sessionCount > 0
                            ? `${item.analytics.completionRate.toFixed(1)}%`
                            : "-"}
                        </div>
                      </div>

                      <div className="rounded-xl border border-white/[0.06] bg-black/50 px-3 py-3">
                        <div className="text-[10px] text-zinc-600">
                          순 시청자
                        </div>

                        <div className="mt-1 text-sm font-black">
                          {formatNumber(
                            item.analytics.uniqueViewers,
                          )}
                          명
                        </div>
                      </div>

                      <div className="rounded-xl border border-white/[0.06] bg-black/50 px-3 py-3">
                        <div className="text-[10px] text-zinc-600">
                          재생 횟수
                        </div>

                        <div className="mt-1 text-sm font-black">
                          {formatNumber(
                            item.analytics.totalPlayCount,
                          )}
                          회
                        </div>
                      </div>
                    </div>

                    <div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-4">
                      <div className="rounded-xl border border-white/[0.06] bg-black/30 px-3 py-3">
                        <div className="text-[10px] text-zinc-600">
                          총 시청시간
                        </div>

                        <div className="mt-1 text-xs font-black">
                          {item.analytics.sessionCount > 0
                            ? `${item.analytics.totalWatchedSeconds.toFixed(1)}초`
                            : "-"}
                        </div>
                      </div>

                      <div className="rounded-xl border border-white/[0.06] bg-black/30 px-3 py-3">
                        <div className="text-[10px] text-zinc-600">
                          반복재생
                        </div>

                        <div className="mt-1 text-xs font-black">
                          {formatNumber(
                            item.analytics.replayCount,
                          )}
                          회
                        </div>
                      </div>

                      <div className="rounded-xl border border-white/[0.06] bg-black/30 px-3 py-3">
                        <div className="text-[10px] text-zinc-600">
                          주요 이탈 구간
                        </div>

                        <div className="mt-1 text-xs font-black">
                          {item.analytics.biggestDropSecond !== null
                            ? `${item.analytics.biggestDropSecond}초 부근`
                            : "-"}
                        </div>
                      </div>

                      <div className="rounded-xl border border-white/[0.06] bg-black/30 px-3 py-3">
                        <div className="text-[10px] text-zinc-600">
                          주요 유입
                        </div>

                        <div className="mt-1 truncate text-xs font-black">
                          {item.analytics.topSource}
                        </div>
                      </div>
                    </div>
                  </article>
                ),
              )
            )}
          </div>
        </section>

        <section className="mt-10">
          <div className="mb-4">
            <div className="text-xs font-black tracking-[0.16em] text-zinc-600">
              AUDIENCE
            </div>

            <h2 className="mt-1 text-lg font-black text-zinc-300">
              시청자 분석
            </h2>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-white/[0.06] bg-zinc-950 p-5">
              <div className="text-sm font-black">
                영상 시청 분석
              </div>

              <div className="mt-2 text-xs text-zinc-600">
                평균 시청시간·완주율·반복재생·이탈구간 적용 완료
              </div>
            </div>

            <div className="rounded-2xl border border-white/[0.06] bg-zinc-950 p-5">
              <div className="text-sm font-black">
                신규 팔로워
              </div>

              <div className="mt-2 text-xs text-zinc-600">
                방송·콘텐츠별 팔로우 유입 집계 예정
              </div>
            </div>

            <div className="rounded-2xl border border-white/[0.06] bg-zinc-950 p-5">
              <div className="text-sm font-black">
                시청자 연령대
              </div>

              <div className="mt-2 text-xs text-zinc-600">
                확인 가능한 정보만 집계하도록 준비
              </div>
            </div>
          </div>

          <div className="mt-4 hidden">
            {AGE_GROUPS.map(
              (
                age,
              ) => (
                <span
                  key={
                    age
                  }
                >
                  {age}
                </span>
              ),
            )}
          </div>
        </section>

        <p className="mt-8 text-xs leading-5 text-zinc-700">
          순 시청자 수는 각 방송 안에서 중복 입장을 제거한 값입니다.
          여러 방송을 합산하면 같은 사람이 서로 다른 방송을 시청한 경우
          방송별로 각각 집계될 수 있습니다.
        </p>

      </div>
    </main>
  );
}
