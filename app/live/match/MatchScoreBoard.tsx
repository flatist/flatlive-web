"use client";

import type {
  LiveMatch,
} from "@/lib/live/match/match-types";

type Props = {
  match: LiveMatch;
};

const STATUS_TEXT = {
  HOST: "방장",
  INVITED: "초대 중",
  ACCEPTED: "참가",
  REJECTED: "거절",
  LEFT: "나감",
} as const;

export default function MatchScoreBoard({
  match,
}: Props) {
  const ranked =
    [...match.participants]
      .filter(
        (participant) =>
          participant.status !==
            "REJECTED" &&
          participant.status !==
            "LEFT",
      )
      .sort(
        (a, b) =>
          (match.scores[b.userId] ??
            0) -
          (match.scores[a.userId] ??
            0),
      );

  return (
    <div className="space-y-2">
      {ranked.map(
        (participant, index) => (
          <div
            key={participant.userId}
            className="flex items-center gap-3 rounded-xl bg-black/40 px-3 py-2.5"
          >
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-yellow-400 text-xs font-black text-black">
              {index + 1}
            </div>

            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-black text-white">
                {participant.nickname}
              </div>

              <div className="mt-0.5 text-[10px] text-zinc-500">
                {
                  STATUS_TEXT[
                    participant.status
                  ]
                }
              </div>
            </div>

            <div className="text-right">
              <div className="text-sm font-black text-yellow-300">
                {(
                  match.scores[
                    participant.userId
                  ] ?? 0
                ).toLocaleString(
                  "ko-KR",
                )}
              </div>

              <div className="text-[9px] text-zinc-500">
                SCORE
              </div>
            </div>
          </div>
        ),
      )}
    </div>
  );
}
