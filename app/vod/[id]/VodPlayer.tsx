"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

export default function VodPlayer({
  vodId,
  videoUrl,
  initialViews,
  isAdult,
}: {
  vodId: string;
  videoUrl: string;
  initialViews: number;
  isAdult: boolean;
}) {
  const [views, setViews] =
    useState(initialViews);

  const [
    adultAccess,
    setAdultAccess,
  ] = useState<
    | "checking"
    | "allowed"
    | "login-required"
    | "verification-required"
    | "error"
  >(isAdult ? "checking" : "allowed");

  useEffect(() => {
    if (!isAdult) {
      setAdultAccess("allowed");
      return;
    }

    let cancelled = false;

    async function checkAdultAccess() {
      try {
        const response =
          await fetch(
            "/api/adult/status",
            {
              cache: "no-store",
            },
          );

        const data =
          await response.json();

        if (cancelled) {
          return;
        }

        if (
          !response.ok ||
          !data.success
        ) {
          setAdultAccess("error");
          return;
        }

        if (data.loggedIn !== true) {
          setAdultAccess(
            "login-required",
          );
          return;
        }

        if (data.verified !== true) {
          setAdultAccess(
            "verification-required",
          );
          return;
        }

        setAdultAccess("allowed");
      } catch (error) {
        console.error(
          "VOD ADULT STATUS FAILED:",
          error,
        );

        if (!cancelled) {
          setAdultAccess("error");
        }
      }
    }

    void checkAdultAccess();

    return () => {
      cancelled = true;
    };
  }, [isAdult]);

  const analyticsSessionRef =
    useRef("");

  const analyticsPointRef =
    useRef({
      lastTime: 0,
      lastSentAt: 0,
      pendingWatched: 0,
    });

  function getAnalyticsSessionId() {
    if (
      analyticsSessionRef.current
    ) {
      return analyticsSessionRef.current;
    }

    const storageKey =
      "flatlive-video-analytics-session";

    try {
      const existing =
        window.sessionStorage.getItem(
          storageKey,
        );

      if (existing) {
        analyticsSessionRef.current =
          existing;

        return existing;
      }

      const next =
        crypto.randomUUID();

      window.sessionStorage.setItem(
        storageKey,
        next,
      );

      analyticsSessionRef.current =
        next;

      return next;
    } catch {
      const fallback =
        crypto.randomUUID();

      analyticsSessionRef.current =
        fallback;

      return fallback;
    }
  }

  function sendAnalyticsEvent(
    eventType:
      | "PLAY"
      | "PAUSE"
      | "PROGRESS"
      | "SEEK"
      | "COMPLETE",
    video:
      HTMLVideoElement,
    watchedDelta = 0,
  ) {
    if (
      adultAccess !==
      "allowed"
    ) {
      return;
    }

    const duration =
      Number.isFinite(
        video.duration,
      )
        ? video.duration
        : 0;

    const currentTime =
      Number.isFinite(
        video.currentTime,
      )
        ? video.currentTime
        : 0;

    void fetch(
      "/api/analytics/video",
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
        },
        body:
          JSON.stringify({
            contentType:
              "VOD",

            contentId:
              vodId,

            viewerSessionId:
              getAnalyticsSessionId(),

            source:
              "VOD_DETAIL",

            eventType,

            currentTime,

            duration,

            watchedDelta,
          }),
      },
    ).catch(
      (error) => {
        console.error(
          "VOD ANALYTICS ERROR:",
          error,
        );
      },
    );
  }

  const countedRef =
    useRef(false);

  const playbackRef =
    useRef({
      lastTime: 0,
      watched: 0,
      fitWatchSeconds: 30,
      lastFitInterval: 0,
      fitPending: false,
    });

  function resetPoint(
    currentTime: number,
  ) {
    playbackRef.current.lastTime =
      currentTime;
  }

  function trackPlayback(
    video: HTMLVideoElement,
  ) {
    const currentTime =
      video.currentTime;

    const delta =
      currentTime -
      playbackRef.current.lastTime;

    if (
      !video.paused &&
      !video.seeking &&
      delta > 0 &&
      delta <= 1.5
    ) {
      playbackRef.current.watched +=
        delta;
    }

    playbackRef.current.lastTime =
      currentTime;

    const shouldCountView =
      !countedRef.current &&
      playbackRef.current.watched >= 3;

    const intervalIndex =
      Math.floor(
        playbackRef.current.watched /
          Math.max(
            1,
            playbackRef.current
              .fitWatchSeconds,
          ),
      );

    const shouldAwardFit =
      intervalIndex >
        playbackRef.current
          .lastFitInterval &&
      !playbackRef.current
        .fitPending;

    if (
      !shouldCountView &&
      !shouldAwardFit
    ) {
      return;
    }

    if (shouldCountView) {
      countedRef.current = true;
    }

    if (shouldAwardFit) {
      playbackRef.current.fitPending =
        true;
    }

    void fetch(
      "/api/vod/view",
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          vodId,
          countView:
            shouldCountView,
          watchedSeconds:
            playbackRef.current
              .watched,
          fitIntervalIndex:
            shouldAwardFit
              ? intervalIndex
              : 0,
        }),
      },
    )
      .then(async (response) => {
        const data =
          await response.json();

        if (
          response.ok &&
          data.success
        ) {
          if (
            typeof data.fitWatchSeconds ===
              "number" &&
            data.fitWatchSeconds > 0
          ) {
            playbackRef.current.fitWatchSeconds =
              Math.floor(
                data.fitWatchSeconds,
              );
          }

          if (
            shouldAwardFit
          ) {
            playbackRef.current.lastFitInterval =
              intervalIndex;
          }

          if (
            shouldCountView &&
            typeof data.views ===
              "number"
          ) {
            setViews(
              data.views,
            );
          }

          return;
        }

        console.error(
          "VOD VIEW/FIT ERROR",
          data,
        );
      })
      .catch((error) => {
        console.error(
          "VOD VIEW/FIT NETWORK ERROR",
          error,
        );
      })
      .finally(() => {
        if (shouldAwardFit) {
          playbackRef.current.fitPending =
            false;
        }
      });
  }

  return (
    <>
      <div className="relative aspect-video overflow-hidden rounded-[22px] border border-white/[0.08] bg-black">
        <video
          src={
            adultAccess === "allowed"
              ? videoUrl
              : undefined
          }
          controls
          controlsList="nodownload noremoteplayback"
          disablePictureInPicture
          disableRemotePlayback
          playsInline
          preload="metadata"
          draggable={false}
          onContextMenu={(event) => {
            event.preventDefault();
          }}
          onDragStart={(event) => {
            event.preventDefault();
          }}
          onEnded={(event) => {
            const video =
              event.currentTarget;

            analyticsPointRef.current.lastTime =
              video.currentTime;

            if (
              analyticsPointRef.current.pendingWatched >
              0
            ) {
              sendAnalyticsEvent(
                "PROGRESS",
                video,
                analyticsPointRef.current.pendingWatched,
              );

              analyticsPointRef.current.pendingWatched =
                0;
            }

            sendAnalyticsEvent(
              "COMPLETE",
              video,
            );
          }}
          className="h-full w-full object-contain"
          onPlay={(event) => {
            const video =
              event.currentTarget;

            resetPoint(
              video.currentTime,
            );

            analyticsPointRef.current.lastTime =
              video.currentTime;

            sendAnalyticsEvent(
              "PLAY",
              video,
            );
          }}
          onPause={(event) => {
            const video =
              event.currentTarget;

            resetPoint(
              video.currentTime,
            );

            analyticsPointRef.current.lastTime =
              video.currentTime;

            sendAnalyticsEvent(
              "PAUSE",
              video,
            );
          }}
          onSeeking={(event) => {
            const video =
              event.currentTarget;

            resetPoint(
              video.currentTime,
            );

            analyticsPointRef.current.lastTime =
              video.currentTime;

            sendAnalyticsEvent(
              "SEEK",
              video,
            );
          }}
          onTimeUpdate={(event) => {
            const video =
              event.currentTarget;

            trackPlayback(
              video,
            );

            const currentTime =
              video.currentTime;

            const previousTime =
              analyticsPointRef.current
                .lastTime;

            const delta =
              currentTime -
              previousTime;

            analyticsPointRef.current.lastTime =
              currentTime;

            if (
              !video.paused &&
              !video.seeking &&
              delta > 0 &&
              delta <= 1.5
            ) {
              analyticsPointRef.current.pendingWatched +=
                delta;
            }

            const now =
              Date.now();

            if (
              analyticsPointRef.current.pendingWatched >
                0 &&
              now -
                analyticsPointRef.current
                  .lastSentAt >=
                4000
            ) {
              const watchedDelta =
                analyticsPointRef.current.pendingWatched;

              analyticsPointRef.current.pendingWatched =
                0;

              analyticsPointRef.current.lastSentAt =
                now;

              sendAnalyticsEvent(
                "PROGRESS",
                video,
                watchedDelta,
              );
            }
          }}
        />

        <span className="pointer-events-none absolute left-4 top-4 rounded-full bg-black/60 px-3 py-1 text-[11px] font-black">
          VOD
        </span>

        {isAdult &&
          adultAccess !== "allowed" && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-black px-6">
              <div className="w-full max-w-sm text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-600 text-xl font-black text-white">
                  19+
                </div>

                <h2 className="mt-5 text-xl font-black text-white">
                  19세 이상 콘텐츠입니다
                </h2>

                {adultAccess ===
                  "checking" && (
                  <p className="mt-3 text-sm text-zinc-400">
                    성인인증 상태를 확인하고 있습니다.
                  </p>
                )}

                {adultAccess ===
                  "login-required" && (
                  <>
                    <p className="mt-3 text-sm leading-6 text-zinc-400">
                      이 VOD를 시청하려면 로그인 후 성인인증이 필요합니다.
                    </p>

                    <a
                      href="/login"
                      className="mt-6 flex h-12 w-full items-center justify-center rounded-xl bg-flat-yellow text-sm font-black text-black"
                    >
                      로그인
                    </a>
                  </>
                )}

                {adultAccess ===
                  "verification-required" && (
                  <>
                    <p className="mt-3 text-sm leading-6 text-zinc-400">
                      휴대폰 본인인증을 완료한 성인만 시청할 수 있습니다.
                    </p>

                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          const response =
                            await fetch(
                              "/api/adult/verify/start",
                              {
                                method:
                                  "POST",
                              },
                            );

                          const data =
                            await response.json();

                          if (
                            data.errorCode ===
                            "ADULT_AUTH_REQUIRED"
                          ) {
                            window.location.href =
                              "/login";
                            return;
                          }

                          if (
                            data.errorCode ===
                            "ADULT_PROVIDER_NOT_CONFIGURED"
                          ) {
                            alert(
                              "휴대폰 본인인증 서비스가 아직 연결되지 않았습니다.",
                            );
                            return;
                          }

                          if (!response.ok) {
                            alert(
                              data.error ||
                                "성인인증을 시작하지 못했습니다.",
                            );
                          }
                        } catch (error) {
                          console.error(
                            "VOD ADULT START FAILED:",
                            error,
                          );

                          alert(
                            "성인인증을 시작하지 못했습니다.",
                          );
                        }
                      }}
                      className="mt-6 h-12 w-full rounded-xl bg-flat-yellow text-sm font-black text-black"
                    >
                      휴대폰으로 성인인증
                    </button>
                  </>
                )}

                {adultAccess ===
                  "error" && (
                  <>
                    <p className="mt-3 text-sm text-zinc-400">
                      성인인증 상태를 확인하지 못했습니다.
                    </p>

                    <button
                      type="button"
                      onClick={() => {
                        window.location.reload();
                      }}
                      className="mt-6 h-12 w-full rounded-xl bg-white/10 text-sm font-black text-white"
                    >
                      다시 시도
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
      </div>

      <div className="mt-3 text-sm text-zinc-400">
        조회 {views}
      </div>
    </>
  );
}
