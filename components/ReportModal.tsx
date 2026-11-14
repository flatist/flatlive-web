"use client";

import Link from "next/link";

import {
  useState,
} from "react";

type ReportTargetType =
  | "LIVE"
  | "FLIT"
  | "VOD";

type ReportReason =
  | "SEXUAL"
  | "VIOLENCE"
  | "HARASSMENT"
  | "ILLEGAL_FRAUD"
  | "COPYRIGHT"
  | "SPAM"
  | "OTHER";

type Props = {
  open: boolean;
  onClose: () => void;

  targetType: ReportTargetType;
  targetId: string;

  targetOwnerUserId?: string;
  targetTitle?: string;
};

const reasonOptions: Array<{
  value: ReportReason;
  label: string;
}> = [
  {
    value: "SEXUAL",
    label: "음란·성적 콘텐츠",
  },
  {
    value: "VIOLENCE",
    label: "폭력·위협",
  },
  {
    value: "HARASSMENT",
    label: "욕설·괴롭힘",
  },
  {
    value: "ILLEGAL_FRAUD",
    label: "불법·사기",
  },
  {
    value: "COPYRIGHT",
    label: "저작권 침해",
  },
  {
    value: "SPAM",
    label: "스팸·광고",
  },
  {
    value: "OTHER",
    label: "기타",
  },
];

export default function ReportModal({
  open,
  onClose,
  targetType,
  targetId,
  targetOwnerUserId = "",
  targetTitle = "",
}: Props) {
  const [
    reason,
    setReason,
  ] = useState<ReportReason>(
    "SEXUAL",
  );

  const [
    detail,
    setDetail,
  ] = useState("");

  const [
    submitting,
    setSubmitting,
  ] = useState(false);

  if (!open) {
    return null;
  }

  async function submitReport() {
    if (submitting) {
      return;
    }

    if (
      reason === "OTHER" &&
      !detail.trim()
    ) {
      alert(
        "기타 신고 사유를 입력해주세요.",
      );

      return;
    }

    setSubmitting(true);

    try {
      const response =
        await fetch(
          "/api/report",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              targetType,
              targetId,
              targetOwnerUserId,
              targetTitle,
              reason,
              detail:
                detail.trim(),
            }),
          },
        );

      const data =
        await response.json();

      if (
        response.status === 401
      ) {
        alert(
          "로그인이 필요합니다.",
        );

        return;
      }

      if (
        response.status === 409
      ) {
        alert(
          "이미 신고한 콘텐츠입니다.",
        );

        onClose();
        return;
      }

      if (
        !response.ok ||
        !data.success
      ) {
        alert(
          data.error ||
            "신고 접수에 실패했습니다.",
        );

        console.error(
          "REPORT SUBMIT ERROR",
          data,
        );

        return;
      }

      alert(
        "신고가 접수되었습니다.",
      );

      setDetail("");
      setReason("SEXUAL");

      onClose();
    } catch (error) {
      console.error(
        "REPORT NETWORK ERROR",
        error,
      );

      alert(
        "신고 처리 중 네트워크 오류가 발생했습니다.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[2147483647] flex items-start justify-center overflow-y-auto overscroll-contain bg-black/85 px-4 pt-[calc(20px+env(safe-area-inset-top))] pb-[calc(180px+env(safe-area-inset-bottom))]">
      <div className="max-h-[calc(100dvh-220px)] w-full max-w-md overflow-y-auto rounded-2xl border border-white/10 bg-zinc-950 p-5 text-white shadow-2xl">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-black">
            신고하기
          </h2>

          <button
            type="button"
            onClick={onClose}
            className="text-xl text-zinc-500 hover:text-white"
            aria-label="닫기"
          >
            ×
          </button>
        </div>

        <p className="mt-2 text-xs leading-5 text-zinc-500">
          신고 내용을 확인한 후 운영 정책에 따라 검토합니다.
        </p>

        <Link
          href={{
            pathname: "/report",
            query: {
              targetType,
              targetId,
              targetTitle,
              targetOwnerUserId,
            },
          }}
          onClick={onClose}
          className="mt-4 flex w-full items-center justify-between rounded-xl border border-flat-yellow/30 bg-flat-yellow/10 px-4 py-3 text-sm font-black text-flat-yellow transition hover:bg-flat-yellow/20"
        >
          <span>권리침해 신고센터</span>
          <span>→</span>
        </Link>

        <p className="mt-2 text-[11px] leading-5 text-zinc-600">
          저작권 · 초상권 · 개인정보 · 사칭 · 명예훼손 · 상표권 신고
        </p>

        <div className="mt-5 space-y-2">
          {reasonOptions.map(
            (option) => (
              <label
                key={
                  option.value
                }
                className="flex cursor-pointer items-center gap-3 rounded-xl border border-white/[0.08] px-4 py-3"
              >
                <input
                  type="radio"
                  name="reportReason"
                  value={
                    option.value
                  }
                  checked={
                    reason ===
                    option.value
                  }
                  onChange={() => {
                    setReason(
                      option.value,
                    );
                  }}
                />

                <span className="text-sm font-bold">
                  {option.label}
                </span>
              </label>
            ),
          )}
        </div>

        {reason === "OTHER" && (
          <textarea
            value={detail}
            onChange={(event) => {
              setDetail(
                event.currentTarget
                  .value,
              );
            }}
            maxLength={1000}
            placeholder="신고 사유를 입력해주세요."
            className="mt-4 min-h-28 w-full resize-none rounded-xl border border-white/10 bg-black p-3 text-sm outline-none"
          />
        )}

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="flex-1 rounded-xl border border-white/10 py-3 text-sm font-black"
          >
            취소
          </button>

          <button
            type="button"
            onClick={() => {
              void submitReport();
            }}
            disabled={submitting}
            className="flex-1 rounded-xl bg-white py-3 text-sm font-black text-black disabled:opacity-50"
          >
            {submitting
              ? "접수 중..."
              : "신고 접수"}
          </button>
        </div>
      </div>
    </div>
  );
}
