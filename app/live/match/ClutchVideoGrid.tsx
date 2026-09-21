"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  createPortal,
} from "react-dom";

import ClutchHUD from "@/app/live/match/ClutchHUD";

import type {
  LiveMatch,
  LiveMatchParticipant,
} from "@/lib/live/match/match-types";

type Rect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

type Props = {
  roomId: string;
  match:
    LiveMatch | null;

  primaryStream:
    MediaStream | null;

  streams:
    Record<
      string,
      MediaStream
    >;

  videoRect:
    Rect | null;

  role:
    "broadcaster" |
    "viewer";
};

type TileProps = {
  participant:
    LiveMatchParticipant;

  stream:
    MediaStream | null;

  muted: boolean;

  className?: string;

  rank: number;

  score: number;

  teamLabel?: string;

  onWatchRoom: (
    participant:
      LiveMatchParticipant,
  ) => void;

  currentRoomId: string;

  role:
    "broadcaster" |
    "viewer";
};

// FLATLIVE_CLUTCH_PROFILE_TILE_V1

function ClutchTile({
  participant,
  stream,
  muted,
  className = "",
  rank,
  score,
  teamLabel,
  onWatchRoom,
  currentRoomId,
  role,
}: TileProps) {
  const ref =
    useRef<HTMLVideoElement>(
      null,
    );


  // FLATLIVE_CLUTCH_PROFILE_OPEN_V1
  const [
    profileOpen,
    setProfileOpen,
  ] = useState(false);

  // FLATLIVE_CHROME_CLUTCH_TILE_AUTOPLAY_FIX_V1
  // Chrome autoplay fallback이 React 재렌더로 풀리지 않도록
  // fallback muted 상태를 React state로도 유지한다.
  const [autoplayMuted, setAutoplayMuted] =
    useState(false);

  useEffect(() => {
    // FLATLIVE_IPHONE_CLUTCH_REMOTE_VIDEO_FIX_V1
    const video = ref.current;

    if (!video) {
      return;
    }

    // iOS Safari에서 동일/동등한 스트림을 반복 재바인딩하면
    // 기존 play()가 AbortError로 취소될 수 있다. 실제 스트림이
    // 바뀐 경우에만 srcObject를 교체한다.
    if (video.srcObject !== stream) {
      video.srcObject = stream;
    }

    video.autoplay = true;
    video.playsInline = true;

    // 새 stream/muted 조합에서는 기존 정책으로 먼저 재생을 시도한다.
    // Chrome이 소리 있는 autoplay를 막을 때만 아래 NotAllowedError
    // fallback에서 autoplayMuted를 true로 올린다.
    setAutoplayMuted(false);
    video.defaultMuted = muted;
    video.muted = muted;

    if (!stream) {
      return;
    }

    let disposed = false;
    let playPending = false;
    let gestureCleanup: (() => void) | null = null;

    const tryPlay = async () => {
      if (disposed || playPending || !ref.current) {
        return;
      }

      playPending = true;

      try {
        await video.play();
      } catch (error) {
        if (disposed) {
          return;
        }

        const name =
          error instanceof DOMException
            ? error.name
            : "";

        // AbortError는 새 track/stream 반영 중 Safari가 이전 play를
        // 취소한 경우가 많으므로 metadata/canplay에서 다시 시도한다.
        if (name === "AbortError") {
          return;
        }

        // 소리가 있는 원격 영상의 autoplay를 Chrome/iOS가 막으면 우선
        // muted로 영상을 살린다. DOM 속성만 바꾸면 React 재렌더 때
        // muted={false}로 되돌아갈 수 있으므로 state도 함께 유지한다.
        if (!muted && name === "NotAllowedError") {
          setAutoplayMuted(true);
          video.defaultMuted = true;
          video.muted = true;

          try {
            await video.play();
          } catch {
            return;
          }

          const restoreAudio = () => {
            if (disposed) {
              return;
            }

            setAutoplayMuted(false);
            video.defaultMuted = false;
            video.muted = false;
            void video.play().catch(() => undefined);
            gestureCleanup?.();
          };

          const events: Array<keyof DocumentEventMap> = [
            "pointerdown",
            "touchend",
            "click",
          ];

          const cleanup = () => {
            for (const eventName of events) {
              document.removeEventListener(
                eventName,
                restoreAudio as EventListener,
                true,
              );
            }
            gestureCleanup = null;
          };

          gestureCleanup = cleanup;

          for (const eventName of events) {
            document.addEventListener(
              eventName,
              restoreAudio as EventListener,
              { capture: true, once: true },
            );
          }
        }
      } finally {
        playPending = false;
      }
    };

    const handleReady = () => {
      void tryPlay();
    };

    video.addEventListener("loadedmetadata", handleReady);
    video.addEventListener("canplay", handleReady);

    // 이미 metadata가 준비된 경우에는 이벤트를 기다리지 않는다.
    if (video.readyState >= HTMLMediaElement.HAVE_METADATA) {
      void tryPlay();
    }

    return () => {
      disposed = true;
      gestureCleanup?.();
      video.removeEventListener("loadedmetadata", handleReady);
      video.removeEventListener("canplay", handleReady);
    };
  }, [stream, muted]);

  return (
    <div
      className={`relative min-h-0 min-w-0 overflow-hidden bg-black ${className}`}
    >

      {/* FLATLIVE_CLUTCH_MOBILE_VIDEO_CONTAIN_V1 */}
<video
        ref={ref}
        autoPlay
        playsInline
        muted={muted || autoplayMuted}
        className="h-full w-full object-cover object-center bg-black"
      />

      {!stream && (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-950">
          <div className="text-center">
            <div className="text-[10px] font-black text-white">
              연결 중
            </div>

            <div className="mt-1 text-[8px] text-zinc-500">
              {participant.nickname}
            </div>
          </div>
        </div>
      )}

      {/* FLATLIVE_CLUTCH_PROFILE_BAR_V1 */}
      <div className="absolute bottom-2 left-2 z-40 max-w-[calc(100%-16px)]">
        <button
          type="button"
          onClick={() => {
            setProfileOpen(
              (open) => !open,
            );
          }}
          className="pointer-events-auto flex max-w-full items-center gap-1.5 rounded-full border border-white/10 bg-black/75 py-1 pl-1 pr-2 shadow-xl backdrop-blur-md"
        >
          <div
            className="h-6 w-6 shrink-0 rounded-full border border-yellow-300/50 bg-zinc-800 bg-cover bg-center"
            style={
              participant.avatarUrl
                ? {
                    backgroundImage:
                      `url(${participant.avatarUrl})`,
                  }
                : undefined
            }
          >
            {!participant.avatarUrl && (
              <div className="flex h-full w-full items-center justify-center text-[9px] font-black text-yellow-300">
                {participant.nickname
                  .slice(0, 1)
                  .toUpperCase()}
              </div>
            )}
          </div>

          <span className="max-w-[92px] truncate text-[9px] font-black text-white">
            {participant.nickname}
          </span>

          {/* FLATLIVE_CLUTCH_TILE_TEAM_BADGE_V1 */}
          {teamLabel && (
            <span
              className={`shrink-0 rounded-full px-1.5 py-0.5 text-[7px] font-black ${
                teamLabel === "우리팀"
                  ? "bg-yellow-300 text-black"
                  : "border border-white/25 bg-black/70 text-white"
              }`}
            >
              {teamLabel === "우리팀" ? "● 우리팀" : "○ 상대팀"}
            </span>
          )}

          <span className="shrink-0 text-[8px] font-black text-yellow-300">
            {rank === 1
              ? "👑 1위"
              : `${rank}위`}
          </span>

          <span className="shrink-0 text-[8px] font-bold tabular-nums text-zinc-300">
            {score.toLocaleString()}
          </span>
        </button>

        {profileOpen && (
          <div className="pointer-events-auto absolute bottom-9 left-0 w-[190px] max-w-[70vw] rounded-2xl border border-white/15 bg-zinc-950/95 p-3 shadow-2xl backdrop-blur-xl">
            <div className="flex items-center gap-2.5">
              <div
                className="h-10 w-10 shrink-0 rounded-full border-2 border-yellow-300/70 bg-zinc-800 bg-cover bg-center"
                style={
                  participant.avatarUrl
                    ? {
                        backgroundImage:
                          `url(${participant.avatarUrl})`,
                      }
                    : undefined
                }
              >
                {!participant.avatarUrl && (
                  <div className="flex h-full w-full items-center justify-center text-sm font-black text-yellow-300">
                    {participant.nickname
                      .slice(0, 1)
                      .toUpperCase()}
                  </div>
                )}
              </div>

              <div className="min-w-0">
                <div className="truncate text-xs font-black text-white">
                  {participant.nickname}
                </div>

                <div className="mt-0.5 text-[9px] font-bold text-yellow-300">
                  {rank === 1
                    ? "👑 클러치 1위"
                    : `클러치 ${rank}위`}
                  {" · "}
                  {score.toLocaleString()}점
                </div>

                {teamLabel && (
                  <div className="mt-0.5 text-[8px] font-bold text-zinc-400">
                    {teamLabel === "우리팀" ? "● 우리팀" : "○ 상대팀"}
                  </div>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setProfileOpen(false);

                onWatchRoom(
                  participant,
                );
              }}
              disabled={
                role === "viewer" &&
                participant.roomId ===
                  currentRoomId
              }
              className="mt-3 h-9 w-full rounded-xl bg-yellow-300 text-[10px] font-black text-black disabled:bg-white/10 disabled:text-zinc-500"
            >
              {participant.roomId ===
              currentRoomId
                ? role === "broadcaster"
                  ? "내 방송"
                  : "현재 보고 있는 방송"
                : role === "broadcaster"
                  ? "이 방송 화면으로 전환"
                  : "이 방송 보기"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ClutchVideoGrid({
  roomId,
  match,
  primaryStream,
  streams,
  videoRect,
  role,
}: Props) {
  // FLATLIVE_CLUTCH_VIEW_ROOM_V1
  const [
    viewRoomId,
    setViewRoomId,
  ] = useState(
    roomId,
  );

  useEffect(() => {
    setViewRoomId(
      roomId,
    );
  }, [
    roomId,
  ]);

  // FLATLIVE_CLUTCH_SAFE_TEAM_ASSIGNMENTS_GRID_V1
  const safeTeamAssignments =
    Array.isArray(match?.teamAssignments)
      ? match.teamAssignments
      : [];

  const participants =
    useMemo(
      () =>
        match?.participants.filter(
          (participant) =>
            participant.status ===
              "HOST" ||
            participant.status ===
              "ACCEPTED",
        ) ?? [],
      [match],
    );

  const active =
    Boolean(
      match &&
      participants.length >= 2 &&
      participants.length <= 4 &&
      (
        match.status ===
          "READY" ||
        match.status ===
          "LIVE"
      ),
    );

  // FLATLIVE_CLUTCH_SYNC_INTRO_V3
  // 실제 라운드 시작 시각(startedAt)을 기준으로 모든 화면이 같은
  // 인트로 단계에 들어가도록 한다. READY 단계에서는 실행하지 않는다.
  const CLUTCH_INTRO_MS = 3200;

  const introStartedAt =
    match?.status === "LIVE" &&
    typeof match.startedAt === "number"
      ? match.startedAt
      : null;

  const [
    introElapsedMs,
    setIntroElapsedMs,
  ] = useState(CLUTCH_INTRO_MS);

  useEffect(() => {
    if (!introStartedAt) {
      setIntroElapsedMs(CLUTCH_INTRO_MS);
      return;
    }

    let frame = 0;

    const tick = () => {
      const elapsed = Math.max(
        0,
        Date.now() - introStartedAt,
      );

      setIntroElapsedMs(elapsed);

      if (elapsed < CLUTCH_INTRO_MS) {
        frame = window.requestAnimationFrame(tick);
      }
    };

    tick();

    return () => {
      if (frame) {
        window.cancelAnimationFrame(frame);
      }
    };
  }, [
    introStartedAt,
    match?.matchId,
  ]);

  const introVisible =
    Boolean(introStartedAt) &&
    introElapsedMs < CLUTCH_INTRO_MS;

  const ranked =
    [...participants]
      .sort(
        (a, b) =>
          (
            match?.scores[
              b.userId
            ] ?? 0
          ) -
          (
            match?.scores[
              a.userId
            ] ?? 0
          ),
      );

  const rankOf =
    (
      userId: string,
    ) =>
      Math.max(
        1,
        ranked.findIndex(
          (participant) =>
            participant.userId ===
            userId,
        ) + 1,
      );

  // FLATLIVE_CLUTCH_TEAM_ORDER_V1
  const ordered =
    useMemo(
      () => {
        const referenceRoomId =
          role === "broadcaster" &&
          participants.length === 2
            ? roomId
            : role === "broadcaster"
              ? viewRoomId
              : roomId;

        const reference =
          participants.find(
            (participant) =>
              participant.roomId ===
              referenceRoomId,
          );

        if (
          match?.matchMode ===
            "TEAM" &&
          participants.length === 4 &&
          reference
        ) {
          const assignmentByUser =
            new Map(
              safeTeamAssignments.map(
                (assignment) => [
                  assignment.userId,
                  assignment,
                ],
              ),
            );

          const referenceAssignment =
            assignmentByUser.get(
              reference.userId,
            );

          if (
            referenceAssignment
          ) {
            const ownTeam =
              participants
                .filter(
                  (participant) =>
                    assignmentByUser.get(
                      participant.userId,
                    )?.teamNo ===
                    referenceAssignment.teamNo,
                )
                .sort(
                  (a, b) => {
                    if (
                      a.roomId ===
                      referenceRoomId
                    ) {
                      return -1;
                    }

                    if (
                      b.roomId ===
                      referenceRoomId
                    ) {
                      return 1;
                    }

                    return (
                      (
                        assignmentByUser.get(
                          a.userId,
                        )?.seatNo ??
                        99
                      ) -
                      (
                        assignmentByUser.get(
                          b.userId,
                        )?.seatNo ??
                        99
                      )
                    );
                  },
                );

            const otherTeam =
              participants
                .filter(
                  (participant) =>
                    assignmentByUser.get(
                      participant.userId,
                    )?.teamNo !==
                    referenceAssignment.teamNo,
                )
                .sort(
                  (a, b) =>
                    (
                      assignmentByUser.get(
                        a.userId,
                      )?.seatNo ??
                      99
                    ) -
                    (
                      assignmentByUser.get(
                        b.userId,
                      )?.seatNo ??
                      99
                    ),
                );

            return [
              ...ownTeam,
              ...otherTeam,
            ];
          }
        }

        const referenceFirst =
          [
            ...participants,
          ].sort(
            (a, b) => {
              if (
                a.roomId ===
                referenceRoomId
              ) {
                return -1;
              }

              if (
                b.roomId ===
                referenceRoomId
              ) {
                return 1;
              }

              return 0;
            },
          );

        return referenceFirst;
      },
      [
        match,
        participants,
        role,
        roomId,
        viewRoomId,
      ],
    );

  // FLATLIVE_CLUTCH_BATTLE_HUD_HOOK_ORDER_FIX_V1
  // Hook은 클러치 활성 여부와 관계없이 항상 같은 순서로 호출한다.
  const hookTensionLeftParticipants =
    match?.matchMode === "TEAM"
      ? ordered.slice(0, 2)
      : ordered.slice(0, 1);

  const hookTensionRightParticipants =
    match?.matchMode === "TEAM"
      ? ordered.slice(2, 4)
      : ordered.slice(1, 2);

  const hookTensionLeftScore =
    hookTensionLeftParticipants.reduce(
      (sum, participant) =>
        sum +
        (match?.scores[
          participant.userId
        ] ?? 0),
      0,
    );

  const hookTensionRightScore =
    hookTensionRightParticipants.reduce(
      (sum, participant) =>
        sum +
        (match?.scores[
          participant.userId
        ] ?? 0),
      0,
    );

  const hookTensionLead =
    hookTensionLeftScore === hookTensionRightScore
      ? "TIE"
      : hookTensionLeftScore > hookTensionRightScore
        ? "LEFT"
        : "RIGHT";

  const clutchHudActive =
    Boolean(active && match && videoRect);

  const previousTensionLeadRef =
    useRef<"LEFT" | "RIGHT" | "TIE" | null>(
      null,
    );

  const previousLeftScoreRef =
    useRef(hookTensionLeftScore);

  const previousRightScoreRef =
    useRef(hookTensionRightScore);

  const [
    leadChangeSide,
    setLeadChangeSide,
  ] = useState<
    "LEFT" | "RIGHT" | null
  >(null);

  const [
    scoreBurst,
    setScoreBurst,
  ] = useState<{
    side: "LEFT" | "RIGHT";
    amount: number;
    nonce: number;
  } | null>(null);

  useEffect(() => {
    if (!clutchHudActive) {
      return;
    }

    const previousLead =
      previousTensionLeadRef.current;

    if (
      previousLead &&
      previousLead !== "TIE" &&
      hookTensionLead !== "TIE" &&
      previousLead !== hookTensionLead
    ) {
      setLeadChangeSide(hookTensionLead);

      const timer =
        window.setTimeout(() => {
          setLeadChangeSide(null);
        }, 720);

      previousTensionLeadRef.current =
        hookTensionLead;

      return () => {
        window.clearTimeout(timer);
      };
    }

    previousTensionLeadRef.current =
      hookTensionLead;
  }, [
    clutchHudActive,
    hookTensionLead,
  ]);

  useEffect(() => {
    if (!clutchHudActive) {
      return;
    }

    const leftDelta =
      Math.max(
        0,
        hookTensionLeftScore -
          previousLeftScoreRef.current,
      );

    const rightDelta =
      Math.max(
        0,
        hookTensionRightScore -
          previousRightScoreRef.current,
      );

    previousLeftScoreRef.current =
      hookTensionLeftScore;

    previousRightScoreRef.current =
      hookTensionRightScore;

    if (
      leftDelta <= 0 &&
      rightDelta <= 0
    ) {
      return;
    }

    const side =
      leftDelta >= rightDelta
        ? "LEFT"
        : "RIGHT";

    const amount =
      side === "LEFT"
        ? leftDelta
        : rightDelta;

    setScoreBurst({
      side,
      amount,
      nonce: Date.now(),
    });

    const timer =
      window.setTimeout(() => {
        setScoreBurst(null);
      }, 620);

    return () => {
      window.clearTimeout(timer);
    };
  }, [
    clutchHudActive,
    hookTensionLeftScore,
    hookTensionRightScore,
  ]);

  if (
    !active ||
    !match ||
    !videoRect
  ) {
    return null;
  }

  // FLATLIVE_CLUTCH_PROFILE_ACTION_V1
  const teamLabelOf =
    (
      participant:
        LiveMatchParticipant,
    ) => {
      if (
        match.matchMode !==
          "TEAM"
      ) {
        return undefined;
      }

      const target =
        safeTeamAssignments.find(
          (assignment) =>
            assignment.userId ===
            participant.userId,
        );

      const referenceRoomId =
        role === "broadcaster"
          ? viewRoomId
          : roomId;

      const referenceParticipant =
        participants.find(
          (item) =>
            item.roomId ===
            referenceRoomId,
        );

      const reference =
        referenceParticipant
          ? safeTeamAssignments.find(
              (assignment) =>
                assignment.userId ===
                referenceParticipant.userId,
            )
          : undefined;

      if (
        !target ||
        !reference
      ) {
        return undefined;
      }

      return target.teamNo ===
        reference.teamNo
        ? "우리팀"
        : "상대팀";
    };

  const watchParticipantRoom =
    (
      participant:
        LiveMatchParticipant,
    ) => {
      if (
        !participant.roomId
      ) {
        return;
      }

      if (
        role === "viewer"
      ) {
        if (
          participant.roomId ===
          roomId
        ) {
          return;
        }

        window.location.href =
          `/live/watch/${encodeURIComponent(
            participant.roomId,
          )}`;

        return;
      }

      // 방송자는 Studio를 떠나지 않는다.
      // 자기 송출을 유지한 채
      // 클러치 화면 기준 방송만 변경.
      setViewRoomId(
        participant.roomId,
      );
    };

  const getStream =
    (
      participant:
        LiveMatchParticipant,
    ) => {
      if (
        participant.roomId ===
        roomId
      ) {
        return primaryStream;
      }

      return (
        streams[
          participant.roomId
        ] ?? null
      );
    };

  const tile =
    (
      participant:
        LiveMatchParticipant,
      className = "",
    ) => (
      <ClutchTile
        key={
          participant.userId
        }
        participant={
          participant
        }
        stream={
          getStream(
            participant,
          )
        }
        muted={
          participant.roomId ===
          roomId
        }
        className={
          className
        }
        rank={
          rankOf(
            participant.userId,
          )
        }
        score={
          match.scores[
            participant.userId
          ] ?? 0
        }
        teamLabel={
          teamLabelOf(
            participant,
          )
        }
        onWatchRoom={
          watchParticipantRoom
        }
        currentRoomId={
          roomId
        }
        role={
          role
        }
      />
    );

  const introParticipants =
    ordered.slice(
      0,
      match.matchMode ===
        "TEAM"
        ? 4
        : 2,
    );

  // FLATLIVE_CLUTCH_TENSION_BAR_V1
  const tensionLeftParticipants =
    match.matchMode === "TEAM"
      ? ordered.slice(0, 2)
      : ordered.slice(0, 1);

  const tensionRightParticipants =
    match.matchMode === "TEAM"
      ? ordered.slice(2, 4)
      : ordered.slice(1, 2);

  const tensionLeftScore =
    tensionLeftParticipants.reduce(
      (sum, participant) =>
        sum +
        (match.scores[
          participant.userId
        ] ?? 0),
      0,
    );

  const tensionRightScore =
    tensionRightParticipants.reduce(
      (sum, participant) =>
        sum +
        (match.scores[
          participant.userId
        ] ?? 0),
      0,
    );

  const tensionTotal =
    tensionLeftScore +
    tensionRightScore;

  const tensionRawLeftPercent =
    tensionTotal > 0
      ? (tensionLeftScore /
          tensionTotal) *
        100
      : 50;

  const tensionLeftPercent =
    Math.min(
      94,
      Math.max(
        6,
        tensionRawLeftPercent,
      ),
    );

  const tensionRightPercent =
    100 -
    tensionLeftPercent;

  const tensionLead =
    tensionLeftScore === tensionRightScore
      ? "TIE"
      : tensionLeftScore > tensionRightScore
        ? "LEFT"
        : "RIGHT";


  // FLATLIVE_CLUTCH_BATTLE_HUD_V1
  const tensionGapPercent =
    Math.abs(
      tensionLeftPercent -
      tensionRightPercent,
    );

  const tensionCloseBattle =
    tensionTotal > 0 &&
    tensionGapPercent <= 12;

  return (
    <div
      className="pointer-events-none absolute inset-0 z-20 overflow-hidden bg-black"
      // FLATLIVE_CLUTCH_MOBILE_FULL_PARENT_V2
    >
      {/* FLATLIVE_CLUTCH_SYNC_INTRO_PORTAL_V3 */}
      {introVisible &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            key={`clutch-intro-${match.matchId}-${match.startedAt ?? 0}`}
            className="pointer-events-none fixed inset-0 z-[2147483000] h-[100dvh] overflow-hidden bg-black/95"
          >
            <style>{`
              @keyframes flatClutchV3Pulse {
                0%,100% { transform: scale(1); opacity: .42; }
                50% { transform: scale(1.16); opacity: .86; }
              }
              @keyframes flatClutchV3Left {
                0% { opacity: 0; transform: translateX(-38vw) scale(.82); }
                100% { opacity: 1; transform: translateX(0) scale(1); }
              }
              @keyframes flatClutchV3Right {
                0% { opacity: 0; transform: translateX(38vw) scale(.82); }
                100% { opacity: 1; transform: translateX(0) scale(1); }
              }
              @keyframes flatClutchV3Pop {
                0% { opacity: 0; transform: scale(2.1); filter: blur(5px); }
                35% { opacity: 1; transform: scale(1); filter: blur(0); }
                100% { opacity: 1; transform: scale(.96); }
              }
            `}</style>

            {/* FLATLIVE_CLUTCH_INTRO_MOBILE_VIEWPORT_V3_2 */}
            <div
              className="relative flex h-full min-h-0 w-full items-center justify-center overflow-hidden px-3 pt-[max(env(safe-area-inset-top),12px)] pb-[max(env(safe-area-inset-bottom),12px)] sm:px-5"
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(250,204,21,0.22),transparent_48%)] [animation:flatClutchV3Pulse_1s_ease-in-out_infinite]" />
              <div className="absolute left-1/2 top-1/2 h-[150%] w-2 -translate-x-1/2 -translate-y-1/2 rotate-[16deg] bg-gradient-to-b from-transparent via-yellow-300 to-transparent shadow-[0_0_34px_rgba(250,204,21,.95)]" />

              <div className="relative z-10 flex w-full max-w-[760px] -translate-y-[1dvh] flex-col items-center justify-center">
                <div className="text-center">
                  <div className="text-[10px] font-black tracking-[0.34em] text-yellow-200/80 sm:text-xs">FLATLIVE</div>
                  <div className="mt-1 text-[clamp(20px,5.6vw,30px)] font-black italic tracking-tight text-white">
                    {match.matchMode === "TEAM" ? "TEAM CLUTCH" : "CLUTCH"}
                  </div>
                </div>

                <div className="mt-[clamp(24px,5dvh,52px)] grid w-full grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-[clamp(10px,4vw,28px)]">
                  <div className="flex min-w-0 justify-end [animation:flatClutchV3Left_.45s_cubic-bezier(.16,1,.3,1)_forwards]">
                    <div className="flex min-w-0 max-w-[34vw] flex-col items-center">
                      <div
                        className="h-[clamp(58px,17vw,96px)] w-[clamp(58px,17vw,96px)] rounded-full border-2 border-yellow-300 bg-zinc-900 bg-cover bg-center shadow-[0_0_28px_rgba(250,204,21,.45)]"
                        style={introParticipants[0]?.avatarUrl ? { backgroundImage: `url(${introParticipants[0].avatarUrl})` } : undefined}
                      >
                        {!introParticipants[0]?.avatarUrl && (
                          <div className="flex h-full w-full items-center justify-center text-[clamp(24px,7vw,40px)] font-black text-yellow-300">
                            {introParticipants[0]?.nickname?.slice(0,1).toUpperCase() ?? "A"}
                          </div>
                        )}
                      </div>
                      <div className="mt-2 max-w-full truncate text-center text-[clamp(11px,3vw,16px)] font-black text-white">
                        {match.matchMode === "TEAM" ? "TEAM A" : introParticipants[0]?.nickname}
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 text-[clamp(34px,10vw,64px)] font-black italic text-yellow-300 drop-shadow-[0_0_22px_rgba(250,204,21,1)]">VS</div>

                  <div className="flex min-w-0 justify-start [animation:flatClutchV3Right_.45s_cubic-bezier(.16,1,.3,1)_forwards]">
                    <div className="flex min-w-0 max-w-[34vw] flex-col items-center">
                      <div
                        className="h-[clamp(58px,17vw,96px)] w-[clamp(58px,17vw,96px)] rounded-full border-2 border-white/80 bg-zinc-900 bg-cover bg-center shadow-[0_0_24px_rgba(255,255,255,.28)]"
                        style={introParticipants[1]?.avatarUrl ? { backgroundImage: `url(${introParticipants[1].avatarUrl})` } : undefined}
                      >
                        {!introParticipants[1]?.avatarUrl && (
                          <div className="flex h-full w-full items-center justify-center text-[clamp(24px,7vw,40px)] font-black text-white">
                            {introParticipants[1]?.nickname?.slice(0,1).toUpperCase() ?? "B"}
                          </div>
                        )}
                      </div>
                      <div className="mt-2 max-w-full truncate text-center text-[clamp(11px,3vw,16px)] font-black text-white">
                        {match.matchMode === "TEAM" ? "TEAM B" : introParticipants[1]?.nickname}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-[clamp(28px,6dvh,64px)] flex h-[clamp(72px,12dvh,112px)] items-center justify-center text-center">
                  {introElapsedMs < 1000 && (
                    <span className="text-[clamp(16px,4.5vw,24px)] font-black italic tracking-[.18em] text-white/80">MATCH READY</span>
                  )}
                  {introElapsedMs >= 1000 && introElapsedMs < 1550 && (
                    <span className="text-[clamp(58px,18vw,96px)] font-black italic text-white [animation:flatClutchV3Pop_.35s_ease-out_both]">3</span>
                  )}
                  {introElapsedMs >= 1550 && introElapsedMs < 2100 && (
                    <span className="text-[clamp(58px,18vw,96px)] font-black italic text-white [animation:flatClutchV3Pop_.35s_ease-out_both]">2</span>
                  )}
                  {introElapsedMs >= 2100 && introElapsedMs < 2650 && (
                    <span className="text-[clamp(58px,18vw,96px)] font-black italic text-yellow-300 [animation:flatClutchV3Pop_.35s_ease-out_both]">1</span>
                  )}
                  {introElapsedMs >= 2650 && (
                    <span className="text-[clamp(18px,5vw,30px)] font-black italic tracking-[.16em] text-yellow-300 [animation:flatClutchV3Pop_.35s_ease-out_both]">CLUTCH START</span>
                  )}
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )}
      {/* FLATLIVE_CLUTCH_BATTLE_HUD_V1 */}
      {match.status === "LIVE" && !introVisible && (
        <>
          <style>{`
            @keyframes flatBattlePulse {
              0%,100% { opacity: .78; filter: brightness(1); }
              50% { opacity: 1; filter: brightness(1.45); }
            }
            @keyframes flatBattleSweep {
              0% { transform: translateX(-220%) skewX(-22deg); opacity: 0; }
              18% { opacity: .95; }
              100% { transform: translateX(520%) skewX(-22deg); opacity: 0; }
            }
            @keyframes flatBattleCore {
              0%,100% { transform: translate(-50%,-50%) scale(.82); }
              50% { transform: translate(-50%,-50%) scale(1.36); }
            }
            @keyframes flatBattleScoreHit {
              0% { transform: translateY(7px) scale(.65); opacity: 0; }
              28% { transform: translateY(-3px) scale(1.25); opacity: 1; }
              68% { transform: translateY(0) scale(.96); opacity: 1; }
              100% { transform: translateY(0) scale(1); opacity: 0; }
            }
            @keyframes flatBattleLeadChange {
              0% { transform: translate(-50%,-50%) scale(2.3); opacity: 0; filter: blur(8px); }
              28% { transform: translate(-50%,-50%) scale(.92); opacity: 1; filter: blur(0); }
              64% { transform: translate(-50%,-50%) scale(1.05); opacity: 1; }
              100% { transform: translate(-50%,-50%) scale(1); opacity: 0; }
            }
            @keyframes flatBattleShockwave {
              0% { transform: translate(-50%,-50%) scale(.2); opacity: .95; }
              100% { transform: translate(-50%,-50%) scale(4.6); opacity: 0; }
            }
            @keyframes flatBattleClose {
              0%,100% { transform: translateX(-50%) scale(1); }
              42% { transform: translateX(-50%) scale(1.015); }
              52% { transform: translateX(-50%) scale(.995); }
            }
          `}</style>

          <div
            className={`pointer-events-none absolute left-1/2 top-[max(env(safe-area-inset-top),9px)] z-[68] w-[min(94%,590px)] -translate-x-1/2 md:top-4 ${
              tensionCloseBattle
                ? "[animation:flatBattleClose_.72s_ease-in-out_infinite]"
                : ""
            }`}
          >
            <div className="mb-1 flex items-end justify-between px-1 text-[9px] font-black tabular-nums text-white drop-shadow-[0_1px_4px_rgba(0,0,0,.95)] md:text-[10px]">
              <span className="max-w-[42%] truncate">
                {match.matchMode === "TEAM"
                  ? "TEAM A"
                  : tensionLeftParticipants[0]?.nickname ?? "A"}
                {" "}
                <span className="text-yellow-300">
                  {tensionLeftScore.toLocaleString()}
                </span>
              </span>

              <span
                className={`rounded-full border px-2 py-0.5 text-[8px] tracking-[.16em] ${
                  tensionCloseBattle
                    ? "border-yellow-200/80 bg-yellow-300/20 text-yellow-100 shadow-[0_0_14px_rgba(250,204,21,.9)]"
                    : "border-white/15 bg-black/60 text-white/80"
                }`}
              >
                {tensionCloseBattle
                  ? "CLUTCH ZONE"
                  : "CLUTCH"}
              </span>

              <span className="max-w-[42%] truncate text-right">
                <span className="text-white">
                  {tensionRightScore.toLocaleString()}
                </span>
                {" "}
                {match.matchMode === "TEAM"
                  ? "TEAM B"
                  : tensionRightParticipants[0]?.nickname ?? "B"}
              </span>
            </div>

            <div
              className={`relative h-[10px] overflow-visible rounded-full border bg-black/80 shadow-[0_2px_10px_rgba(0,0,0,.85)] md:h-[11px] ${
                tensionCloseBattle
                  ? "border-yellow-200/70 shadow-[0_0_18px_rgba(250,204,21,.48)]"
                  : "border-white/20"
              }`}
            >
              <div className="absolute inset-0 overflow-hidden rounded-full">
                <div
                  className="absolute inset-y-0 left-0 overflow-hidden bg-gradient-to-r from-amber-600 via-yellow-300 to-yellow-100 shadow-[0_0_16px_rgba(250,204,21,.85)] transition-[width] duration-500 ease-[cubic-bezier(.16,1,.3,1)]"
                  style={{
                    width: `${tensionLeftPercent}%`,
                    animation:
                      "flatBattlePulse 1.0s ease-in-out infinite",
                  }}
                >
                  <div
                    className="absolute inset-y-0 left-0 w-[35%] bg-gradient-to-r from-transparent via-white/95 to-transparent"
                    style={{
                      animation:
                        tensionCloseBattle
                          ? "flatBattleSweep .78s linear infinite"
                          : "flatBattleSweep 1.35s linear infinite",
                    }}
                  />
                </div>

                <div
                  className="absolute inset-y-0 right-0 overflow-hidden bg-gradient-to-l from-white via-zinc-100 to-zinc-300 shadow-[0_0_13px_rgba(255,255,255,.55)] transition-[width] duration-500 ease-[cubic-bezier(.16,1,.3,1)]"
                  style={{
                    width: `${tensionRightPercent}%`,
                    animation:
                      "flatBattlePulse 1.08s ease-in-out infinite",
                  }}
                >
                  <div
                    className="absolute inset-y-0 right-0 w-[35%] bg-gradient-to-l from-transparent via-yellow-100/95 to-transparent"
                    style={{
                      animation:
                        tensionCloseBattle
                          ? "flatBattleSweep .9s linear infinite reverse"
                          : "flatBattleSweep 1.45s linear infinite reverse",
                    }}
                  />
                </div>
              </div>

              <div
                className="absolute top-1/2 z-20 h-[24px] w-[4px] rounded-full bg-white transition-[left] duration-500 ease-[cubic-bezier(.16,1,.3,1)]"
                style={{
                  left: `${tensionLeftPercent}%`,
                  transform: "translate(-50%,-50%)",
                  boxShadow:
                    tensionCloseBattle
                      ? "0 0 8px #fff,0 0 20px rgba(250,204,21,1),0 0 34px rgba(250,204,21,.8)"
                      : "0 0 7px #fff,0 0 15px rgba(250,204,21,.9)",
                  animation:
                    "flatBattleCore .68s ease-in-out infinite",
                }}
              />
            </div>

            {scoreBurst && (
              <div
                key={scoreBurst.nonce}
                className={`absolute -top-1 z-[72] text-[12px] font-black italic ${
                  scoreBurst.side === "LEFT"
                    ? "left-[18%] text-yellow-200"
                    : "right-[18%] text-white"
                } [animation:flatBattleScoreHit_.62s_ease-out_forwards]`}
              >
                +{scoreBurst.amount.toLocaleString()}
              </div>
            )}
          </div>

          {leadChangeSide && (
            <div className="pointer-events-none absolute inset-0 z-[74] overflow-hidden">
              <div className="absolute left-1/2 top-[18%] h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full border border-yellow-200/80 shadow-[0_0_36px_rgba(250,204,21,1)] [animation:flatBattleShockwave_.65s_ease-out_forwards]" />
              <div className="absolute left-1/2 top-[18%] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-yellow-200/60 bg-black/80 px-4 py-2 text-center shadow-[0_0_30px_rgba(250,204,21,.65)] backdrop-blur-md [animation:flatBattleLeadChange_.72s_cubic-bezier(.16,1,.3,1)_forwards]">
                <div className="text-[9px] font-black tracking-[.25em] text-yellow-200/80">
                  CLUTCH
                </div>
                <div className="text-[18px] font-black italic tracking-tight text-white">
                  LEAD CHANGE
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* FLATLIVE_CLUTCH_BROADCASTER_VIEW_BADGE_V1 */}
      {role === "broadcaster" &&
        viewRoomId !== roomId && (
          <div className="pointer-events-auto absolute right-2 top-12 z-50 flex items-center gap-1.5 rounded-full border border-yellow-300/40 bg-black/80 p-1 shadow-xl backdrop-blur-md">
            <span className="pl-2 text-[9px] font-black text-yellow-200">
              상대방 화면 보는 중
            </span>

            <button
              type="button"
              onClick={() => {
                setViewRoomId(
                  roomId,
                );
              }}
              className="rounded-full bg-yellow-300 px-2.5 py-1 text-[9px] font-black text-black"
            >
              내 방송으로
            </button>
          </div>
        )}

      {/* FLATLIVE_CLUTCH_MOBILE_2P_TIKTOK_LAYOUT_V1 */}
      {ordered.length === 2 && (
        <div className="grid h-full w-full grid-cols-2 grid-rows-1 bg-black">
          {tile(
            ordered[0],
            "h-full min-h-0 border-r border-white/10",
          )}

          {tile(
            ordered[1],
            "h-full min-h-0",
          )}
        </div>
      )}

      {/* FLATLIVE_CLUTCH_MOBILE_3P_LAYOUT_V1 */}
      {ordered.length === 3 &&
        role ===
          "broadcaster" && (
          <div className="grid h-full w-full grid-cols-2 grid-rows-[minmax(0,2fr)_minmax(0,1fr)] md:grid-cols-3 md:grid-rows-2">
            {tile(
              ordered[0],
              "col-span-2 border-b border-white/10 md:row-span-2 md:border-b-0 md:border-r",
            )}

            {tile(
              ordered[1],
              "border-r border-white/10 md:border-b md:border-r-0",
            )}

            {tile(
              ordered[2],
            )}
          </div>
        )}

      {ordered.length === 3 &&
        role ===
          "viewer" && (
          <div className="grid h-full w-full grid-cols-2 grid-rows-2">
            {tile(
              ordered[0],
              "col-span-2 border-b border-white/10",
            )}

            {tile(
              ordered[1],
              "border-r border-white/10",
            )}

            {tile(
              ordered[2],
            )}
          </div>
        )}

      {ordered.length === 4 && (
        <div className="grid h-full w-full grid-cols-2 grid-rows-2">
          {tile(
            ordered[0],
            "border-b border-r border-white/10",
          )}

          {tile(
            ordered[1],
            "border-b border-white/10",
          )}

          {tile(
            ordered[2],
            "border-r border-white/10",
          )}

          {tile(
            ordered[3],
          )}
        </div>
      )}

      <ClutchHUD
        match={match}
        roomId={roomId}
        role={role}
      />
    </div>
  );
}
