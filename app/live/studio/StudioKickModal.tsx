"use client";

import {
  useEffect,
  useState,
} from "react";

type Viewer = {
  viewerId: string;
  userId: string;
  username: string;
  nickname: string;
  isGuest: boolean;
};

type Props = {
  roomId: string;
  viewer: Viewer | null;
  onClose: () => void;
};

type Duration =
  | "ROOM"
  | "ONE_DAY"
  | "PERMANENT";

type Reason =
  | "SPAM"
  | "ABUSE"
  | "SEXUAL_HARASSMENT"
  | "DISRUPTION"
  | "OTHER";

export default function StudioKickModal({
  roomId,
  viewer,
  onClose,
}: Props) {
  const [
    duration,
    setDuration,
  ] =
    useState<Duration>("ROOM");

  const [
    reason,
    setReason,
  ] =
    useState<Reason>("SPAM");

  const [
    detail,
    setDetail,
  ] =
    useState("");

  const [
    submitting,
    setSubmitting,
  ] =
    useState(false);

  const [
    message,
    setMessage,
  ] =
    useState("");

  useEffect(() => {
    setDuration("ROOM");
    setReason("SPAM");
    setDetail("");
    setMessage("");
  }, [viewer]);

  if (!viewer) {
    return null;
  }

  const displayName =
    viewer.nickname ||
    viewer.username ||
    "게스트";

  async function submitKick() {
    if (!viewer || submitting) {
      return;
    }

    const activeViewer = viewer;

    setSubmitting(true);
    setMessage("");

    try {
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
              action: "kick",
              roomId,
              viewerId:
                activeViewer.viewerId,
              duration,
              reason,
              reasonDetail:
                detail.trim(),
            }),
          },
        );

      const data =
        await response.json();

      if (
        !response.ok ||
        !data.success
      ) {
        setMessage(
          data.error ||
            "강퇴 처리에 실패했습니다.",
        );
        return;
      }

      setMessage(
        "강퇴 처리가 완료되었습니다.",
      );

      window.setTimeout(
        onClose,
        500,
      );
    } catch {
      setMessage(
        "강퇴 요청 중 오류가 발생했습니다.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="pointer-events-auto fixed inset-0 z-[2000] flex items-center justify-center bg-black/75 px-4">
      <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-zinc-950 p-5 shadow-2xl">
        <div className="text-lg font-black text-white">
          시청자 강퇴
        </div>

        <div className="mt-2 text-sm text-zinc-400">
          <strong className="text-white">
            {displayName}
          </strong>
          님을 강퇴합니다.
        </div>

        <div className="mt-5">
          <div className="mb-2 text-xs font-black text-zinc-300">
            강퇴 기간
          </div>

          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() =>
                setDuration("ROOM")
              }
              className={`rounded-xl px-2 py-2.5 text-xs font-black ${
                duration === "ROOM"
                  ? "bg-yellow-400 text-black"
                  : "bg-zinc-800 text-zinc-300"
              }`}
            >
              현재 방송
            </button>

            <button
              type="button"
              disabled={viewer.isGuest}
              onClick={() =>
                setDuration(
                  "ONE_DAY",
                )
              }
              className={`rounded-xl px-2 py-2.5 text-xs font-black ${
                duration ===
                "ONE_DAY"
                  ? "bg-yellow-400 text-black"
                  : "bg-zinc-800 text-zinc-300"
              } disabled:opacity-30`}
            >
              1일
            </button>

            <button
              type="button"
              disabled={viewer.isGuest}
              onClick={() =>
                setDuration(
                  "PERMANENT",
                )
              }
              className={`rounded-xl px-2 py-2.5 text-xs font-black ${
                duration ===
                "PERMANENT"
                  ? "bg-red-500 text-white"
                  : "bg-zinc-800 text-zinc-300"
              } disabled:opacity-30`}
            >
              영구
            </button>
          </div>
        </div>

        <div className="mt-5">
          <div className="mb-2 text-xs font-black text-zinc-300">
            강퇴 사유
          </div>

          <select
            value={reason}
            onChange={(event) =>
              setReason(
                event.target
                  .value as Reason,
              )
            }
            className="w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-3 text-sm text-white"
          >
            <option value="SPAM">
              도배
            </option>
            <option value="ABUSE">
              욕설
            </option>
            <option value="SEXUAL_HARASSMENT">
              성희롱
            </option>
            <option value="DISRUPTION">
              분쟁 유발
            </option>
            <option value="OTHER">
              기타
            </option>
          </select>

          <textarea
            value={detail}
            onChange={(event) =>
              setDetail(
                event.target.value,
              )
            }
            maxLength={500}
            placeholder="추가 사유 (선택)"
            className="mt-2 min-h-20 w-full resize-none rounded-xl border border-white/10 bg-zinc-900 px-3 py-3 text-sm text-white"
          />
        </div>

        {message && (
          <div className="mt-3 text-xs font-bold text-yellow-300">
            {message}
          </div>
        )}

        <div className="mt-5 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-xl bg-zinc-800 py-3 text-sm font-black text-white"
          >
            취소
          </button>

          <button
            type="button"
            onClick={submitKick}
            disabled={submitting}
            className="rounded-xl bg-red-500 py-3 text-sm font-black text-white disabled:opacity-50"
          >
            {submitting
              ? "처리 중..."
              : "강퇴"}
          </button>
        </div>
      </div>
    </div>
  );
}
