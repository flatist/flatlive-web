"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

type BanRecord = {
  banId: string;
  broadcasterUserId: string;
  roomId: string | null;
  targetUserId: string | null;
  targetGuestId: string | null;
  targetDisplayName?: string | null;
  scope: "ROOM" | "BROADCASTER";
  durationType:
    | "ROOM"
    | "ONE_DAY"
    | "PERMANENT";
  reason: string;
  reasonDetail: string;
  actorUserId: string;
  createdAt: string;
  expiresAt: string | null;
  revokedAt: string | null;
  revokedByUserId: string | null;
};

type Props = {
  compact?: boolean;
};

function durationLabel(
  duration: BanRecord["durationType"],
) {
  if (duration === "ONE_DAY") {
    return "1일 강퇴";
  }

  if (duration === "PERMANENT") {
    return "영구 강퇴";
  }

  return "현재 방송";
}

function reasonLabel(reason: string) {
  const labels: Record<string, string> = {
    SPAM: "도배",
    ABUSE: "욕설",
    SEXUAL_HARASSMENT: "성희롱",
    CONFLICT: "분쟁유발",
    OTHER: "기타",
  };

  return labels[reason] || reason;
}

function formatDate(value: string | null) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleString("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function StudioBanManager({
  compact = false,
}: Props) {
  // FLATLIVE_BAN_MANAGER_V1
  const [bans, setBans] =
    useState<BanRecord[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [revokingId, setRevokingId] =
    useState("");

  const loadBans = useCallback(
    async () => {
      try {
        setLoading(true);
        setError("");

        const response =
          await fetch(
            "/api/live/moderation",
            {
              method: "GET",
              cache: "no-store",
            },
          );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data.error ||
              "강퇴자 목록을 불러오지 못했습니다.",
          );
        }

        const nextBans =
          Array.isArray(data.bans)
            ? data.bans.filter(
                (ban: BanRecord) =>
                  ban.scope ===
                    "BROADCASTER" &&
                  (
                    ban.durationType ===
                      "ONE_DAY" ||
                    ban.durationType ===
                      "PERMANENT"
                  ),
              )
            : [];

        setBans(nextBans);
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "강퇴자 목록을 불러오지 못했습니다.",
        );
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    void loadBans();
  }, [loadBans]);

  async function revokeBan(
    ban: BanRecord,
  ) {
    if (revokingId) {
      return;
    }

    const confirmed =
      window.confirm(
        "이 사용자의 강퇴를 해제할까요?",
      );

    if (!confirmed) {
      return;
    }

    try {
      setRevokingId(ban.banId);
      setError("");

      const response =
        await fetch(
          "/api/live/moderation",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              action: "unban",
              banId: ban.banId,
            }),
          },
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "강퇴 해제에 실패했습니다.",
        );
      }

      setBans((current) =>
        current.filter(
          (item) =>
            item.banId !== ban.banId,
        ),
      );
    } catch (revokeError) {
      setError(
        revokeError instanceof Error
          ? revokeError.message
          : "강퇴 해제에 실패했습니다.",
      );
    } finally {
      setRevokingId("");
    }
  }

  if (loading) {
    return (
      <div className="rounded-xl bg-zinc-900 px-3 py-5 text-center text-xs text-zinc-500">
        강퇴자 목록 불러오는 중...
      </div>
    );
  }

  return (
    <div
      className={
        compact
          ? "space-y-2"
          : "space-y-3"
      }
    >
      <div className="flex items-center justify-between">
        <div className="text-xs font-black text-white">
          강퇴자 관리
        </div>

        <button
          type="button"
          onClick={() => {
            void loadBans();
          }}
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-1 text-[10px] font-bold text-zinc-300"
        >
          새로고침
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-[11px] font-bold text-red-300">
          {error}
        </div>
      )}

      {bans.length === 0 ? (
        <div className="rounded-xl bg-zinc-900 px-3 py-5 text-center text-xs text-zinc-500">
          현재 강퇴 중인 사용자가 없습니다.
        </div>
      ) : (
        <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
          {bans.map((ban) => {
            const target =
              ban.targetDisplayName?.trim() ||
              (
                ban.targetGuestId
                  ? "게스트"
                  : "알 수 없는 사용자"
              );

            return (
              <div
                key={ban.banId}
                className="rounded-xl border border-white/5 bg-zinc-900 p-3"
              >
                <div>
                  <div className="min-w-0">
                    <div className="break-all text-xs font-black text-white">
                      {target}
                    </div>

                    <div className="mt-1 flex flex-wrap gap-1.5">
                      <span className="rounded-full bg-red-500/15 px-2 py-1 text-[9px] font-black text-red-400">
                        {durationLabel(
                          ban.durationType,
                        )}
                      </span>

                      <span className="rounded-full bg-zinc-800 px-2 py-1 text-[9px] font-bold text-zinc-400">
                        {reasonLabel(
                          ban.reason,
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-2 space-y-1 text-[10px] text-zinc-500">
                  <div>
                    강퇴 시각:{" "}
                    {formatDate(
                      ban.createdAt,
                    )}
                  </div>

                  <div>
                    만료:{" "}
                    {ban.durationType ===
                    "PERMANENT"
                      ? "직접 해제 전까지"
                      : formatDate(
                          ban.expiresAt,
                        )}
                  </div>

                  {ban.reasonDetail && (
                    <div className="break-words">
                      상세 사유:{" "}
                      {ban.reasonDetail}
                    </div>
                  )}
                </div>

                {/* FLATLIVE_BAN_MANAGER_UNBAN_FULLWIDTH_V1 */}
                <button
                  type="button"
                  disabled={
                    revokingId === ban.banId
                  }
                  onClick={() => {
                    void revokeBan(ban);
                  }}
                  className="mt-3 w-full rounded-xl bg-yellow-400 px-3 py-2.5 text-xs font-black text-black disabled:opacity-40"
                >
                  {revokingId === ban.banId
                    ? "강퇴 해제 중..."
                    : "강퇴 해제"}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
