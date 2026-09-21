"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  createPortal,
} from "react-dom";

type ChatMuteDuration =
  | "THIRTY_SECONDS"
  | "ONE_MINUTE"
  | "UNTIL_UNMUTED";

type ChatMuteState = {
  duration: ChatMuteDuration;
  expiresAt: number | null;
  createdAt: number;
};

type Props = {
  roomId: string;
  onMuteStateChange?: (
    muted: boolean,
  ) => void;
};

export default function LiveChatMuteNotice({
  roomId,
  onMuteStateChange,
}: Props) {
  const [
    mute,
    setMute,
  ] =
    useState<ChatMuteState | null>(
      null,
    );

  const [
    now,
    setNow,
  ] =
    useState(() => Date.now());

  useEffect(() => {
    if (!roomId) {
      setMute(null);
      onMuteStateChange?.(false);
      return;
    }

    let cancelled = false;

    const loadMuteStatus =
      async () => {
        try {
          const response =
            await fetch(
              `/api/live/chat-moderation/status?roomId=${encodeURIComponent(
                roomId,
              )}`,
              {
                cache: "no-store",
              },
            );

          const data =
            await response.json();

          if (
            cancelled ||
            !response.ok
          ) {
            return;
          }

          if (
            data.muted === true &&
            data.mute
          ) {
            setMute({
              duration:
                data.mute.duration,
              expiresAt:
                typeof data.mute
                    .expiresAt ===
                  "number"
                  ? data.mute
                      .expiresAt
                  : null,
              createdAt:
                Number(
                  data.mute.createdAt,
                ) || Date.now(),
            });

            onMuteStateChange?.(
              true,
            );
          } else {
            setMute(null);
            onMuteStateChange?.(
              false,
            );
          }
        } catch {
          /*
           * 상태 폴링 실패는 LIVE 시청을 방해하지 않는다.
           */
        }
      };

    void loadMuteStatus();

    const timer =
      window.setInterval(() => {
        void loadMuteStatus();
      }, 500);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [
    roomId,
    onMuteStateChange,
  ]);

  useEffect(() => {
    if (
      !mute ||
      mute.expiresAt === null
    ) {
      return;
    }

    const timer =
      window.setInterval(() => {
        setNow(Date.now());
      }, 250);

    return () => {
      window.clearInterval(timer);
    };
  }, [mute]);

  const remainingSeconds =
    useMemo(() => {
      if (
        !mute ||
        mute.expiresAt === null
      ) {
        return null;
      }

      return Math.max(
        0,
        Math.ceil(
          (
            mute.expiresAt -
            now
          ) / 1000,
        ),
      );
    }, [
      mute,
      now,
    ]);

  if (!mute) {
    return null;
  }

  if (
    mute.expiresAt !== null &&
    remainingSeconds === 0
  ) {
    return null;
  }

  const title =
    mute.duration ===
    "THIRTY_SECONDS"
      ? "채팅이 30초간 금지되었습니다."
      : mute.duration ===
          "ONE_MINUTE"
        ? "채팅이 1분간 금지되었습니다."
        : "채팅이 금지되었습니다.";

  if (typeof document === "undefined") {
    return null;
  }

  // FLATLIVE_CHAT_MUTE_NOTICE_BODY_PORTAL_V1
  return createPortal(
    <>
      {/* FLATLIVE_VIEWER_CHAT_MUTE_NOTICE_V1 */}
      <div className="pointer-events-none fixed inset-x-0 bottom-[calc(104px+env(safe-area-inset-bottom))] z-[2147483646] flex justify-center px-4 md:bottom-8">
        <div className="w-full max-w-sm rounded-2xl border border-yellow-400/25 bg-zinc-950/90 px-4 py-3 shadow-2xl backdrop-blur-xl">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-yellow-400/15 text-sm">
              💬
            </div>

            <div className="min-w-0 flex-1">
              <div className="text-sm font-black text-white">
                {title}
              </div>

              {remainingSeconds !==
                null && (
                <div className="mt-1 text-xs font-bold text-yellow-300">
                  남은 시간{" "}
                  {remainingSeconds}초
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>,
    document.body,
  );
}
