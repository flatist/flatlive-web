"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import ClutchResultOverlay from "@/app/live/match/ClutchResultOverlay";

import type {
  LiveMatch,
} from "@/lib/live/match/match-types";

type Props = {
  match: LiveMatch;
  roomId: string;
  role:
    | "broadcaster"
    | "viewer";
};

type ResultState = {
  winners: Array<{
    userId: string;
    roomId: string;
    nickname: string;
  }>;
  topScore: number;
  draw: boolean;

  // FLATLIVE_CLUTCH_TEAM_RESULT_STATE_V1
  teamMode: boolean;
};

function formatTime(
  total: number,
) {
  const seconds =
    Math.max(
      0,
      Math.floor(total),
    );

  const minutes =
    Math.floor(
      seconds / 60,
    );

  const rest =
    seconds % 60;

  return `${String(
    minutes,
  ).padStart(
    2,
    "0",
  )}:${String(
    rest,
  ).padStart(
    2,
    "0",
  )}`;
}

export default function ClutchHUD({
  match,
  roomId,
  role,
}: Props) {
  const [
    now,
    setNow,
  ] = useState(
    Date.now(),
  );

  const [
    scoreBumps,
    setScoreBumps,
  ] = useState<
    Record<string, number>
  >({});

  const [
    result,
    setResult,
  ] =
    useState<ResultState | null>(
      null,
    );

  const [
    resultVisible,
    setResultVisible,
  ] = useState(false);

  const previousStatusRef =
    useRef(match.status);

  const previousScoresRef =
    useRef<
      Record<string, number>
    >({});

  const lastLiveScoresRef =
    useRef<
      Record<string, number>
    >({});

  const resultTimerRef =
    useRef<number | null>(
      null,
    );

  const bumpTimerRef =
    useRef<number | null>(
      null,
    );

  const participants =
    useMemo(
      () =>
        match.participants.filter(
          (participant) =>
            participant.status ===
              "HOST" ||
            participant.status ===
              "ACCEPTED",
        ),
      [match.participants],
    );

  const scored =
    useMemo(
      () =>
        participants.map(
          (participant) => ({
            ...participant,
            score:
              match.scores[
                participant.userId
              ] ?? 0,
          }),
        ),
      [
        participants,
        match.scores,
      ],
    );

  const ranked =
    useMemo(
      () =>
        [...scored].sort(
          (a, b) =>
            b.score -
            a.score,
        ),
      [scored],
    );

  const total =
    ranked.reduce(
      (
        sum,
        participant,
      ) =>
        sum +
        participant.score,
      0,
    );


  // FLATLIVE_CLUTCH_TEAM_ASSIGNMENTS_SAFE_V2
  // 수락 직후 / SOLO / 구버전 snapshot에서는
  // teamAssignments가 없을 수 있다.
  const safeTeamAssignments =
    Array.isArray(
      match.teamAssignments,
    )
      ? match.teamAssignments
      : [];

  // FLATLIVE_CLUTCH_TEAM_HUD_DATA_V1
  const isTeamMode =
    match.matchMode === "TEAM" &&
    safeTeamAssignments.length === 4;

  const teamAssignmentByUser =
    new Map(
      safeTeamAssignments.map(
        (assignment) => [
          assignment.userId,
          assignment,
        ],
      ),
    );

  const referenceParticipant =
    participants.find(
      (participant) =>
        participant.roomId ===
        roomId,
    );

  const referenceTeamNo =
    referenceParticipant
      ? teamAssignmentByUser.get(
          referenceParticipant.userId,
        )?.teamNo ?? null
      : null;

  const teamOneScore =
    scored.reduce(
      (
        sum,
        participant,
      ) =>
        sum +
        (
          teamAssignmentByUser.get(
            participant.userId,
          )?.teamNo === 1
            ? participant.score
            : 0
        ),
      0,
    );

  const teamTwoScore =
    scored.reduce(
      (
        sum,
        participant,
      ) =>
        sum +
        (
          teamAssignmentByUser.get(
            participant.userId,
          )?.teamNo === 2
            ? participant.score
            : 0
        ),
      0,
    );

  const teamTotal =
    teamOneScore +
    teamTwoScore;

  const rawTeamRows = [
    {
      teamNo: 1 as const,
      score: teamOneScore,
    },
    {
      teamNo: 2 as const,
      score: teamTwoScore,
    },
  ];

  const teamRows =
    referenceTeamNo
      ? [...rawTeamRows].sort(
          (a, b) => {
            if (
              a.teamNo ===
              referenceTeamNo
            ) {
              return -1;
            }

            if (
              b.teamNo ===
              referenceTeamNo
            ) {
              return 1;
            }

            return 0;
          },
        )
      : rawTeamRows;

  const teamLabel = (
    teamNo: 1 | 2,
  ) =>
    referenceTeamNo ===
    teamNo
      ? "우리팀"
      : "상대팀";

  const teamMembers = (
    teamNo: 1 | 2,
  ) =>
    scored.filter(
      (participant) =>
        teamAssignmentByUser.get(
          participant.userId,
        )?.teamNo ===
        teamNo,
    );

  const teamLeader =
    teamOneScore === teamTwoScore
      ? null
      : teamOneScore > teamTwoScore
        ? 1
        : 2;

  const teamScoreGap =
    Math.abs(
      teamOneScore -
      teamTwoScore,
    );

  useEffect(() => {
    if (
      match.status !==
        "LIVE" ||
      !match.endsAt
    ) {
      return;
    }

    setNow(
      Date.now(),
    );

    const timer =
      window.setInterval(
        () => {
          setNow(
            Date.now(),
          );
        },
        250,
      );

    return () => {
      window.clearInterval(
        timer,
      );
    };
  }, [
    match.status,
    match.endsAt,
  ]);

  useEffect(() => {
    if (
      match.status !==
      "LIVE"
    ) {
      previousScoresRef.current =
        {};
      return;
    }

    const previous =
      previousScoresRef.current;

    const bumps:
      Record<string, number> =
      {};

    for (
      const participant of
      scored
    ) {
      const before =
        previous[
          participant.userId
        ] ?? 0;

      const delta =
        participant.score -
        before;

      if (
        delta > 0 &&
        Object.keys(previous)
          .length > 0
      ) {
        bumps[
          participant.userId
        ] = delta;
      }
    }

    if (
      Object.keys(bumps)
        .length > 0
    ) {
      setScoreBumps(
        bumps,
      );

      if (
        bumpTimerRef.current !==
        null
      ) {
        window.clearTimeout(
          bumpTimerRef.current,
        );
      }

      bumpTimerRef.current =
        window.setTimeout(
          () => {
            setScoreBumps({});
          },
          1200,
        );
    }

    previousScoresRef.current =
      Object.fromEntries(
        scored.map(
          (participant) => [
            participant.userId,
            participant.score,
          ],
        ),
      );

    lastLiveScoresRef.current =
      Object.fromEntries(
        scored.map(
          (participant) => [
            participant.userId,
            participant.score,
          ],
        ),
      );
  }, [
    match.status,
    match.scores,
    scored,
  ]);

  useEffect(() => {
    const previousStatus =
      previousStatusRef.current;

    const justFinished =
      previousStatus ===
        "LIVE" &&
      match.status ===
        "READY";

    if (justFinished) {
      const finalScores =
        lastLiveScoresRef.current;

      const resultRows =
        participants.map(
          (participant) => ({
            userId:
              participant.userId,
            roomId:
              participant.roomId,
            nickname:
              participant.nickname,
            score:
              finalScores[
                participant.userId
              ] ?? 0,
          }),
        );

      // FLATLIVE_CLUTCH_TEAM_RESULT_V1
      if (
        match.matchMode === "TEAM" &&
        safeTeamAssignments.length === 4
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

        const finalTeamOne =
          resultRows.reduce(
            (
              sum,
              participant,
            ) =>
              sum +
              (
                assignmentByUser.get(
                  participant.userId,
                )?.teamNo === 1
                  ? participant.score
                  : 0
              ),
            0,
          );

        const finalTeamTwo =
          resultRows.reduce(
            (
              sum,
              participant,
            ) =>
              sum +
              (
                assignmentByUser.get(
                  participant.userId,
                )?.teamNo === 2
                  ? participant.score
                  : 0
              ),
            0,
          );

        const teamDraw =
          finalTeamOne ===
          finalTeamTwo;

        const winningTeamNo =
          teamDraw
            ? null
            : finalTeamOne >
                finalTeamTwo
              ? 1
              : 2;

        const winners =
          winningTeamNo
            ? resultRows.filter(
                (participant) =>
                  assignmentByUser.get(
                    participant.userId,
                  )?.teamNo ===
                  winningTeamNo,
              )
            : [];

        setResult({
          winners,

          topScore:
            Math.max(
              finalTeamOne,
              finalTeamTwo,
            ),

          draw:
            teamDraw,

          teamMode:
            true,
        });
      } else {
        const topScore =
          resultRows.reduce(
            (
              max,
              participant,
            ) =>
              Math.max(
                max,
                participant.score,
              ),
            0,
          );

        const winners =
          resultRows.filter(
            (participant) =>
              participant.score ===
              topScore,
          );

        setResult({
          winners,
          topScore,

          draw:
            winners.length !== 1,

          teamMode:
            false,
        });
      }

      setResultVisible(
        true,
      );

      if (
        resultTimerRef.current !==
        null
      ) {
        window.clearTimeout(
          resultTimerRef.current,
        );
      }

      resultTimerRef.current =
        window.setTimeout(
          () => {
            setResultVisible(
              false,
            );
          },
          2800,
        );
    }

    previousStatusRef.current =
      match.status;
  }, [
    match.status,
    match.matchMode,
    match.teamAssignments,
    participants,
  ]);

  useEffect(
    () => () => {
      if (
        resultTimerRef.current !==
        null
      ) {
        window.clearTimeout(
          resultTimerRef.current,
        );
      }

      if (
        bumpTimerRef.current !==
        null
      ) {
        window.clearTimeout(
          bumpTimerRef.current,
        );
      }
    },
    [],
  );

  const remaining =
    match.status ===
      "LIVE" &&
    match.endsAt
      ? Math.max(
          0,
          Math.ceil(
            (
              match.endsAt -
              now
            ) /
              1000,
          ),
        )
      : 0;

  // FLATLIVE_CLUTCH_TENSION_VERIFIED_V2
  const leader =
    ranked[0] ?? null;

  const runnerUp =
    ranked[1] ?? null;

  const scoreGap =
    leader &&
    runnerUp
      ? Math.abs(
          leader.score -
          runnerUp.score,
        )
      : 0;

  const topScore =
    leader?.score ?? 0;

  const closeBattle =
    Boolean(
      leader &&
      runnerUp &&
      scoreGap <=
        Math.max(
          100,
          Math.floor(
            topScore * 0.08,
          ),
        ),
    );

  const tensionLabel =
    remaining <= 10
      ? "🔥 마지막 승부"
      : remaining <= 30
        ? "⚡ 마지막 30초"
        : closeBattle
          ? "🔥 접전"
          : "";

  // FLATLIVE_CLUTCH_TEAM_TENSION_V1
  const battleMessage =
    isTeamMode
      ? teamScoreGap === 0
        ? "팀 동점"
        : teamLeader
          ? `${teamLabel(
              teamLeader,
            )} 선두 · ${teamScoreGap.toLocaleString()} FLAT 차`
          : "팀 승부 시작"
      : leader &&
          runnerUp
        ? scoreGap === 0
          ? "동점"
          : `${leader.nickname} 선두 · ${scoreGap.toLocaleString()} FLAT 차`
        : "승부 시작";

  return (
    <>
      {match.status ===
        "READY" &&
        !resultVisible && (
          <div className="pointer-events-none absolute left-1/2 top-2 z-40 -translate-x-1/2 rounded-full border border-yellow-300/20 bg-black/60 px-2.5 py-1 text-[8px] font-black tracking-[0.16em] text-yellow-200 backdrop-blur-md md:top-3">
            CLUTCH · READY
          </div>
        )}

      {match.status ===
        "LIVE" && (
        <div className="pointer-events-none absolute left-1/2 top-2 z-40 w-[min(96%,620px)] -translate-x-1/2 md:top-3">
          {/* FLATLIVE_CLUTCH_TENSION_UI_VERIFIED_V2 */}
          {(tensionLabel || battleMessage) && (
            <div className="mb-1 flex items-center justify-center gap-1.5">
              {tensionLabel && (
                <div
                  className={`rounded-full px-2.5 py-0.5 text-[9px] font-black shadow-lg backdrop-blur-md ${
                    remaining <= 10
                      ? "bg-yellow-300 text-black"
                      : "border border-yellow-300/40 bg-black/75 text-yellow-200"
                  }`}
                >
                  {tensionLabel}
                </div>
              )}

              <div className="rounded-full border border-white/10 bg-black/70 px-2.5 py-0.5 text-[8px] font-bold text-white/85 backdrop-blur-md">
                {battleMessage}
              </div>
            </div>
          )}

          <div className="relative overflow-visible rounded-full border border-white/10 bg-black/65 px-2 py-1 backdrop-blur-md md:px-3">
            <div className="flex h-8 items-center gap-2 md:h-9 md:gap-3">
              <div className="shrink-0 text-[8px] font-black tracking-[0.18em] text-yellow-300">
                CLUTCH
              </div>

              {/* FLATLIVE_CLUTCH_TEAM_SCORE_ROW_V1 */}
              <div className="flex min-w-0 flex-1 items-center justify-between gap-1.5">
                {isTeamMode
                  ? teamRows.map(
                      (team) => {
                        const members =
                          teamMembers(
                            team.teamNo,
                          );

                        const bump =
                          members.reduce(
                            (
                              sum,
                              member,
                            ) =>
                              sum +
                              (
                                scoreBumps[
                                  member.userId
                                ] ?? 0
                              ),
                            0,
                          );

                        return (
                          <div
                            key={
                              team.teamNo
                            }
                            className="relative flex min-w-0 flex-1 items-center justify-center gap-1.5"
                          >
                            <span
                              className={`shrink-0 rounded-full px-2 py-0.5 text-[8px] font-black ${
                                team.teamNo ===
                                referenceTeamNo
                                  ? "bg-yellow-300 text-black"
                                  : "border border-white/20 bg-black/70 text-white"
                              }`}
                            >
                              {teamLabel(
                                team.teamNo,
                              )}
                            </span>

                            <span className="text-[12px] font-black tabular-nums text-yellow-100 md:text-sm">
                              {team.score.toLocaleString()} FLAT
                            </span>

                            {teamLeader ===
                              team.teamNo &&
                              team.score >
                                0 && (
                                <span className="text-[8px]">
                                  👑
                                </span>
                              )}

                            {bump > 0 && (
                              <span className="absolute -top-5 right-1 rounded-full bg-yellow-300 px-1.5 py-0.5 text-[9px] font-black text-black shadow-lg">
                                +
                                {bump.toLocaleString()}
                              </span>
                            )}
                          </div>
                        );
                      },
                    )
                  : ranked.map(
                      (
                        participant,
                        index,
                      ) => (
                        <div
                          key={
                            participant.userId
                          }
                          className="relative flex min-w-0 flex-1 items-center justify-center gap-1"
                        >
                          <span className="max-w-[68px] truncate text-[9px] font-bold text-white md:max-w-[100px] md:text-[10px]">
                            {
                              participant.nickname
                            }
                          </span>

                          <span className="text-[10px] font-black tabular-nums text-yellow-200 md:text-xs">
                            {participant.score.toLocaleString()} FLAT
                          </span>

                          {index ===
                            0 &&
                            participant.score >
                              0 && (
                              <span className="text-[8px]">
                                👑
                              </span>
                            )}

                          {scoreBumps[
                            participant.userId
                          ] > 0 && (
                            <span className="absolute -top-5 right-1 rounded-full bg-yellow-300 px-1.5 py-0.5 text-[9px] font-black text-black shadow-lg">
                              +
                              {scoreBumps[
                                participant.userId
                              ].toLocaleString()}
                            </span>
                          )}
                        </div>
                      ),
                    )}
              </div>

              <div
                className={
                  remaining <= 10
                    ? "shrink-0 text-sm font-black tabular-nums text-yellow-300 md:text-base"
                    : "shrink-0 text-xs font-black tabular-nums text-white md:text-sm"
                }
              >
                {formatTime(
                  remaining,
                )}
              </div>
            </div>

            {/* FLATLIVE_CLUTCH_BATTLE_GAUGE_V1 */}
            {isTeamMode ? (
              <div className="absolute -bottom-[4px] left-2 right-2 h-[5px] md:h-[6px]">
                {(() => {
                  const ownTeam =
                    teamRows[0];

                  const opponentTeam =
                    teamRows[1];

                  const ownPercent =
                    teamTotal > 0
                      ? Math.max(
                          8,
                          Math.min(
                            92,
                            (
                              ownTeam.score /
                              teamTotal
                            ) * 100,
                          ),
                        )
                      : 50;

                  return (
                    <div className="relative h-full w-full">
                      <div className="absolute inset-0 overflow-hidden rounded-full border border-white/15 bg-zinc-800/90 shadow-lg">

                        {/* 우리팀 */}
                        <div
                          className="absolute inset-y-0 left-0 bg-gradient-to-r from-yellow-500 via-yellow-300 to-amber-200 transition-[width] duration-500 ease-out"
                          style={{
                            width:
                              `${ownPercent}%`,
                          }}
                        />

                        {/* 상대팀 */}
                        <div
                          className="absolute inset-y-0 right-0 bg-gradient-to-l from-zinc-500 via-zinc-300 to-white/80 transition-[width] duration-500 ease-out"
                          style={{
                            width:
                              `${100 - ownPercent}%`,
                          }}
                        />

                        {/* 빛 효과 */}
                        <div
                          className="absolute inset-y-0 w-8 -translate-x-1/2 bg-white/20 blur-md transition-[left] duration-500"
                          style={{
                            left:
                              `${ownPercent}%`,
                          }}
                        />
                      </div>

                      {/* 중앙 움직이는 CLUTCH 경계 */}
                      {/* FLATLIVE_CLUTCH_THIN_CENTER_V3 */}
                      <div
                        className="absolute top-1/2 z-20 h-[11px] w-[2px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-[0_0_5px_rgba(255,255,255,0.8)] transition-[left] duration-500 ease-out"
                        style={{
                          left:
                            `${ownPercent}%`,
                        }}
                      />

                      {/* 좌우 팀 표시 */}
                      <div className="absolute -top-[15px] left-0 text-[8px] font-black text-yellow-200 drop-shadow-md">
                        우리팀
                        {" "}
                        {ownTeam.score.toLocaleString()}
                      </div>

                      <div className="absolute -top-[15px] right-0 text-[8px] font-black text-white drop-shadow-md">
                        {opponentTeam.score.toLocaleString()}
                        {" "}
                        상대팀
                      </div>
                    </div>
                  );
                })()}
              </div>
            ) : (
              <div className="absolute -bottom-[4px] left-2 right-2 flex h-[5px] overflow-hidden rounded-full border border-white/10 bg-zinc-900/90 shadow-sm md:h-[6px]">
                {ranked.map(
                  (
                    participant,
                    index,
                  ) => {
                    const width =
                      total > 0
                        ? (
                            participant.score /
                            total
                          ) *
                          100
                        : 100 /
                          Math.max(
                            ranked.length,
                            1,
                          );

                    const opacity =
                      index === 0
                        ? "opacity-100"
                        : index === 1
                          ? "opacity-70"
                          : index === 2
                            ? "opacity-50"
                            : "opacity-35";

                    return (
                      <div
                        key={
                          participant.userId
                        }
                        className={`h-full transition-[width] duration-500 ${
                          index === 0
                            ? "bg-gradient-to-r from-yellow-500 via-yellow-300 to-amber-200"
                            : index === 1
                              ? "bg-gradient-to-l from-zinc-400 via-zinc-200 to-white"
                              : "bg-zinc-500"
                        } ${opacity}`}
                        style={{
                          width:
                            `${width}%`,
                        }}
                      />
                    );
                  },
                )}
              </div>
            )}

          </div>
        </div>
      )}

      <ClutchResultOverlay
        visible={
          resultVisible &&
          Boolean(result)
        }
        winners={
          result?.winners ??
          []
        }
        topScore={
          result?.topScore ??
          0
        }
        roomId={roomId}
        role={role}
        draw={
          result?.draw ??
          false
        }
        teamMode={
          result?.teamMode ??
          false
        }
      />
    </>
  );
}
