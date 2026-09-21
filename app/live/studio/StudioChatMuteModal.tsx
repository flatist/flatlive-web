"use client";

import { createPortal } from "react-dom";

import {
  useEffect,
  useState,
} from "react";

import type {
  StudioViewerInfo,
} from "./StudioViewerList";

export type StudioChatMuteInfo = {
  roomId: string;
  broadcasterUserId: string;
  targetUserId: string;
  duration:
    | "THIRTY_SECONDS"
    | "ONE_MINUTE"
    | "UNTIL_UNMUTED";
  createdAt: number;
  expiresAt: number | null;
};

type Props = {
  roomId: string;
  viewer: StudioViewerInfo | null;
  currentMute:
    | StudioChatMuteInfo
    | null;
  onClose: () => void;
  onChanged: () => void;
};

export default function StudioChatMuteModal({
  roomId,
  viewer,
  currentMute,
  onClose,
  onChanged,
}: Props) {
  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  useEffect(() => {
    setError("");
  }, [
    viewer,
    currentMute,
  ]);

  if (!viewer) {
    return null;
  }

  /*
   * FLATLIVE_CHAT_MUTE_MODAL_VIEWER_CAPTURE_V2
   * async 함수 내부에서도 null 아님을 보장하도록
   * 필요한 값을 렌더 시점에 고정한다.
   */
  const viewerId =
    viewer.viewerId;

  const displayName =
    viewer.nickname ||
    viewer.username ||
    "시청자";

  async function requestMute(
    duration:
      | "THIRTY_SECONDS"
      | "ONE_MINUTE"
      | "UNTIL_UNMUTED",
  ) {
    try {
      setLoading(true);
      setError("");

      // FLATLIVE_CHAT_MUTE_REQUEST_TIMEOUT_V1
      const controller =
        new AbortController();

      const timeout =
        window.setTimeout(() => {
          controller.abort();
        }, 8000);

      console.info(
        "LIVE_CHAT_MUTE_REQUEST_START",
        {
          roomId,
          viewerId,
          duration,
        },
      );

      let response: Response;

      try {
        response =
          await fetch(
            "/api/live/chat-moderation",
            {
              method: "POST",
              headers: {
                "Content-Type":
                  "application/json",
              },
              body: JSON.stringify({
                action: "mute",
                roomId,
                viewerId,
                duration,
              }),
              signal:
                controller.signal,
            },
          );
      } finally {
        window.clearTimeout(
          timeout,
        );
      }

      const data =
        await response.json();

      console.info(
        "LIVE_CHAT_MUTE_REQUEST_END",
        {
          roomId,
          viewerId,
          duration,
          status:
            response.status,
          ok:
            response.ok,
          errorCode:
            data.errorCode,
          error:
            data.error,
        },
      );

      if (!response.ok) {
        setError(
          data.error ||
            "채팅금지 처리에 실패했습니다.",
        );
        return;
      }

      onChanged();
      onClose();
    } catch (requestError) {
      const aborted =
        requestError instanceof
          DOMException &&
        requestError.name ===
          "AbortError";

      console.error(
        "LIVE CHAT MUTE REQUEST FAILED",
        {
          roomId,
          viewerId,
          aborted,
          requestError,
        },
      );

      setError(
        aborted
          ? "채팅금지 요청 시간이 초과되었습니다. 다시 시도해주세요."
          : "채팅금지 처리 중 네트워크 오류가 발생했습니다.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function requestUnmute() {
    try {
      setLoading(true);
      setError("");

      const response =
        await fetch(
          "/api/live/chat-moderation",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              action: "unmute",
              roomId,
              viewerId,
            }),
          },
        );

      const data =
        await response.json();

      if (!response.ok) {
        setError(
          data.error ||
            "채팅금지 해제에 실패했습니다.",
        );
        return;
      }

      onChanged();
      onClose();
    } catch (requestError) {
      console.error(
        "LIVE CHAT UNMUTE REQUEST FAILED",
        requestError,
      );

      setError(
        "채팅금지 해제 중 네트워크 오류가 발생했습니다.",
      );
    } finally {
      setLoading(false);
    }
  }

  // FLATLIVE_CHAT_MUTE_MODAL_BODY_PORTAL_V1
  if (
    typeof document ===
    "undefined"
  ) {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-[2147483647] flex items-center justify-center bg-black/70 px-4">
      <button
        type="button"
        aria-label="채팅금지 창 닫기"
        onClick={onClose}
        className="absolute inset-0"
      />

      <div className="relative z-10 w-full max-w-sm rounded-3xl border border-white/10 bg-zinc-950 p-5 shadow-2xl">
        <div className="text-lg font-black text-white">
          {currentMute
            ? "채팅금지 해제"
            : "채팅금지"}
        </div>

        <div className="mt-1 text-sm text-zinc-400">
          {displayName}
        </div>

        {currentMute ? (
          <>
            <div className="mt-5 rounded-2xl bg-zinc-900 px-4 py-4 text-sm text-zinc-200">
              이 시청자의 채팅금지를 해제할까요?
            </div>

            <button
              type="button"
              disabled={loading}
              onClick={() => {
                void requestUnmute();
              }}
              className="mt-4 w-full rounded-2xl bg-yellow-400 px-4 py-3 text-sm font-black text-black disabled:opacity-50"
            >
              {loading
                ? "해제 중..."
                : "채팅금지 해제"}
            </button>
          </>
        ) : (
          <>
            <div className="mt-5 text-xs font-bold text-zinc-500">
              금지 시간 선택
            </div>

            <div className="mt-2 grid grid-cols-1 gap-2">
              <button
                type="button"
                disabled={loading}
                onClick={() => {
                  void requestMute(
                    "THIRTY_SECONDS",
                  );
                }}
                className="rounded-2xl bg-zinc-900 px-4 py-3 text-sm font-black text-white disabled:opacity-50"
              >
                30초 채팅금지
              </button>

              <button
                type="button"
                disabled={loading}
                onClick={() => {
                  void requestMute(
                    "ONE_MINUTE",
                  );
                }}
                className="rounded-2xl bg-zinc-900 px-4 py-3 text-sm font-black text-white disabled:opacity-50"
              >
                1분 채팅금지
              </button>

              <button
                type="button"
                disabled={loading}
                onClick={() => {
                  void requestMute(
                    "UNTIL_UNMUTED",
                  );
                }}
                className="rounded-2xl bg-red-500/15 px-4 py-3 text-sm font-black text-red-400 disabled:opacity-50"
              >
                해제할 때까지
              </button>
            </div>
          </>
        )}

        {error && (
          <div className="mt-3 rounded-xl bg-red-950/70 px-3 py-2 text-xs font-bold text-red-200">
            {error}
          </div>
        )}

        <button
          type="button"
          disabled={loading}
          onClick={onClose}
          className="mt-3 w-full rounded-2xl bg-white/5 px-4 py-3 text-sm font-bold text-zinc-400 disabled:opacity-50"
        >
          취소
        </button>
      </div>
    </div>,
    document.body,
  );
}
