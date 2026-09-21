"use client";

import Link from "next/link";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import type {
  ReportRecord,
  ReportStatus,
  ReportTargetType,
} from "@/lib/report/report-store";

type ApiResponse = {
  success: boolean;
  canAction?: boolean;
  count?: number;
  reports?: ReportRecord[];
  error?: string;
};

const STATUS_LABEL: Record<
  ReportStatus,
  string
> = {
  RECEIVED: "접수",
  REVIEWING: "검토중",
  RESOLVED: "처리완료",
  REJECTED: "반려",
};

const REASON_LABEL: Record<
  string,
  string
> = {
  SEXUAL: "성적 콘텐츠",
  VIOLENCE: "폭력",
  HARASSMENT: "괴롭힘",
  ILLEGAL_FRAUD:
    "불법·사기",
  COPYRIGHT: "저작권",
  PORTRAIT_PRIVACY:
    "초상권·개인정보",
  IMPERSONATION: "사칭",
  DEFAMATION: "명예훼손",
  TRADEMARK: "상표권",
  ILLEGAL_HARMFUL:
    "불법·유해 콘텐츠",
  SPAM: "스팸",
  OTHER: "기타",
};

export default function ReportsClient() {
  const [
    reports,
    setReports,
  ] =
    useState<ReportRecord[]>(
      [],
    );

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    error,
    setError,
  ] =
    useState("");

  const [
    canAction,
    setCanAction,
  ] =
    useState(false);

  const [
    targetFilter,
    setTargetFilter,
  ] =
    useState<
      "ALL" | ReportTargetType
    >("ALL");

  const [
    statusFilter,
    setStatusFilter,
  ] =
    useState<
      "ALL" | ReportStatus
    >("ALL");

  const [
    keyword,
    setKeyword,
  ] =
    useState("");

  const [
    savingId,
    setSavingId,
  ] =
    useState("");

  const [
    draftStatus,
    setDraftStatus,
  ] =
    useState<
      Record<string, ReportStatus>
    >({});

  const [
    draftMemo,
    setDraftMemo,
  ] =
    useState<
      Record<string, string>
    >({});

  const loadReports =
    useCallback(
      async () => {
        setLoading(true);
        setError("");

        try {
          const response =
            await fetch(
              "/api/admin/reports",
              {
                cache:
                  "no-store",
              },
            );

          const data =
            (await response.json()) as
              ApiResponse;

          if (
            !response.ok ||
            !data.success
          ) {
            setError(
              data.error ||
                "신고 목록을 불러오지 못했습니다.",
            );

            return;
          }

          const nextReports =
            Array.isArray(
              data.reports,
            )
              ? data.reports
              : [];

          setReports(
            nextReports,
          );

          setCanAction(
            Boolean(
              data.canAction,
            ),
          );

          const nextStatus: Record<
            string,
            ReportStatus
          > = {};

          const nextMemo: Record<
            string,
            string
          > = {};

          for (
            const report of
            nextReports
          ) {
            nextStatus[
              report.id
            ] =
              report.status;

            nextMemo[
              report.id
            ] =
              report.adminMemo ||
              "";
          }

          setDraftStatus(
            nextStatus,
          );

          setDraftMemo(
            nextMemo,
          );
        } catch (loadError) {
          console.error(
            "ADMIN REPORT LOAD ERROR",
            loadError,
          );

          setError(
            "신고 목록 조회 중 네트워크 오류가 발생했습니다.",
          );
        } finally {
          setLoading(false);
        }
      },
      [],
    );

  useEffect(() => {
    void loadReports();
  }, [loadReports]);

  const filteredReports =
    useMemo(() => {
      const normalized =
        keyword
          .trim()
          .toLowerCase();

      return reports.filter(
        (report) => {
          if (
            targetFilter !==
              "ALL" &&
            report.targetType !==
              targetFilter
          ) {
            return false;
          }

          if (
            statusFilter !==
              "ALL" &&
            report.status !==
              statusFilter
          ) {
            return false;
          }

          if (!normalized) {
            return true;
          }

          const haystack = [
            report.id,
            report.reporterUsername,
            report.reporterUserId,
            report.targetOwnerUserId,
            report.targetTitle,
            report.targetId,
            report.reason,
            report.detail,
            report.traceId,
          ]
            .join(" ")
            .toLowerCase();

          return haystack.includes(
            normalized,
          );
        },
      );
    }, [
      reports,
      targetFilter,
      statusFilter,
      keyword,
    ]);

  async function saveReport(
    report: ReportRecord,
  ) {
    if (
      !canAction ||
      savingId
    ) {
      return;
    }

    const nextStatus =
      draftStatus[
        report.id
      ] ??
      report.status;

    const nextMemo =
      draftMemo[
        report.id
      ] ?? "";

    setSavingId(
      report.id,
    );

    try {
      const response =
        await fetch(
          "/api/admin/reports",
          {
            method: "PATCH",
            headers: {
              "Content-Type":
                "application/json",
            },
            body:
              JSON.stringify({
                reportId:
                  report.id,
                status:
                  nextStatus,
                adminMemo:
                  nextMemo,
              }),
          },
        );

      const data =
        await response.json();

      if (
        !response.ok ||
        !data.success
      ) {
        alert(
          data.error ||
            "신고 처리에 실패했습니다.",
        );

        return;
      }

      setReports(
        (previous) =>
          previous.map(
            (item) =>
              item.id ===
              report.id
                ? data.report
                : item,
          ),
      );

      alert(
        "신고 처리 상태를 저장했습니다.",
      );
    } catch (saveError) {
      console.error(
        "ADMIN REPORT SAVE ERROR",
        saveError,
      );

      alert(
        "신고 처리 중 네트워크 오류가 발생했습니다.",
      );
    } finally {
      setSavingId("");
    }
  }

  return (
    <main className="min-h-screen bg-[#f5f6f8] px-4 pb-20 pt-24 text-zinc-950 md:px-6">
      <div className="mx-auto max-w-[1500px]">
        <Link
          href="/admin"
          className="text-sm font-bold text-zinc-500 hover:text-black"
        >
          ← 관리자 대시보드
        </Link>

        <header className="mt-5 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm md:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="text-[10px] font-black tracking-[0.18em] text-zinc-400">
                FLATLIVE ADMIN
              </div>

              <h1 className="mt-1 text-2xl font-black tracking-[-0.03em] md:text-3xl">
                신고 관리
              </h1>

              <p className="mt-2 text-sm text-zinc-500">
                LIVE · FLIT · VOD 신고를 확인하고 처리합니다.
              </p>
            </div>

            <div className="flex gap-2">
              <div className="rounded-xl bg-zinc-100 px-4 py-3">
                <div className="text-[10px] font-bold text-zinc-400">
                  전체 신고
                </div>

                <div className="mt-1 text-xl font-black">
                  {reports.length}
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  void loadReports();
                }}
                className="rounded-xl bg-zinc-950 px-4 py-3 text-sm font-black text-white"
              >
                새로고침
              </button>
            </div>
          </div>
        </header>

        <section className="mt-4 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="grid gap-2 md:grid-cols-[160px_160px_1fr]">
            <select
              value={
                targetFilter
              }
              onChange={(
                event,
              ) => {
                setTargetFilter(
                  event.target
                    .value as
                    | "ALL"
                    | ReportTargetType,
                );
              }}
              className="h-11 rounded-xl border border-zinc-200 bg-white px-3 text-sm font-bold"
            >
              <option value="ALL">
                전체 대상
              </option>
              <option value="LIVE">
                LIVE
              </option>
              <option value="FLIT">
                FLIT
              </option>
              <option value="VOD">
                VOD
              </option>
            </select>

            <select
              value={
                statusFilter
              }
              onChange={(
                event,
              ) => {
                setStatusFilter(
                  event.target
                    .value as
                    | "ALL"
                    | ReportStatus,
                );
              }}
              className="h-11 rounded-xl border border-zinc-200 bg-white px-3 text-sm font-bold"
            >
              <option value="ALL">
                전체 상태
              </option>
              <option value="RECEIVED">
                접수
              </option>
              <option value="REVIEWING">
                검토중
              </option>
              <option value="RESOLVED">
                처리완료
              </option>
              <option value="REJECTED">
                반려
              </option>
            </select>

            <input
              value={keyword}
              onChange={(
                event,
              ) => {
                setKeyword(
                  event.target
                    .value,
                );
              }}
              placeholder="신고자, 대상자, 제목, Trace ID 검색"
              className="h-11 rounded-xl border border-zinc-200 px-4 text-sm outline-none focus:border-zinc-500"
            />
          </div>
        </section>

        {error && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="mt-4 rounded-2xl border border-zinc-200 bg-white p-8 text-center text-sm font-bold text-zinc-500">
            신고 목록을 불러오는 중입니다.
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {filteredReports.map(
              (report) => (
                <article
                  key={
                    report.id
                  }
                  className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-zinc-950 px-2.5 py-1 text-[10px] font-black text-white">
                          {
                            report.targetType
                          }
                        </span>

                        <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-[10px] font-black text-zinc-700">
                          {
                            STATUS_LABEL[
                              report
                                .status
                            ]
                          }
                        </span>

                        <span className="rounded-full bg-red-50 px-2.5 py-1 text-[10px] font-black text-red-700">
                          {
                            REASON_LABEL[
                              report
                                .reason
                            ] ||
                            report.reason
                          }
                        </span>
                      </div>

                      <h2 className="mt-3 break-words text-lg font-black">
                        {report.targetTitle ||
                          "(제목 없음)"}
                      </h2>

                      <div className="mt-3 grid gap-2 text-xs text-zinc-600 md:grid-cols-2 xl:grid-cols-3">
                        <div>
                          <strong>
                            신고자
                          </strong>{" "}
                          {report.reporterUsername ||
                            "-"}
                          <div className="mt-0.5 break-all text-[10px] text-zinc-400">
                            {
                              report.reporterUserId
                            }
                          </div>
                        </div>

                        <div>
                          <strong>
                            대상자 ID
                          </strong>
                          <div className="mt-0.5 break-all text-[10px] text-zinc-400">
                            {report.targetOwnerUserId ||
                              "-"}
                          </div>
                        </div>

                        <div>
                          <strong>
                            대상 ID
                          </strong>
                          <div className="mt-0.5 break-all text-[10px] text-zinc-400">
                            {
                              report.targetId
                            }
                          </div>
                        </div>
                      </div>

                      {report.detail && (
                        <div className="mt-4 rounded-xl bg-zinc-50 p-3 text-sm leading-6 text-zinc-700">
                          {
                            report.detail
                          }
                        </div>
                      )}

                      <div className="mt-4 grid gap-2 text-[11px] text-zinc-400 md:grid-cols-2">
                        <div>
                          접수:{" "}
                          {new Date(
                            report.createdAt,
                          ).toLocaleString(
                            "ko-KR",
                          )}
                        </div>

                        <div className="break-all">
                          Trace ID:{" "}
                          {
                            report.traceId
                          }
                        </div>

                        {report.actionedAt && (
                          <div>
                            최근 처리:{" "}
                            {new Date(
                              report.actionedAt,
                            ).toLocaleString(
                              "ko-KR",
                            )}
                          </div>
                        )}

                        {report.actionedByUserId && (
                          <div className="break-all">
                            처리 관리자:{" "}
                            {
                              report.actionedByUserId
                            }
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="w-full shrink-0 xl:w-[320px]">
                      <label className="block text-xs font-black text-zinc-600">
                        처리 상태
                      </label>

                      <select
                        value={
                          draftStatus[
                            report.id
                          ] ??
                          report.status
                        }
                        disabled={
                          !canAction
                        }
                        onChange={(
                          event,
                        ) => {
                          setDraftStatus(
                            (
                              previous,
                            ) => ({
                              ...previous,
                              [
                                report.id
                              ]:
                                event
                                  .target
                                  .value as ReportStatus,
                            }),
                          );
                        }}
                        className="mt-2 h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm font-bold disabled:bg-zinc-100"
                      >
                        <option value="RECEIVED">
                          접수
                        </option>
                        <option value="REVIEWING">
                          검토중
                        </option>
                        <option value="RESOLVED">
                          처리완료
                        </option>
                        <option value="REJECTED">
                          반려
                        </option>
                      </select>

                      <label className="mt-4 block text-xs font-black text-zinc-600">
                        관리자 메모
                      </label>

                      <textarea
                        value={
                          draftMemo[
                            report.id
                          ] ?? ""
                        }
                        disabled={
                          !canAction
                        }
                        maxLength={
                          1000
                        }
                        onChange={(
                          event,
                        ) => {
                          setDraftMemo(
                            (
                              previous,
                            ) => ({
                              ...previous,
                              [
                                report.id
                              ]:
                                event
                                  .target
                                  .value,
                            }),
                          );
                        }}
                        placeholder="검토 내용이나 처리 사유를 기록합니다."
                        className="mt-2 min-h-[100px] w-full resize-y rounded-xl border border-zinc-200 p-3 text-sm outline-none focus:border-zinc-500 disabled:bg-zinc-100"
                      />

                      {canAction ? (
                        <button
                          type="button"
                          disabled={
                            savingId ===
                            report.id
                          }
                          onClick={() => {
                            void saveReport(
                              report,
                            );
                          }}
                          className="mt-3 h-11 w-full rounded-xl bg-zinc-950 text-sm font-black text-white disabled:opacity-50"
                        >
                          {savingId ===
                          report.id
                            ? "저장 중..."
                            : "처리 상태 저장"}
                        </button>
                      ) : (
                        <div className="mt-3 rounded-xl bg-zinc-100 p-3 text-center text-xs font-bold text-zinc-500">
                          조회 권한만 있습니다.
                        </div>
                      )}
                    </div>
                  </div>
                </article>
              ),
            )}

            {filteredReports.length ===
              0 && (
              <div className="rounded-2xl border border-zinc-200 bg-white p-10 text-center text-sm font-bold text-zinc-500">
                조건에 맞는 신고가 없습니다.
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
