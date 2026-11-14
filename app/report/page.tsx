"use client";

import Link from "next/link";

import {
  useSearchParams,
} from "next/navigation";

import {
  Suspense,
  useState,
} from "react";

type TargetType =
  | "LIVE"
  | "FLIT"
  | "VOD";

type ReportReason =
  | "COPYRIGHT"
  | "PORTRAIT_PRIVACY"
  | "IMPERSONATION"
  | "DEFAMATION"
  | "TRADEMARK"
  | "ILLEGAL_HARMFUL"
  | "OTHER";

const REASONS: {
  value: ReportReason;
  label: string;
  description: string;
}[] = [
  {
    value: "COPYRIGHT",
    label: "저작권 침해",
    description:
      "영상·음원·이미지 등 저작물의 무단 사용",
  },
  {
    value: "PORTRAIT_PRIVACY",
    label:
      "초상권·개인정보·사생활 침해",
    description:
      "얼굴, 연락처, 개인정보 또는 사생활의 무단 공개",
  },
  {
    value: "IMPERSONATION",
    label: "사칭",
    description:
      "타인·기업·기관을 사칭하거나 신원을 오인하게 하는 행위",
  },
  {
    value: "DEFAMATION",
    label: "명예훼손",
    description:
      "타인의 명예나 평판을 침해하는 콘텐츠",
  },
  {
    value: "TRADEMARK",
    label: "상표권 침해",
    description:
      "상표·브랜드·로고 등의 무단 사용",
  },
  {
    value: "ILLEGAL_HARMFUL",
    label: "불법·유해 콘텐츠",
    description:
      "불법촬영물, 유해정보 또는 기타 위법 콘텐츠",
  },
  {
    value: "OTHER",
    label: "기타 권리침해",
    description:
      "위 항목에 해당하지 않는 기타 권리 침해",
  },
];

function RightsReportPageContent() {
  const searchParams =
    useSearchParams();

  const queryTargetType =
    searchParams.get(
      "targetType",
    );

  const initialTargetType:
    TargetType =
      queryTargetType === "FLIT" ||
      queryTargetType === "VOD" ||
      queryTargetType === "LIVE"
        ? queryTargetType
        : "LIVE";

  const initialTargetId =
    searchParams.get(
      "targetId",
    )?.trim() || "";

  const initialTargetTitle =
    searchParams.get(
      "targetTitle",
    )?.trim() || "";

  const targetOwnerUserId =
    searchParams.get(
      "targetOwnerUserId",
    )?.trim() || "";

  const [
    targetType,
    setTargetType,
  ] =
    useState<TargetType>(
      initialTargetType,
    );

  const [
    targetId,
    setTargetId,
  ] =
    useState(
      initialTargetId,
    );

  const [
    targetTitle,
    setTargetTitle,
  ] =
    useState(
      initialTargetTitle,
    );

  const [
    reason,
    setReason,
  ] =
    useState<ReportReason>(
      "COPYRIGHT",
    );

  const [
    detail,
    setDetail,
  ] =
    useState("");

  const [
    rightsHolder,
    setRightsHolder,
  ] =
    useState<
      "SELF" | "AGENT"
    >("SELF");

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

  const [
    success,
    setSuccess,
  ] =
    useState(false);

  const [
    traceId,
    setTraceId,
  ] =
    useState("");

  async function submitReport() {
    if (!targetId.trim()) {
      setSuccess(false);
      setMessage(
        "신고 대상 콘텐츠 ID 또는 주소를 입력해주세요.",
      );
      return;
    }

    if (!detail.trim()) {
      setSuccess(false);
      setMessage(
        "권리침해 내용을 자세히 입력해주세요.",
      );
      return;
    }

    setSubmitting(true);
    setMessage("");
    setTraceId("");

    try {
      const rightsHolderText =
        rightsHolder === "SELF"
          ? "권리자 본인"
          : "권리자 대리인";

      const fullDetail =
        `[권리침해 신고센터]\n` +
        `신고자 관계: ${rightsHolderText}\n\n` +
        detail.trim();

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
              targetId:
                targetId.trim(),
              targetTitle:
                targetTitle.trim(),
              targetOwnerUserId,
              reason,
              detail:
                fullDetail,
            }),
          },
        );

      const data =
        await response.json();

      setTraceId(
        data.traceId ||
          "",
      );

      if (
        !response.ok ||
        !data.success
      ) {
        setSuccess(false);

        if (
          data.errorCode ===
          "REPORT_LOGIN_REQUIRED"
        ) {
          setMessage(
            "로그인 후 신고할 수 있습니다.",
          );
          return;
        }

        setMessage(
          data.error ||
            "신고 접수에 실패했습니다.",
        );
        return;
      }

      setSuccess(true);
      setMessage(
        `신고가 접수되었습니다. 접수번호: ${data.reportId}`,
      );
    } catch (
      error
    ) {
      console.error(
        "RIGHTS REPORT ERROR",
        error,
      );

      setSuccess(false);
      setMessage(
        "신고 접수 중 네트워크 오류가 발생했습니다.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-black px-4 pb-24 pt-10 text-white">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/"
          className="text-sm font-bold text-flat-yellow"
        >
          ← FLAT LIVE
        </Link>

        <header className="mt-7">
          <p className="text-xs font-black text-flat-yellow">
            FLAT LIVE RIGHTS CENTER
          </p>

          <h1 className="mt-2 text-3xl font-black">
            권리침해 신고센터
          </h1>

          <p className="mt-3 text-sm leading-7 text-zinc-400">
            저작권, 초상권,
            개인정보·사생활,
            사칭, 명예훼손,
            상표권 등 권리 침해
            콘텐츠를 신고할 수
            있습니다.
          </p>
        </header>

        <div className="mt-8 space-y-5">
          <section className="rounded-3xl border border-white/10 bg-zinc-950 p-5">
            <h2 className="text-base font-black">
              1. 신고 대상
            </h2>

            <div className="mt-4 grid grid-cols-3 gap-2">
              {(
                [
                  "LIVE",
                  "FLIT",
                  "VOD",
                ] as TargetType[]
              ).map(
                (type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() =>
                      setTargetType(
                        type,
                      )
                    }
                    className={
                      targetType ===
                      type
                        ? "rounded-xl border border-flat-yellow bg-flat-yellow px-3 py-3 text-sm font-black text-black"
                        : "rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-3 text-sm font-bold text-zinc-300"
                    }
                  >
                    {type}
                  </button>
                ),
              )}
            </div>

            <label className="mt-5 block">
              <span className="text-sm font-bold">
                콘텐츠 ID 또는 주소
              </span>

              <input
                value={
                  targetId
                }
                onChange={(
                  event,
                ) =>
                  setTargetId(
                    event
                      .target
                      .value,
                  )
                }
                placeholder="예: 콘텐츠 ID 또는 해당 콘텐츠 주소"
                className="mt-2 h-12 w-full rounded-xl border border-zinc-800 bg-black px-4 text-sm outline-none focus:border-flat-yellow"
              />
            </label>

            <label className="mt-4 block">
              <span className="text-sm font-bold">
                콘텐츠 제목
                <span className="ml-1 text-zinc-600">
                  (선택)
                </span>
              </span>

              <input
                value={
                  targetTitle
                }
                onChange={(
                  event,
                ) =>
                  setTargetTitle(
                    event
                      .target
                      .value,
                  )
                }
                placeholder="신고 대상을 확인할 수 있는 제목"
                className="mt-2 h-12 w-full rounded-xl border border-zinc-800 bg-black px-4 text-sm outline-none focus:border-flat-yellow"
              />
            </label>
          </section>

          <section className="rounded-3xl border border-white/10 bg-zinc-950 p-5">
            <h2 className="text-base font-black">
              2. 신고 유형
            </h2>

            <div className="mt-4 space-y-2">
              {REASONS.map(
                (item) => (
                  <button
                    key={
                      item.value
                    }
                    type="button"
                    onClick={() =>
                      setReason(
                        item.value,
                      )
                    }
                    className={
                      reason ===
                      item.value
                        ? "w-full rounded-2xl border border-flat-yellow bg-flat-yellow/10 p-4 text-left"
                        : "w-full rounded-2xl border border-zinc-800 bg-black p-4 text-left"
                    }
                  >
                    <strong className="text-sm">
                      {
                        item.label
                      }
                    </strong>

                    <p className="mt-1 text-xs leading-5 text-zinc-500">
                      {
                        item.description
                      }
                    </p>
                  </button>
                ),
              )}
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-zinc-950 p-5">
            <h2 className="text-base font-black">
              3. 신고자 관계
            </h2>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() =>
                  setRightsHolder(
                    "SELF",
                  )
                }
                className={
                  rightsHolder ===
                  "SELF"
                    ? "rounded-xl border border-flat-yellow bg-flat-yellow px-4 py-3 text-sm font-black text-black"
                    : "rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm font-bold"
                }
              >
                권리자 본인
              </button>

              <button
                type="button"
                onClick={() =>
                  setRightsHolder(
                    "AGENT",
                  )
                }
                className={
                  rightsHolder ===
                  "AGENT"
                    ? "rounded-xl border border-flat-yellow bg-flat-yellow px-4 py-3 text-sm font-black text-black"
                    : "rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm font-bold"
                }
              >
                권리자 대리인
              </button>
            </div>

            <p className="mt-3 text-xs leading-5 text-zinc-500">
              권리자 대리인의 경우
              향후 처리 과정에서
              위임 또는 권리관계
              증빙을 요청할 수
              있습니다.
            </p>
          </section>

          <section className="rounded-3xl border border-white/10 bg-zinc-950 p-5">
            <h2 className="text-base font-black">
              4. 상세 내용
            </h2>

            <textarea
              value={detail}
              maxLength={
                900
              }
              onChange={(
                event,
              ) =>
                setDetail(
                  event
                    .target
                    .value,
                )
              }
              rows={8}
              placeholder="어떤 권리가 어떻게 침해되었는지 구체적으로 입력해주세요."
              className="mt-4 w-full resize-none rounded-xl border border-zinc-800 bg-black p-4 text-sm leading-6 outline-none focus:border-flat-yellow"
            />

            <div className="mt-2 text-right text-xs text-zinc-600">
              {
                detail.length
              }
              /900
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-zinc-950 p-5">
            <h2 className="text-base font-black">
              증빙자료 안내
            </h2>

            <p className="mt-3 text-xs leading-6 text-zinc-400">
              권리 보유 사실이나
              침해 사실을 확인하기
              위한 자료가 필요한
              경우 운영자가 추가
              자료를 요청할 수
              있습니다.
              현재 단계에서는
              신고 접수 후 운영자가
              필요한 자료를 별도로
              안내합니다.
            </p>
          </section>

          {message && (
            <div
              className={
                success
                  ? "rounded-2xl border border-green-500/30 bg-green-500/10 p-4 text-sm font-bold text-green-300"
                  : "rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm font-bold text-red-300"
              }
            >
              <p>
                {
                  message
                }
              </p>

              {traceId && (
                <p className="mt-2 break-all text-[10px] font-normal text-zinc-500">
                  Trace ID:{" "}
                  {
                    traceId
                  }
                </p>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              void submitReport();
            }}
            disabled={
              submitting
            }
            className="w-full rounded-2xl bg-flat-yellow px-5 py-4 text-sm font-black text-black disabled:opacity-50"
          >
            {submitting
              ? "신고 접수 중..."
              : "권리침해 신고 접수"}
          </button>

          <p className="text-center text-xs leading-5 text-zinc-600">
            허위 신고 또는 권리침해와
            무관한 반복 신고는 서비스
            운영정책에 따라 제한될 수
            있습니다.
          </p>
        </div>
      </div>
    </main>
  );
}

/* FLATLIVE_REPORT_SUSPENSE_V3 */
export default function RightsReportPage() {
  return (
    <Suspense fallback={null}>
      <RightsReportPageContent />
    </Suspense>
  );
}
