"use client";

import {
  useEffect,
  useState,
} from "react";

type LiveRoomItem = {
  roomId: string;
  title: string;
  category: string;
  isAdult: boolean;
  broadcasterName: string;
  broadcasterUserId: string;
  broadcasterUsername: string;
  broadcasterAvatarUrl: string;

  // FLATLIVE_CLUTCH_DEVICE_BADGE_V1
  deviceType: "mobile" | "pc";

  viewerCount: number;
};

type Props = {
  open: boolean;
  disabled?: boolean;

  currentRoomId: string;

  excludedRoomIds?: string[];

  onClose: () => void;

  onInvite: (
    targetRoomId: string,
  ) => Promise<void>;
};

export default function MatchInviteModal({
  open,
  disabled = false,
  currentRoomId,
  excludedRoomIds = [],
  onClose,
  onInvite,
}: Props) {
  const [
    rooms,
    setRooms,
  ] = useState<LiveRoomItem[]>(
    [],
  );

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    submittingRoomId,
    setSubmittingRoomId,
  ] = useState("");

  const [
    error,
    setError,
  ] = useState("");

  const loadRooms =
    async () => {
      setLoading(true);
      setError("");

      try {
        const response =
          await fetch(
            "/api/live/signal?list=1",
            {
              cache: "no-store",
            },
          );

        if (!response.ok) {
          throw new Error(
            "LIVE 방송 목록을 불러오지 못했습니다.",
          );
        }

        const data =
          await response.json();

        const list: LiveRoomItem[] =
          Array.isArray(
            data.rooms,
          )
            ? data.rooms
            : [];

        const excluded =
          new Set(
            excludedRoomIds,
          );

        // FLATLIVE_CLUTCH_LIVE_ROOM_VERIFY_V1
        // list=1 결과에 만료된 roomId가 남아 있어도
        // 실제 signal room 조회가 성공한 방만 초대 목록에 표시한다.
        const candidates =
          list.filter(
            (room) =>
              Boolean(
                room.roomId,
              ) &&
              Boolean(
                room.broadcasterUserId,
              ) &&
              room.roomId !==
                currentRoomId &&
              !excluded.has(
                room.roomId,
              ),
          );

        const verified =
          await Promise.all(
            candidates.map(
              async (room) => {
                try {
                  const check =
                    await fetch(
                      `/api/live/signal?roomId=${encodeURIComponent(
                        room.roomId,
                      )}`,
                      {
                        cache:
                          "no-store",
                      },
                    );

                  return check.ok
                    ? room
                    : null;
                } catch {
                  return null;
                }
              },
            ),
          );

        setRooms(
          verified.filter(
            (
              room,
            ): room is LiveRoomItem =>
              room !== null,
          ),
        );
      } catch (loadError) {
        setRooms([]);

        setError(
          loadError instanceof Error
            ? loadError.message
            : "방송 목록 조회에 실패했습니다.",
        );
      } finally {
        setLoading(false);
      }
    };

  useEffect(() => {
    if (!open) {
      return;
    }

    void loadRooms();
  }, [
    open,
    currentRoomId,
  ]);

  if (!open) {
    return null;
  }

  const invite =
    async (
      targetRoomId: string,
    ) => {
      if (
        disabled ||
        submittingRoomId
      ) {
        return;
      }

      setSubmittingRoomId(
        targetRoomId,
      );

      setError("");

      try {
        await onInvite(
          targetRoomId,
        );

        onClose();
      } catch (inviteError) {
        setError(
          inviteError instanceof Error
            ? inviteError.message
            : "초대에 실패했습니다.",
        );

        await loadRooms();
      } finally {
        setSubmittingRoomId(
          "",
        );
      }
    };

  return (
    <div className="fixed inset-0 z-[10020] flex items-center justify-center bg-black/80 px-4 backdrop-blur-sm">
      <div className="flex max-h-[80dvh] w-full max-w-md flex-col overflow-hidden rounded-3xl border border-white/10 bg-zinc-950 shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-zinc-800 px-5 py-4">
          <div>
            <div className="text-lg font-black text-white">
              LIVE 클러치 초대
            </div>

            <p className="mt-1 text-xs text-zinc-400">
              현재 방송 중인 방송자를 선택하세요.
            </p>

            <p className="mt-1 text-[10px] text-zinc-600">
              최대 4명까지 한 매치에 참가할 수 있습니다.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-lg font-bold text-zinc-300"
          >
            ×
          </button>
        </div>

        <div className="flex items-center justify-between border-b border-zinc-900 px-4 py-2.5">
          <span className="text-[10px] font-bold text-zinc-500">
            현재 LIVE 방송
          </span>

          <button
            type="button"
            disabled={loading}
            onClick={() => {
              void loadRooms();
            }}
            className="rounded-lg bg-zinc-900 px-2.5 py-1.5 text-[10px] font-black text-zinc-300 disabled:opacity-40"
          >
            {loading
              ? "불러오는 중..."
              : "새로고침"}
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          {loading &&
          rooms.length === 0 ? (
            <div className="py-12 text-center text-xs text-zinc-500">
              방송자를 찾고 있습니다...
            </div>
          ) : rooms.length === 0 ? (
            <div className="py-12 text-center">
              <div className="text-sm font-black text-zinc-300">
                초대할 방송자가 없습니다.
              </div>

              <div className="mt-2 text-xs leading-5 text-zinc-600">
                다른 계정에서 LIVE 방송이
                시작되어 있는지 확인해주세요.
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {rooms.map(
                (room) => {
                  const baseName =
                    room.broadcasterName ||
                    room.broadcasterUsername ||
                    "방송자";

                  const isMobileRoom =
                    room.deviceType ===
                    "mobile";

                  const name =
                    isMobileRoom
                      ? `${baseName} · 모바일`
                      : `${baseName} · PC · 클러치 불가`;

                  const submitting =
                    submittingRoomId ===
                    room.roomId;

                  return (
                    <button
                      key={
                        room.roomId
                      }
                      type="button"
                      disabled={
                        disabled ||
                        !isMobileRoom ||
                        Boolean(
                          submittingRoomId,
                        )
                      }
                      onClick={() => {
                        void invite(
                          room.roomId,
                        );
                      }}
                      className="flex w-full items-center gap-3 rounded-2xl border border-zinc-800 bg-black/60 p-3 text-left transition hover:border-yellow-400/60 disabled:opacity-50"
                    >
                      <div
                        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-white/10 bg-zinc-800 bg-cover bg-center text-sm font-black text-white"
                        style={
                          room.broadcasterAvatarUrl
                            ? {
                                backgroundImage:
                                  `url(${room.broadcasterAvatarUrl})`,
                              }
                            : undefined
                        }
                      >
                        {!room.broadcasterAvatarUrl &&
                          name
                            .slice(
                              0,
                              1,
                            )
                            .toUpperCase()}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-sm font-black text-white">
                            {name}
                          </span>

                          <span className="shrink-0 rounded-full bg-red-600 px-1.5 py-0.5 text-[8px] font-black text-white">
                            LIVE
                          </span>
                        </div>

                        <div className="mt-1 truncate text-xs text-zinc-400">
                          {room.title ||
                            "제목 없는 LIVE"}
                        </div>

                        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[9px] text-zinc-600">
                          <span>
                            {
                              room.category
                            }
                          </span>

                          <span>
                            ·
                          </span>

                          <span>
                            시청자{" "}
                            {Number(
                              room.viewerCount ||
                                0,
                            ).toLocaleString(
                              "ko-KR",
                            )}
                            명
                          </span>

                          {room.isAdult && (
                            <>
                              <span>
                                ·
                              </span>

                              <span className="font-bold text-red-400">
                                19+
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="shrink-0 rounded-xl bg-yellow-400 px-3 py-2 text-[10px] font-black text-black">
                        {submitting
                          ? "초대 중"
                          : "초대"}
                      </div>
                    </button>
                  );
                },
              )}
            </div>
          )}

          {error && (
            <div className="mt-3 rounded-xl bg-red-950/40 px-3 py-2 text-xs text-red-300">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
