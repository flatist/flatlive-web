"use client";

type ResultParticipant = {
  userId: string;
  roomId: string;
  nickname: string;
};

type Props = {
  visible: boolean;
  winners: ResultParticipant[];
  topScore: number;
  roomId: string;
  role: "broadcaster" | "viewer";
  draw: boolean;

  // FLATLIVE_CLUTCH_TEAM_RESULT_OVERLAY_V1
  teamMode: boolean;
};

export default function ClutchResultOverlay({
  visible,
  winners,
  topScore,
  roomId,
  role,
  draw,
  teamMode,
}: Props) {
  if (!visible) {
    return null;
  }

  const currentWinner =
    winners.some(
      (participant) =>
        participant.roomId === roomId,
    );

  const winnerNames =
    winners
      .map(
        (participant) =>
          participant.nickname || "방송자",
      )
      .join(" · ");

  let title = "";
  let subtitle = "";

  if (
    teamMode &&
    draw
  ) {
    title =
      "팀전 무승부";

    subtitle =
      `${topScore.toLocaleString()}점`;
  } else if (
    teamMode &&
    role === "broadcaster"
  ) {
    title =
      currentWinner
        ? "🏆 우리팀 승리!"
        : "상대팀 승리";

    subtitle =
      currentWinner
        ? `${winnerNames} · 팀 ${topScore.toLocaleString()}점`
        : `${winnerNames} 승리 · 팀 ${topScore.toLocaleString()}점`;
  } else if (
    teamMode
  ) {
    title =
      `🏆 ${winnerNames} 팀 승리`;

    subtitle =
      `팀 합산 ${topScore.toLocaleString()}점`;
  } else if (draw) {
    title = "무승부";
    subtitle =
      `${topScore.toLocaleString()}점`;
  } else if (role === "broadcaster") {
    title =
      currentWinner
        ? "🏆 승리!"
        : "패배";

    subtitle =
      currentWinner
        ? `${topScore.toLocaleString()}점 · 클러치 1위`
        : `${winnerNames} 승리 · ${topScore.toLocaleString()}점`;
  } else {
    title =
      `🏆 ${winnerNames} 승리`;

    subtitle =
      `${topScore.toLocaleString()}점 · 클러치 1위`;
  }

  return (
    <div className="pointer-events-none absolute inset-0 z-[70] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/15" />

      <div className="relative mx-4 rounded-2xl border border-yellow-300/40 bg-black/80 px-6 py-4 text-center shadow-2xl backdrop-blur-md">
        <div className="text-[10px] font-black tracking-[0.2em] text-yellow-300">
          CLUTCH RESULT
        </div>

        <div className="mt-1 text-2xl font-black text-white md:text-3xl">
          {title}
        </div>

        <div className="mt-1 text-xs font-bold text-yellow-100">
          {subtitle}
        </div>
      </div>
    </div>
  );
}
