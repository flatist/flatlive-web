"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useLiveMatch,
} from "./useLiveMatch";

import MatchInviteModal from "./MatchInviteModal";
import MatchScoreBoard from "./MatchScoreBoard";

type Props = {
  roomId: string;
  onMatchChange?: (
    match: import(
      "@/lib/live/match/match-types"
    ).LiveMatch | null,
  ) => void;
};

type RoomInfo = {
  broadcasterUserId?: string;
  broadcasterUsername?: string;
  broadcasterName?: string;
  broadcasterAvatarUrl?: string;
};

export default function MatchPanel({
  roomId,
  onMatchChange,
}: Props) {
  const {
    match,
    setMatch,

    incomingInvites,

    loading,
    error,
    setError,

    callMatchApi,
    getLastMatchError,
    refreshMatch,
    refreshRoomMatch,
    loadIncomingInvites,
  } = useLiveMatch();

  const [
    roomInfo,
    setRoomInfo,
  ] = useState<RoomInfo | null>(
    null,
  );

  const [
    inviteOpen,
    setInviteOpen,
  ] = useState(false);


  // FLATLIVE_CLUTCH_MODE_STATE_V1
  const [
    roundMode,
    setRoundMode,
  ] = useState<
    "SOLO" | "TEAM"
  >("SOLO");

  const [
    teamByUser,
    setTeamByUser,
  ] = useState<
    Record<
      string,
      1 | 2
    >
  >({});

  const [
    mobileClutchOpen,
    setMobileClutchOpen,
  ] = useState(false);

  // FLATLIVE_CLUTCH_MOBILE_BACK_BUTTON_V1
  const [
    mobileClutchInviteDismissed,
    setMobileClutchInviteDismissed,
  ] = useState(false);

  // FLATLIVE_CLUTCH_INCOMING_INVITE_HOOK_ORDER_V2
  const incomingInvite =
    incomingInvites[0] ??
    null;

  // FLATLIVE_CLUTCH_HOOK_ORDER_FIX_MOBILE_BACK_V1
  useEffect(() => {
    if (
      !incomingInvite ||
      match
    ) {
      setMobileClutchInviteDismissed(
        false,
      );
    }
  }, [
    incomingInvite,
    match,
  ]);


  // FLATLIVE_CLUTCH_REFRESH_REJOIN_STATE_V1
  const [
    restoringClutch,
    setRestoringClutch,
  ] = useState(true);

  // FLATLIVE_MATCH_PANEL_MEDIA_CALLBACK
  useEffect(() => {
    onMatchChange?.(
      match ?? null,
    );
  }, [
    match,
    onMatchChange,
  ]);


  useEffect(() => {
    if (!roomId) {
      setRoomInfo(null);
      setMatch(null);
      return;
    }

    let cancelled = false;

    const loadRoom = async () => {
      try {
        const response =
          await fetch(
            `/api/live/signal?roomId=${encodeURIComponent(
              roomId,
            )}`,
            {
              cache: "no-store",
            },
          );

        if (
          !response.ok ||
          cancelled
        ) {
          return;
        }

        const data =
          await response.json();

        if (!cancelled) {
          setRoomInfo({
            broadcasterUserId:
              typeof data.broadcasterUserId ===
              "string"
                ? data.broadcasterUserId
                : "",

            broadcasterUsername:
              typeof data.broadcasterUsername ===
              "string"
                ? data.broadcasterUsername
                : "",

            broadcasterName:
              typeof data.broadcasterName ===
              "string"
                ? data.broadcasterName
                : "",

            broadcasterAvatarUrl:
              typeof data.broadcasterAvatarUrl ===
              "string"
                ? data.broadcasterAvatarUrl
                : "",
          });
        }
      } catch {
        // LIVE 자체 오류로 만들지 않음
      }
    };

    void loadRoom();

    return () => {
      cancelled = true;
    };
  }, [
    roomId,
    setMatch,
  ]);

  // FLATLIVE_CLUTCH_REFRESH_AUTO_REJOIN_V1
  useEffect(() => {
    if (!roomId) {
      setRestoringClutch(
        false,
      );
      return;
    }

    let cancelled = false;

    const restoreExistingClutch =
      async () => {
        setRestoringClutch(
          true,
        );

        try {
          // 새로고침 시 새 클러치를 만들지 않고
          // DB에 남아 있는 현재 roomId의
          // ACCEPTED 클러치를 먼저 복구한다.
          await refreshRoomMatch(
            roomId,
          );

          if (!cancelled) {
            setError("");
          }
        } catch (error) {
          if (!cancelled) {
            console.warn(
              "CLUTCH REFRESH REJOIN FAILED",
              error,
            );
          }
        } finally {
          if (!cancelled) {
            setRestoringClutch(
              false,
            );
          }
        }
      };

    void restoreExistingClutch();

    return () => {
      cancelled = true;
    };
  }, [
    roomId,
    refreshRoomMatch,
    setError,
  ]);

  useEffect(() => {
    if (!roomId) {
      return;
    }

    void loadIncomingInvites(
      roomId,
    );

    const timer =
      window.setInterval(
        () => {
          void loadIncomingInvites(
            roomId,
          );
        },
        1500,
      );

    return () => {
      window.clearInterval(
        timer,
      );
    };
  }, [
    roomId,
    loadIncomingInvites,
  ]);

  useEffect(() => {
    if (!match?.matchId) {
      return;
    }

    if (
      match.status ===
        "FINISHED" ||
      match.status ===
        "CANCELLED"
    ) {
      return;
    }

    const timer =
      window.setInterval(
        () => {
          void refreshMatch(
            match.matchId,
          );
        },
        1000,
      );

    return () => {
      window.clearInterval(
        timer,
      );
    };
  }, [
    match?.matchId,
    match?.status,
    refreshMatch,
  ]);

  // FLATLIVE_CLUTCH_AUTO_ROUND_FINISH_V2
  useEffect(() => {
    if (
      !match ||
      match.hostRoomId !== roomId ||
      match.status !== "LIVE" ||
      !match.endsAt
    ) {
      return;
    }

    const remaining =
      Math.max(
        0,
        match.endsAt -
          Date.now(),
      );

    const timer =
      window.setTimeout(
        () => {
          void callMatchApi({
            action: "finish",
            matchId:
              match.matchId,
          });
        },
        remaining + 200,
      );

    return () => {
      window.clearTimeout(
        timer,
      );
    };
  }, [
    match?.matchId,
    match?.status,
    match?.endsAt,
    match?.hostRoomId,
    roomId,
    callMatchApi,
  ]);

  const activeCount =
    useMemo(
      () =>
        match?.participants.filter(
          (participant) =>
            participant.status ===
              "HOST" ||
            participant.status ===
              "ACCEPTED",
        ).length ?? 0,
      [match],
    );

  if (!roomId) {
    return null;
  }

  const createMatch =
    async () => {
      // FLATLIVE_CLUTCH_CREATE_AFTER_RESTORE_V1
      if (restoringClutch) {
        setError(
          "기존 클러치 연결을 확인하는 중입니다. 잠시 후 다시 눌러주세요.",
        );
        return;
      }

      // 새로고침 직후 이미 복구된 클러치가 있으면
      // 새 세션을 만들지 않는다.
      if (
        match &&
        match.status !== "FINISHED" &&
        match.status !== "CANCELLED"
      ) {
        setError("");
        return;
      }

      const userId =
        roomInfo
          ?.broadcasterUserId
          ?.trim() ?? "";

      if (!userId) {
        setError(
          "방송자 정보를 불러오는 중입니다. 잠시 후 다시 눌러주세요.",
        );
        return;
      }

      const nickname =
        roomInfo
          ?.broadcasterName
          ?.trim() ||
        roomInfo
          ?.broadcasterUsername
          ?.trim() ||
        "방송자";

      try {
        await callMatchApi({
          action: "create",
          hostUserId: userId,
          hostRoomId: roomId,
          hostNickname: nickname,
          hostAvatarUrl:
            roomInfo
              ?.broadcasterAvatarUrl ??
            "",
        });
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "";

        if (
          message.includes(
            "이미 다른 클러치",
          ) ||
          message.includes(
            "ALREADY",
          ) ||
          message.includes(
            "ACTIVE",
          )
        ) {
          // FLATLIVE_CLUTCH_EXISTING_SESSION_RECOVERY_V1
          // 같은 LIVE 방에 이미 활성 클러치가 있으면
          // 새로 만들지 않고 기존 세션을 다시 불러온다.
          await refreshRoomMatch(
            roomId,
          );

          // FLATLIVE_CLUTCH_EXISTING_SILENT_RECOVERY_V2
          setError("");

          return;
        }

        setError(
          message ||
            "클러치 생성 중 오류가 발생했습니다.",
        );
      }
    };

  const inviteByRoomId =
    async (
      targetRoomId: string,
    ) => {
      if (!match) {
        throw new Error(
          "먼저 클러치를 만들어주세요.",
        );
      }

      if (
        match.participantIds.length >=
        4
      ) {
        throw new Error(
          "최대 4명까지 참가할 수 있습니다.",
        );
      }

      if (
        targetRoomId === roomId
      ) {
        throw new Error(
          "자기 방송은 초대할 수 없습니다.",
        );
      }

      console.log(
        "[CLUTCH_INVITE_TRACE] 1 target room",
        {
          targetRoomId,
          currentRoomId: roomId,
          matchId: match?.matchId,
        },
      );

      const response =
        await fetch(
          `/api/live/signal?roomId=${encodeURIComponent(
            targetRoomId,
          )}`,
          {
            cache: "no-store",
          },
        );

      console.log(
        "[CLUTCH_INVITE_TRACE] 2 signal response",
        {
          ok: response.ok,
          status: response.status,
          targetRoomId,
        },
      );

      if (!response.ok) {
        throw new Error(
          "상대 방송을 찾을 수 없습니다.",
        );
      }

      const data =
        await response.json();

      const userId =
        typeof data.broadcasterUserId ===
        "string"
          ? data.broadcasterUserId.trim()
          : "";

      const nickname =
        (
          typeof data.broadcasterName ===
          "string"
            ? data.broadcasterName
            : ""
        ).trim() ||
        (
          typeof data.broadcasterUsername ===
          "string"
            ? data.broadcasterUsername
            : ""
        ).trim() ||
        "방송자";

      if (!userId) {
        throw new Error(
          "상대 방송자 정보를 확인할 수 없습니다.",
        );
      }

      console.log(
        "[CLUTCH_INVITE_TRACE] 3 invite payload",
        {
          matchId: match.matchId,
          userId,
          roomId: targetRoomId,
          nickname,
        },
      );

      const inviteResult =
        await callMatchApi({
          action: "invite",
          matchId: match.matchId,
          userId,
          roomId: targetRoomId,
          nickname,
          avatarUrl:
            typeof data.broadcasterAvatarUrl ===
            "string"
              ? data.broadcasterAvatarUrl
              : "",
        });

      console.log(
        "[CLUTCH_INVITE_TRACE] 4 invite result",
        {
          success: Boolean(inviteResult),
          inviteResult,
        },
      );

      if (!inviteResult) {
        throw new Error(
          "CLUTCH_INVITE_API_RETURNED_NULL",
        );
      }
    };

  // FLATLIVE_CLUTCH_ACCEPT_REAL_SWITCH_V2
  const respondInvite =
    async (
      accept: boolean,
    ) => {
      if (!incomingInvite) {
        return;
      }

      const participant =
        incomingInvite.participants.find(
          (item) =>
            item.roomId === roomId,
        );

      if (!participant) {
        setError(
          "현재 방송의 클러치 초대 정보를 찾을 수 없습니다.",
        );
        return;
      }

      // ------------------------------
      // 거절
      // ------------------------------
      if (!accept) {
        const rejected =
          await callMatchApi({
            action: "reject",
            matchId:
              incomingInvite.matchId,
            userId:
              participant.userId,
          });

        await loadIncomingInvites(
          roomId,
        );

        if (rejected) {
          setError("");
        }

        return;
      }

      // ------------------------------
      // 1차 수락
      // ------------------------------
      const accepted =
        await callMatchApi({
          action: "accept",
          matchId:
            incomingInvite.matchId,
          userId:
            participant.userId,
        });

      if (accepted) {
        setMatch(accepted);

        await refreshRoomMatch(
          roomId,
        );

        await loadIncomingInvites(
          roomId,
        );

        setError("");
        return;
      }

      // ------------------------------
      // 수락 실패:
      // roomId 기준 활성 클러치 확인
      // ------------------------------
      const active =
        await refreshRoomMatch(
          roomId,
        );

      // 이미 같은 클러치에 ACCEPTED라면
      // 실제로는 연결된 상태이므로 복구만 한다.
      if (
        active &&
        active.matchId ===
          incomingInvite.matchId
      ) {
        setMatch(active);

        await loadIncomingInvites(
          roomId,
        );

        setError("");
        return;
      }

      // 다른 활성 클러치가 남아 있음
      if (active) {
        const shouldSwitch =
          window.confirm(
            "현재 참여 중인 클러치에서 나가고 새 초대를 수락할까요?",
          );

        if (!shouldSwitch) {
          setError("");
          return;
        }

        // 본인만 기존 클러치에서 나간다.
        const left =
          await callMatchApi({
            action: "cancel",
            matchId:
              active.matchId,
          });

        if (!left) {
          setError(
            "기존 클러치에서 나가지 못했습니다. 다시 시도해주세요.",
          );
          return;
        }

        // 기존 active 상태가 사라졌는지 확인
        await refreshRoomMatch(
          roomId,
        );

        // 새 초대 재수락
        const retried =
          await callMatchApi({
            action: "accept",
            matchId:
              incomingInvite.matchId,
            userId:
              participant.userId,
          });

        if (!retried) {
          await loadIncomingInvites(
            roomId,
          );

          setError(
            getLastMatchError() ||
              "새 클러치 초대 연결에 실패했습니다. 다시 수락해주세요.",
          );
          return;
        }

        setMatch(retried);

        await refreshRoomMatch(
          roomId,
        );

        await loadIncomingInvites(
          roomId,
        );

        setError("");
        return;
      }

      // 활성 클러치 조회도 안 되는데
      // 수락이 실패한 경우
      await loadIncomingInvites(
        roomId,
      );

      setError(
        getLastMatchError() ||
          "클러치 초대 연결에 실패했습니다. 다시 수락해주세요.",
      );
    };


  const leaveCurrentClutch =
    async () => {
      if (!match) {
        return;
      }

      const result =
        await callMatchApi({
          action: "cancel",
          matchId: match.matchId,
        });

      if (!result) {
        await refreshRoomMatch(
          roomId,
        );

        await loadIncomingInvites(
          roomId,
        );

        return;
      }

      await refreshRoomMatch(
        roomId,
      );

      await loadIncomingInvites(
        roomId,
      );

      setError("");
    };

  // FLATLIVE_CLUTCH_ALREADY_ACTIVE_UI_FILTER_V2
  const visibleError =
    error &&
    (
      error.includes(
        "이미 클러치 참여중",
      ) ||
      error.includes(
        "이미 참여 중인 클러치",
      ) ||
      error.includes(
        "이미 다른 클러치",
      ) ||
      error.includes(
        "ALREADY",
      ) ||
      error.includes(
        "ACTIVE",
      )
    )
      ? ""
      : error;

  const isAcceptedParticipant =
    Boolean(
      match?.participants.some(
        (participant) =>
          participant.roomId === roomId &&
          (
            participant.status === "HOST" ||
            participant.status === "ACCEPTED"
          ),
      ),
    );

  // FLATLIVE_CLUTCH_HOOK_ORDER_FIX_V2
  // React Hook을 사용하지 않고
  // 현재 match 데이터에서 바로 계산한다.
  const activeParticipants =
    match?.participants.filter(
      (participant) =>
        participant.status ===
          "HOST" ||
        participant.status ===
          "ACCEPTED",
    ) ?? [];

  const activeUserIds =
    activeParticipants.map(
      (participant) =>
        participant.userId,
    );

  const savedTeam1Count =
    activeUserIds.filter(
      (userId) =>
        teamByUser[userId] === 1,
    ).length;

  const savedTeam2Count =
    activeUserIds.filter(
      (userId) =>
        teamByUser[userId] === 2,
    ).length;

  const savedTeamSetupValid =
    activeParticipants.length === 4 &&
    savedTeam1Count === 2 &&
    savedTeam2Count === 2 &&
    activeUserIds.every(
      (userId) =>
        teamByUser[userId] === 1 ||
        teamByUser[userId] === 2,
    );

  const defaultTeamByUser:
    Record<
      string,
      1 | 2
    > = {};

  if (
    activeParticipants.length === 4
  ) {
    activeParticipants.forEach(
      (
        participant,
        index,
      ) => {
        defaultTeamByUser[
          participant.userId
        ] =
          index < 2
            ? 1
            : 2;
      },
    );
  }

  // FLATLIVE_CLUTCH_TEAM_SELECTION_PERSIST_V1
  // 팀 변경 중 잠시 1:3 상태가 되어도
  // 사용자의 선택값을 유지한다.
  const effectiveTeamByUser:
    Record<string, 1 | 2> = {};

  if (
    activeParticipants.length === 4
  ) {
    activeParticipants.forEach(
      (
        participant,
        index,
      ) => {
        effectiveTeamByUser[
          participant.userId
        ] =
          teamByUser[
            participant.userId
          ] ??
          (
            index < 2
              ? 1
              : 2
          );
      },
    );
  }

  // FLATLIVE_CLUTCH_HOST_START_ONLY_V3
  const isHost =
    match?.hostRoomId === roomId;

  const canStart =
    Boolean(
      match &&
      isHost &&
      isAcceptedParticipant &&
      match.status === "READY" &&
      activeCount >= 2,
    );

  // FLATLIVE_CLUTCH_CONFIGURED_START_V1
  const team1Participants =
    activeParticipants.filter(
      (participant) =>
        effectiveTeamByUser[
          participant.userId
        ] === 1,
    );

  const team2Participants =
    activeParticipants.filter(
      (participant) =>
        effectiveTeamByUser[
          participant.userId
        ] === 2,
    );

  const teamSetupValid =
    activeParticipants.length === 4 &&
    team1Participants.length === 2 &&
    team2Participants.length === 2;

  const toggleParticipantTeam =
    (
      userId: string,
    ) => {
      const currentTeam =
        effectiveTeamByUser[
          userId
        ] ?? 1;

      setTeamByUser({
        ...effectiveTeamByUser,

        [userId]:
          currentTeam === 1
            ? 2
            : 1,
      });
    };

  const startConfiguredRound =
    async () => {
      if (
        !match ||
        !canStart
      ) {
        return;
      }

      if (
        roundMode === "TEAM"
      ) {
        if (
          !teamSetupValid
        ) {
          setError(
            "2:2 팀은 각 팀에 정확히 2명씩 지정해야 합니다.",
          );

          return;
        }

        const team1 =
          team1Participants;

        const team2 =
          team2Participants;

        const teamAssignments = [
          ...team1.map(
            (
              participant,
              index,
            ) => ({
              userId:
                participant.userId,

              teamNo:
                1 as const,

              seatNo:
                (
                  index === 0
                    ? 1
                    : 2
                ) as
                  1 | 2,
            }),
          ),

          ...team2.map(
            (
              participant,
              index,
            ) => ({
              userId:
                participant.userId,

              teamNo:
                2 as const,

              seatNo:
                (
                  index === 0
                    ? 3
                    : 4
                ) as
                  3 | 4,
            }),
          ),
        ];

        await callMatchApi({
          action:
            "start",

          matchId:
            match.matchId,

          durationSeconds:
            180,

          matchMode:
            "TEAM",

          teamAssignments,
        });

        setMobileClutchOpen(
          false,
        );

        return;
      }

      await callMatchApi({
        action:
          "start",

        matchId:
          match.matchId,

        durationSeconds:
          180,

        matchMode:
          "SOLO",

        teamAssignments:
          [],
      });

      setMobileClutchOpen(
        false,
      );
    };

  const renderModeSelector =
    (
      compact = false,
    ) => {
      if (
        !match ||
        match.status !== "READY" ||
        activeParticipants.length !== 4
      ) {
        return null;
      }

      return (
        <div
          className={
            compact
              ? "mt-2"
              : "mt-3 rounded-xl border border-white/10 bg-black/40 p-3"
          }
        >
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setRoundMode(
                  "SOLO",
                );
              }}
              className={`h-9 rounded-xl text-[10px] font-black ${
                roundMode ===
                "SOLO"
                  ? "bg-yellow-300 text-black"
                  : "border border-white/10 bg-zinc-900 text-zinc-300"
              }`}
            >
              개인전
            </button>

            <button
              type="button"
              onClick={() => {
                setRoundMode(
                  "TEAM",
                );
              }}
              className={`h-9 rounded-xl text-[10px] font-black ${
                roundMode ===
                "TEAM"
                  ? "bg-yellow-300 text-black"
                  : "border border-white/10 bg-zinc-900 text-zinc-300"
              }`}
            >
              2:2 팀전
            </button>
          </div>

          {roundMode ===
            "TEAM" && (
            <div className="mt-2">
              <div className="mb-2 flex items-center justify-between text-[9px] font-bold">
                <span className="text-yellow-200">
                  팀 1{" "}
                  {
                    team1Participants.length
                  }
                  /2
                </span>

                <span className="text-zinc-400">
                  방송자 눌러 팀 변경
                </span>

                <span className="text-yellow-200">
                  팀 2{" "}
                  {
                    team2Participants.length
                  }
                  /2
                </span>
              </div>

              <div className="grid grid-cols-2 gap-1.5">
                {activeParticipants.map(
                  (
                    participant,
                  ) => {
                    const team =
                      effectiveTeamByUser[
                        participant
                          .userId
                      ] ?? 1;

                    return (
                      <button
                        key={
                          participant.userId
                        }
                        type="button"
                        onClick={() => {
                          toggleParticipantTeam(
                            participant.userId,
                          );
                        }}
                        className={`flex min-w-0 items-center gap-2 rounded-xl border px-2 py-2 text-left ${
                          team === 1
                            ? "border-yellow-300/40 bg-yellow-300/10"
                            : "border-white/15 bg-zinc-900"
                        }`}
                      >
                        <div
                          className="h-7 w-7 shrink-0 rounded-full bg-zinc-800 bg-cover bg-center"
                          style={
                            participant.avatarUrl
                              ? {
                                  backgroundImage:
                                    `url(${participant.avatarUrl})`,
                                }
                              : undefined
                          }
                        />

                        <div className="min-w-0">
                          <div className="truncate text-[9px] font-black text-white">
                            {
                              participant.nickname
                            }
                          </div>

                          <div className="text-[8px] font-bold text-yellow-300">
                            팀 {team}
                          </div>
                        </div>
                      </button>
                    );
                  },
                )}
              </div>

              {!teamSetupValid && (
                <div className="mt-2 text-[9px] font-bold text-yellow-200">
                  각 팀에 2명씩 맞춰주세요.
                </div>
              )}
            </div>
          )}
        </div>
      );
    };

  const mobileClutchPanelVisible =
    mobileClutchOpen ||
    Boolean(
      incomingInvite &&
        !match &&
        !mobileClutchInviteDismissed,
    );

  const closeMobileClutchPanel = () => {
    setMobileClutchOpen(false);

    if (
      incomingInvite &&
      !match
    ) {
      setMobileClutchInviteDismissed(
        true,
      );
    }
  };

  return (
    <>
      {/* FLATLIVE_CLUTCH_MOBILE_CONTROLS_V1 */}
      {/* FLATLIVE_CLUTCH_MOBILE_ZINDEX_MENU_BELOW_V1 */}
      {/* FLATLIVE_CLUTCH_MOBILE_LAYER_SPLIT_V1 */}
      <div className="fixed bottom-[calc(env(safe-area-inset-bottom)+148px)] right-3 z-[1300] md:hidden">
        {/* FLATLIVE_CLUTCH_MOBILE_INVITE_DIRECT_OPEN_V1 */}
        {mobileClutchPanelVisible && (
          <div className="mb-2 w-[min(88vw,330px)] rounded-2xl border border-yellow-300/30 bg-zinc-950/95 p-3 shadow-2xl backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-black text-white">
                  ⚔️ LIVE 클러치
                </div>

                <div className="mt-0.5 text-[9px] font-bold text-zinc-500">
                  {match
                    ? `${activeCount}명 · ${match.status}`
                    : incomingInvite
                      ? "초대 도착"
                      : "클러치 준비"}
                </div>
              </div>

              <button
                type="button"
                onClick={
                  closeMobileClutchPanel
                }
                className="h-7 w-7 rounded-full bg-white/10 text-xs font-black text-white"
              >
                ×
              </button>
            </div>

            {incomingInvite &&
              !match && (
                <div className="mt-3 rounded-xl border border-yellow-300/25 bg-yellow-300/10 p-2.5">
                  <div className="text-[10px] font-black text-yellow-200">
                    클러치 초대가 왔습니다.
                  </div>

                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => {
                        void respondInvite(
                          false,
                        );
                      }}
                      className="h-9 rounded-xl bg-zinc-800 text-[10px] font-black text-white disabled:opacity-40"
                    >
                      거절
                    </button>

                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => {
                        void respondInvite(
                          true,
                        );
                      }}
                      className="h-9 rounded-xl bg-yellow-300 text-[10px] font-black text-black disabled:opacity-40"
                    >
                      수락
                    </button>
                  </div>
                </div>
              )}

            {!match &&
              !incomingInvite && (
                <button
                  type="button"
                  // FLATLIVE_CLUTCH_MOBILE_RESTORE_GUARD_V1
                  disabled={
                    loading ||
                    restoringClutch ||
                    !roomId
                  }
                  onClick={() => {
                    void createMatch();
                  }}
                  className="mt-3 h-10 w-full rounded-xl bg-yellow-300 text-[10px] font-black text-black disabled:opacity-40"
                >
                  클러치 만들기
                </button>
              )}

            {match && (
              <>
                {isAcceptedParticipant &&
                  match.status !==
                    "LIVE" &&
                  match.status !==
                    "FINISHED" &&
                  match.status !==
                    "CANCELLED" && (
                    <button
                      type="button"
                      disabled={
                        loading ||
                        match.participantIds
                          .length >= 4
                      }
                      onClick={() => {
                        setInviteOpen(
                          true,
                        );
                      }}
                      className="mt-3 h-9 w-full rounded-xl border border-yellow-300/30 bg-yellow-300/10 text-[10px] font-black text-yellow-200 disabled:opacity-40"
                    >
                      + 방송자 초대
                    </button>
                  )}

                {renderModeSelector(
                  true,
                )}

                {isHost &&
                  isAcceptedParticipant &&
                  match.status ===
                    "READY" && (
                    <button
                      type="button"
                      disabled={
                        loading ||
                        !isHost ||
                        !canStart ||
                        (
                          roundMode ===
                            "TEAM" &&
                          !teamSetupValid
                        )
                      }
                      onClick={() => {
                        void startConfiguredRound();
                      }}
                      className="mt-2 h-10 w-full rounded-xl bg-yellow-300 text-[10px] font-black text-black disabled:bg-zinc-800 disabled:text-zinc-500"
                    >
                      {roundMode ===
                      "TEAM"
                        ? "2:2 클러치 시작"
                        : "개인 클러치 시작"}
                    </button>
                  )}

                {isAcceptedParticipant &&
                  match.status ===
                    "LIVE" && (
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        disabled={
                          loading
                        }
                        onClick={() => {
                          void callMatchApi({
                            action:
                              "finish",

                            matchId:
                              match.matchId,
                          });
                        }}
                        className="h-10 rounded-xl bg-yellow-300 text-[10px] font-black text-black disabled:opacity-40"
                      >
                        라운드 종료
                      </button>

                      <button
                        type="button"
                        disabled={
                          loading
                        }
                        onClick={() => {
                          void leaveCurrentClutch();
                        }}
                        className="h-10 rounded-xl bg-zinc-800 text-[10px] font-black text-white disabled:opacity-40"
                      >
                        나가기
                      </button>
                    </div>
                  )}

                {isAcceptedParticipant &&
                  (
                    match.status ===
                      "INVITING" ||
                    match.status ===
                      "READY"
                  ) && (
                    <button
                      type="button"
                      disabled={
                        loading
                      }
                      onClick={() => {
                        void leaveCurrentClutch();
                      }}
                      className="mt-2 h-9 w-full rounded-xl border border-white/10 text-[9px] font-bold text-zinc-400 disabled:opacity-40"
                    >
                      클러치 나가기
                    </button>
                  )}
              </>
            )}

            {visibleError && (
              <div className="mt-2 rounded-lg bg-yellow-300/10 px-2 py-1.5 text-[9px] font-bold text-yellow-200">
                {visibleError}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="fixed bottom-[calc(env(safe-area-inset-bottom)+88px)] right-3 z-[400] md:hidden">
        <button
          type="button"
          onClick={() => {
            if (
              mobileClutchPanelVisible
            ) {
              closeMobileClutchPanel();
              return;
            }

            setMobileClutchInviteDismissed(
              false,
            );
            setMobileClutchOpen(true);
          }}
          className="ml-auto flex h-12 items-center gap-2 rounded-full border border-yellow-300/40 bg-black/85 px-4 text-[10px] font-black text-white shadow-2xl backdrop-blur-xl"
        >
          <span className="text-base">
            {mobileClutchPanelVisible
              ? "←"
              : "⚔️"}
          </span>

          {mobileClutchPanelVisible
            ? "뒤로"
            : "클러치"}

          {!mobileClutchPanelVisible &&
            incomingInvite &&
            !match && (
              <span className="h-2 w-2 rounded-full bg-yellow-300" />
            )}
        </button>
      </div>

      <section className="hidden border-t border-zinc-800 bg-zinc-950 px-3 py-3 md:block md:px-5">
        <div className="mx-auto w-full max-w-5xl rounded-2xl border border-white/10 bg-black/50 p-3 md:p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-white">
                  ⚔️ LIVE 클러치
                </span>

                {match && (
                  <span className="rounded-full bg-yellow-400/15 px-2 py-1 text-[9px] font-black text-yellow-300">
                    {match.status}
                  </span>
                )}
              </div>

              <div className="mt-1 text-[10px] text-zinc-500">
                2~4명 · 최대 상대 3명 초대
              </div>
            </div>

            {!match && (
              <button
                type="button"
                disabled={loading}
                onClick={() => {
                  void createMatch();
                }}
                className="h-10 rounded-xl bg-yellow-400 px-4 text-xs font-black text-black disabled:opacity-40"
              >
                클러치 만들기
              </button>
            )}
          </div>

          {incomingInvite && !match && (
            <div className="mt-3 rounded-xl border border-yellow-400/30 bg-yellow-400/10 p-3">
              <div className="text-xs font-black text-yellow-200">
                클러치 초대가 도착했습니다.
              </div>

              <div className="mt-1 text-[10px] text-zinc-400">
                참가 인원{" "}
                {
                  incomingInvite
                    .participants
                    .length
                }
                명
              </div>

              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => {
                    void respondInvite(
                      false,
                    );
                  }}
                  className="h-9 flex-1 rounded-lg bg-zinc-800 text-xs font-black text-white"
                >
                  거절
                </button>

                <button
                  type="button"
                  disabled={loading}
                  onClick={() => {
                    void respondInvite(
                      true,
                    );
                  }}
                  className="h-9 flex-1 rounded-lg bg-yellow-400 text-xs font-black text-black"
                >
                  수락
                </button>
              </div>
            </div>
          )}

          {match && (
            <>
              <div className="mt-4">
                <MatchScoreBoard
                  match={match}
                />
              </div>

              {/* FLATLIVE_CLUTCH_DESKTOP_MODE_UI_V1 */}
              {isAcceptedParticipant &&
                match.status ===
                  "READY" &&
                activeParticipants.length ===
                  4 &&
                renderModeSelector()}

              {isAcceptedParticipant &&
                match.status !==
                  "LIVE" &&
                match.status !==
                  "FINISHED" &&
                match.status !==
                  "CANCELLED" && (
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      disabled={
                        loading ||
                        match.participantIds
                          .length >= 4
                      }
                      onClick={() => {
                        setInviteOpen(
                          true,
                        );
                      }}
                      className="h-10 rounded-xl bg-zinc-800 text-xs font-black text-white disabled:opacity-40"
                    >
                      + 방송자 초대
                    </button>

                    <button
                      type="button"
                      disabled={
                        loading ||
                        !isHost ||
                        !canStart ||
                        (
                          roundMode ===
                            "TEAM" &&
                          !teamSetupValid
                        )
                      }
                      onClick={() => {
                        void startConfiguredRound();
                      }}
                      className="h-10 rounded-xl bg-red-600 text-xs font-black text-white disabled:bg-zinc-800 disabled:text-zinc-500"
                    >
                      클러치 시작
                    </button>
                  </div>
                )}

              {isAcceptedParticipant &&
                match.status ===
                  "LIVE" && (
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => {
                        void callMatchApi({
                          action: "finish",
                          matchId:
                            match.matchId,
                        });
                      }}
                      className="h-10 rounded-xl bg-yellow-400 text-xs font-black text-black disabled:opacity-40"
                    >
                      라운드 종료
                    </button>

                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => {
                      void leaveCurrentClutch();
                    }}
                      className="h-10 rounded-xl bg-zinc-800 text-xs font-black text-white disabled:opacity-40"
                    >
                      클러치 나가기
                    </button>
                  </div>
                )}

              {isAcceptedParticipant &&
                (
                  match.status ===
                    "INVITING" ||
                  match.status ===
                    "READY"
                ) && (
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => {
                      void leaveCurrentClutch();
                    }}
                    className="mt-2 h-9 w-full rounded-xl border border-zinc-800 text-[11px] font-bold text-zinc-400"
                  >
                    {match.status === "READY"
                      ? "클러치 나가기"
                      : "클러치 나가기"}
                  </button>
                )}
            </>
          )}

          {visibleError && (
            <div className="mt-3 rounded-xl bg-red-950/40 px-3 py-2 text-[11px] text-red-300">
              {visibleError}
            </div>
          )}
        </div>
      </section>

      <MatchInviteModal
        open={inviteOpen}
        disabled={
          !match ||
          match.participantIds.length >=
            4
        }
        currentRoomId={roomId}
        excludedRoomIds={
          match?.participants.map(
            (participant) =>
              participant.roomId,
          ) ?? []
        }
        onClose={() => {
          setInviteOpen(false);
        }}
        onInvite={inviteByRoomId}
      />
    </>
  );
}
