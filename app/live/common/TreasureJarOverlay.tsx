"use client";
// TREASURE_JAR_POSITION_SIZE_V2_14: mobile below title / desktop inside video

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import TreasureJarGiftPanel from "@/app/live/common/TreasureJarGiftPanel";
import TreasureJarIcon from "@/app/live/common/TreasureJarIcon";

type JarEvent = {
  id: string;
  roomId: string;
  kind: "TREASURE" | "PORTAL";
  creatorUserId: string;
  rewardFlat: number;
  winnerCount: number;
  createdAt: number;
  expiresAt: number;
  status:
    | "ACTIVE"
    | "SETTLING"
    | "FINISHED"
    | "CANCELLED";
  targetRoomId: string | null;
  targetRoomTitle: string | null;
  finishedAt: number | null;
  participantCount: number;
  joined: boolean;
  wonAmount: number;
  claimOpen?: boolean;
  claimClosesAt?: number | null;
  isPortalPlacement?: boolean;
};

type Props = {
  roomId: string;
  mode:
    | "viewer"
    | "broadcaster";
};

export default function TreasureJarOverlay({
  roomId,
  mode,
}: Props) {
  const [events, setEvents] =
    useState<JarEvent[]>([]);

  const [serverNow, setServerNow] =
    useState(Date.now());

  const [busy, setBusy] =
    useState(false);

  const [viewerPortalOpen, setViewerPortalOpen] =
    useState(false);

  // FLATLIVE_TREASURE_JAR_BROADCASTER_GIFT_BUTTON_V1
  const [broadcasterGiftOpen, setBroadcasterGiftOpen] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [winToastAmount, setWinToastAmount] =
    useState(0);

  const [openedJarId, setOpenedJarId] =
    useState<string | null>(null);

  // 받은 항아리는 이 시청자 화면에서 즉시 숨긴다.
  const [hiddenJarIds, setHiddenJarIds] =
    useState<string[]>([]);

  const [hiddenJarReady, setHiddenJarReady] =
    useState(false);

  // 결과 표시: 당첨이면 금액, 미당첨이면 null
  const [claimResult, setClaimResult] =
    useState<{ eventId: string; amount: number | null } | null>(null);

  const pendingClaimsRef =
    useRef<
      Record<
        string,
        {
          wonBefore: number;
          claimClosesAt: number;
        }
      >
    >({});

  const winAmountsRef =
    useRef<
      Record<string, number>
    >({});

  // 새로고침 시 예전 당첨금이 다시 뜨지 않게 기준값만 저장
  const winBaselineRoomRef =
    useRef<string | null>(null);


  const load = async () => {
    if (!roomId) {
      return;
    }

    try {
      const response =
        await fetch(
          `/api/live/treasure-jar?roomId=${encodeURIComponent(
            roomId,
          )}`,
          {
            cache: "no-store",
          },
        );

      const data =
        await response.json();

      if (
        response.ok &&
        data.success
      ) {
        const nextEvents:
          JarEvent[] =
          Array.isArray(
            data.events,
          )
            ? data.events
            : [];

        const nextServerNow =
          Number(
            data.serverNow,
          ) || Date.now();

        const suppressHistoricalWinToast =
          winBaselineRoomRef.current !== roomId;

        if (suppressHistoricalWinToast) {
          winBaselineRoomRef.current = roomId;
        }

        for (
          const event of nextEvents
        ) {
          if (event.isPortalPlacement) {
            continue;
          }

          const current =
            Number(
              event.wonAmount,
            ) || 0;

          const previous =
            winAmountsRef.current[
              event.id
            ] ?? 0;

          const pending =
            pendingClaimsRef.current[
              event.id
            ];

          if (
            pending &&
            nextServerNow >=
              pending.claimClosesAt
          ) {
            const gained =
              Math.max(
                0,
                current -
                  pending.wonBefore,
              );

            setClaimResult({
              eventId:
                event.id,
              amount:
                gained > 0
                  ? gained
                  : null,
            });

            delete pendingClaimsRef.current[
              event.id
            ];
          } else if (
            !suppressHistoricalWinToast &&
            !pending &&
            current >
              previous
          ) {
            setWinToastAmount(
              current -
                previous,
            );
          }

          winAmountsRef.current[
            event.id
          ] = current;
        }

        setEvents(
          nextEvents,
        );

        setServerNow(
          nextServerNow,
        );
      }
    } catch (error) {
      console.error(
        "TREASURE_JAR_LOAD_FAILED",
        error,
      );
    }
  };

  // FLATLIVE_CLAIMED_JAR_LOCAL_STORAGE_V1
  useEffect(() => {
    if (!roomId) {
      setHiddenJarReady(true);
      return;
    }

    try {
      const raw =
        window.localStorage.getItem(
          `flatlive:claimed-jars:${roomId}`,
        );

      const saved =
        raw
          ? JSON.parse(raw)
          : [];

      setHiddenJarIds(
        Array.isArray(saved)
          ? saved.filter(
              (value): value is string =>
                typeof value === "string",
            )
          : [],
      );
    } catch {
      setHiddenJarIds([]);
    } finally {
      setHiddenJarReady(true);
    }
  }, [roomId]);

  useEffect(() => {
    void load();

    if (!roomId) {
      return;
    }

    const poll =
      window.setInterval(
        () => {
          void load();
        },
        2000,
      );

    const clock =
      window.setInterval(
        () => {
          setServerNow(
            (value) =>
              value + 1000,
          );
        },
        1000,
      );

    const created = () => {
      void load();
    };

    window.addEventListener(
      "flatlive:treasure-jar-created",
      created,
    );

    return () => {
      window.clearInterval(
        poll,
      );
      window.clearInterval(
        clock,
      );
      window.removeEventListener(
        "flatlive:treasure-jar-created",
        created,
      );
    };
  }, [roomId]);

  useEffect(() => {
    if (!claimResult) {
      return;
    }

    const timer =
      window.setTimeout(
        () => {
          setClaimResult(null);
        },
        1400,
      );

    return () => {
      window.clearTimeout(timer);
    };
  }, [claimResult]);

  useEffect(() => {
    if (
      winToastAmount <= 0
    ) {
      return;
    }

    const timer =
      window.setTimeout(
        () => {
          setWinToastAmount(
            0,
          );
        },
        5000,
      );

    return () => {
      window.clearTimeout(
        timer,
      );
    };
  }, [winToastAmount]);

  const activeRewardJar =
    useMemo(
      () =>
        events.find(
          (event) =>
            (event.kind === "TREASURE" || event.kind === "PORTAL") &&
            !event.isPortalPlacement &&
            event.status ===
              "ACTIVE",
        ) ?? null,
      [events],
    );

  const portalPlacement =
    useMemo(
      () =>
        events.find(
          (event) =>
            event.kind === "PORTAL" &&
            event.isPortalPlacement &&
            event.status ===
              "ACTIVE",
        ) ?? null,
      [events],
    );

  const remaining =
    activeRewardJar
      ? Math.max(
          0,
          Math.ceil(
            (activeRewardJar.expiresAt -
              serverNow) /
              1000,
          ),
        )
      : 0;

  const mm =
    String(
      Math.floor(
        remaining / 60,
      ),
    ).padStart(2, "0");

  const ss =
    String(
      remaining % 60,
    ).padStart(2, "0");

  const claimOpen =
    !!activeRewardJar?.claimOpen;

  const claimSecondsLeft =
    activeRewardJar?.claimClosesAt
      ? Math.max(
          0,
          Math.ceil(
            (
              activeRewardJar.claimClosesAt -
              serverNow
            ) / 1000,
          ),
        )
      : 0;

  const claimExpired =
    !!activeRewardJar?.claimClosesAt &&
    serverNow >= activeRewardJar.claimClosesAt;

  async function joinTreasure(
    event: JarEvent,
  ) {
    if (
      event.joined ||
      busy ||
      !event.claimOpen
    ) {
      return;
    }

    setBusy(true);
    setMessage("");
    setOpenedJarId(event.id);

    await new Promise<void>((resolve) => {
      window.setTimeout(resolve, 420);
    });

    try {
      const response =
        await fetch(
          "/api/live/treasure-jar",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              action:
                "JOIN",
              eventId:
                event.id,
            }),
          },
        );

      const data =
        await response.json();

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.error ||
            "참여에 실패했습니다.",
        );
      }

      pendingClaimsRef.current[
        event.id
      ] = {
        wonBefore:
          Number(
            event.wonAmount,
          ) || 0,
        claimClosesAt:
          Number(
            event.claimClosesAt,
          ) ||
          Date.now() + 10_000,
      };

      setHiddenJarIds(
        (current) => {
          const next =
            current.includes(
              event.id,
            )
              ? current
              : [
                  ...current,
                  event.id,
                ];

          try {
            window.localStorage.setItem(
              `flatlive:claimed-jars:${roomId}`,
              JSON.stringify(next),
            );
          } catch {
            // 저장 실패 시 화면 동작은 그대로 유지
          }

          return next;
        },
      );

      await load();
    } catch (error) {
      setOpenedJarId(null);
      setMessage(
        error instanceof Error
          ? error.message
          : "참여에 실패했습니다.",
      );
    } finally {
      setBusy(false);
    }
  }

  if (!roomId) {
    return null;
  }

  return (
    <>
      {/* FLATLIVE_TREASURE_JAR_GIFTSHOP_V2 */}
      {/* FLATLIVE_TREASURE_JAR_BROADCAST_VISIBLE_V2_7 */}
      {/* FLATLIVE_TREASURE_JAR_HIDE_AFTER_JOIN_V2_10 */}
      {/* FLATLIVE_TREASURE_CLAIM_AFTER_COUNTDOWN_V2_13 */}
      {/* FLATLIVE_TREASURE_JAR_OPEN_CLOSE_V2_9 */}
      {/* FLATLIVE_TREASURE_JAR_SCREEN_FLOAT_V2_3 */}
      <div className="pointer-events-none absolute z-[1000] flex flex-col items-start gap-2 left-3 top-14 md:left-4 md:top-[156px]">
        {hiddenJarReady &&
          activeRewardJar &&
          !activeRewardJar.joined &&
          !claimExpired &&
          !hiddenJarIds.includes(
            activeRewardJar.id,
          ) && (
          <button
            type="button"
            disabled={
              !claimOpen ||
              busy
            }
            onClick={() => {
              void joinTreasure(
                activeRewardJar,
              );
            }}
            aria-label={
              claimOpen
                ? "열린 보물항아리 받기"
                : "보물항아리 카운트다운"
            }
            className={`pointer-events-auto relative inline-flex items-center justify-center transition ${
              claimOpen
                ? "cursor-pointer"
                : "cursor-default"
            }`}
          >
            <TreasureJarIcon
              portal={activeRewardJar.kind === "PORTAL"}
              opened={openedJarId === activeRewardJar.id}
              size={60}
              className={`${
                activeRewardJar.kind === "PORTAL"
                  ? "drop-shadow-[0_0_14px_rgba(229,231,235,.85)]"
                  : "drop-shadow-[0_0_14px_rgba(250,204,21,.65)]"
              } md:[&>img]:!h-[68px] md:[&>img]:!w-[68px]`}
            />

            <span className="absolute -bottom-4 left-1/2 min-w-[44px] -translate-x-1/2 rounded-full bg-black/82 px-1.5 py-0.5 text-center text-[10px] font-black text-white shadow-md ring-1 ring-white/15 md:text-[11px]">
              {claimOpen
                ? `받기 ${claimSecondsLeft}`
                : `${mm}:${ss}`}
            </span>
          </button>
        )}

        {/* FLATLIVE_PORTAL_VIEWER_NAV_FIX_V11 */}
        {mode === "viewer" && portalPlacement && (
            <button
              type="button"
              onClick={() => {
                window.location.assign(
                  `/live/watch/${encodeURIComponent(portalPlacement.roomId)}`,
                );
              }}
              aria-label="포털항아리을 보낸 LIVE로 이동"
              className="pointer-events-auto flex items-center gap-1.5 transition active:scale-95"
            >
              <span className="relative inline-flex">
                <TreasureJarIcon
                  portal
                  size={56}
                  className="drop-shadow-[0_0_14px_rgba(229,231,235,.9)]"
                />
                <span className="absolute -right-1 -top-1 rounded-full bg-zinc-200 px-1.5 py-0.5 text-[8px] font-black text-zinc-900 shadow-md">
                  이동
                </span>
              </span>

              <span className="text-left">
                <span className="block max-w-[96px] truncate text-[11px] font-black text-zinc-100 drop-shadow-[0_1px_2px_rgba(0,0,0,.9)]">
                  포털항아리
                </span>
                <span className="block text-[9px] font-bold text-white/80 drop-shadow-[0_1px_2px_rgba(0,0,0,.9)]">
                  시청하기 →
                </span>
              </span>
            </button>
          )}
      </div>

      {/* FLATLIVE_TREASURE_JAR_BROADCASTER_GIFT_BUTTON_V1 */}
      {mode === "broadcaster" && (
        <button
          type="button"
          onClick={() => setBroadcasterGiftOpen(true)}
          className="pointer-events-auto absolute bottom-4 left-4 z-[1200] hidden items-center gap-2 rounded-full border border-yellow-300/40 bg-black/80 px-4 py-2.5 text-xs font-black text-yellow-300 shadow-xl backdrop-blur-md transition hover:scale-[1.02] active:scale-95 md:flex"
          aria-label="보물항아리 특별 선물 열기"
        >
          <TreasureJarIcon
            size={34}
            className="drop-shadow-[0_0_10px_rgba(250,204,21,.55)]"
          />
          <span>보물항아리</span>
        </button>
      )}

      {mode === "broadcaster" && broadcasterGiftOpen && (
        <div
          className="fixed inset-0 z-[100010] hidden items-center justify-center bg-black/70 p-4 backdrop-blur-sm md:flex"
          onClick={() => setBroadcasterGiftOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-[28px] border border-white/10 bg-[#111] p-5 text-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-black text-yellow-300">
                  특별 선물
                </p>
                <h3 className="mt-1 text-xl font-black">
                  보물항아리 · 포털항아리
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setBroadcasterGiftOpen(false)}
                className="h-9 w-9 rounded-full bg-white/10 text-lg"
                aria-label="특별 선물 닫기"
              >
                ×
              </button>
            </div>

            <TreasureJarGiftPanel
              roomId={roomId}
              initialTab="TREASURE"
              onDone={() => {
                setBroadcasterGiftOpen(false);
                void load();
              }}
            />
          </div>
        </div>
      )}

      {/* FLATLIVE_TREASURE_JAR_CLAIM_RESULT_V1 */}
      {claimResult && (
        <div className="pointer-events-none fixed left-1/2 top-[26%] z-[100060] -translate-x-1/2 rounded-2xl border border-white/15 bg-black/90 px-5 py-3 text-center text-xl font-black text-white shadow-2xl backdrop-blur-xl md:absolute md:top-[24%]">
          {claimResult.amount !== null
            ? `+${claimResult.amount.toLocaleString()} FLAT`
            : "없음"}
        </div>
      )}

{/* FLATLIVE_TREASURE_JAR_PAYOUT_TOAST_V2_11 */}
      {winToastAmount > 0 && (
        <div className="pointer-events-none fixed left-1/2 top-[26%] z-[100050] -translate-x-1/2 rounded-3xl border border-amber-300/60 bg-black/90 px-6 py-4 text-center shadow-[0_0_44px_rgba(250,204,21,.4)] backdrop-blur-xl md:absolute md:top-[24%]">
          <div className="mx-auto flex justify-center">
            <TreasureJarIcon
              size={68}
            />
          </div>
          <p className="mt-1 text-2xl font-black text-white">
            +{winToastAmount.toLocaleString()} FLAT
          </p>
        </div>
      )}

      {message && (
        <div className="pointer-events-none fixed left-1/2 top-[18%] z-[100020] -translate-x-1/2 rounded-full border border-white/10 bg-black/90 px-4 py-2 text-xs font-black text-white shadow-xl">
          {message}
        </div>
      )}

      {viewerPortalOpen && (
        <div
          className="fixed inset-0 z-[100010] flex items-end justify-center bg-black/70 p-3 pb-[calc(18px+env(safe-area-inset-bottom))] backdrop-blur-sm md:items-center"
          onClick={() => setViewerPortalOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-[28px] border border-white/10 bg-[#111] p-5 text-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-black text-zinc-200">포털항아리</p>
                <h3 className="mt-1 text-xl font-black">이 LIVE 알리기</h3>
              </div>
              <button
                type="button"
                onClick={() => setViewerPortalOpen(false)}
                className="h-9 w-9 rounded-full bg-white/10 text-lg"
              >
                ×
              </button>
            </div>
            <TreasureJarGiftPanel
              roomId={roomId}
              initialTab="PORTAL"
              onDone={() => setViewerPortalOpen(false)}
            />
          </div>
        </div>
      )}

    </>
  );
}

