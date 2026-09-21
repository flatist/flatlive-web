"use client";

import Link from "next/link";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

type SupportCategory =
  | "ACCOUNT"
  | "LIVE"
  | "FLIT"
  | "VOD"
  | "FLAT"
  | "PAYMENT"
  | "REPORT"
  | "OTHER";

type SupportStatus =
  | "RECEIVED"
  | "IN_PROGRESS"
  | "ANSWERED";

type SupportInquiry = {
  id: string;

  userId: string;
  userEmail: string;

  category: SupportCategory;

  title: string;
  content: string;

  status: SupportStatus;

  adminAnswer: string;

  answeredByUserId:
    string | null;

  answeredAt:
    string | null;

  createdAt: string;
  updatedAt: string;
};

const CATEGORY_LABELS:
  Record<
    SupportCategory,
    string
  > = {
    ACCOUNT: "계정",
    LIVE: "LIVE",
    FLIT: "FLIT",
    VOD: "VOD",
    FLAT: "FLAT",
    PAYMENT: "결제 · 충전",
    REPORT: "신고 · 운영",
    OTHER: "기타",
  };

const STATUS_LABELS:
  Record<
    SupportStatus,
    string
  > = {
    RECEIVED: "접수",
    IN_PROGRESS: "답변중",
    ANSWERED: "답변완료",
  };

export default function AdminSupportPage() {
  const [
    inquiries,
    setInquiries,
  ] =
    useState<
      SupportInquiry[]
    >([]);

  const [
    selectedId,
    setSelectedId,
  ] =
    useState("");

  const [
    status,
    setStatus,
  ] =
    useState<
      SupportStatus
    >(
      "RECEIVED",
    );

  const [
    answer,
    setAnswer,
  ] =
    useState("");

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    saving,
    setSaving,
  ] =
    useState(false);

  const [
    message,
    setMessage,
  ] =
    useState("");

  const selected =
    useMemo(
      () =>
        inquiries.find(
          (item) =>
            item.id ===
            selectedId,
        ) ?? null,
      [
        inquiries,
        selectedId,
      ],
    );

  const loadInquiries =
    useCallback(
      async () => {
        setLoading(true);

        try {
          const response =
            await fetch(
              "/api/admin/support",
              {
                cache:
                  "no-store",
              },
            );

          const data =
            await response.json();

          if (
            !response.ok ||
            !data?.success
          ) {
            setMessage(
              data?.error ??
                "문의 목록을 불러오지 못했습니다.",
            );
            return;
          }

          const next =
            Array.isArray(
              data.inquiries,
            )
              ? data.inquiries
              : [];

          setInquiries(
            next,
          );

          setSelectedId(
            (current) =>
              current &&
              next.some(
                (
                  item:
                    SupportInquiry,
                ) =>
                  item.id ===
                  current,
              )
                ? current
                : next[0]
                    ?.id ??
                  "",
          );
        } catch {
          setMessage(
            "문의 목록을 불러오는 중 네트워크 오류가 발생했습니다.",
          );
        } finally {
          setLoading(false);
        }
      },
      [],
    );

  useEffect(() => {
    void loadInquiries();
  }, [
    loadInquiries,
  ]);

  useEffect(() => {
    if (!selected) {
      setStatus(
        "RECEIVED",
      );
      setAnswer("");
      return;
    }

    setStatus(
      selected.status,
    );

    setAnswer(
      selected.adminAnswer ??
        "",
    );

    setMessage("");
  }, [
    selected,
  ]);

  async function saveInquiry() {
    if (!selected) {
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      const response =
        await fetch(
          "/api/admin/support",
          {
            method:
              "PATCH",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                inquiryId:
                  selected.id,

                status,

                adminAnswer:
                  answer,
              }),
          },
        );

      const data =
        await response.json();

      if (
        !response.ok ||
        !data?.success
      ) {
        setMessage(
          data?.error ??
            "문의 처리에 실패했습니다.",
        );
        return;
      }

      setMessage(
        data.notificationSent
          ? "저장 완료 · 고객에게 답변 알림을 보냈습니다."
          : "저장되었습니다.",
      );

      await loadInquiries();
    } catch {
      setMessage(
        "문의 처리 중 네트워크 오류가 발생했습니다.",
      );
    } finally {
      setSaving(false);
    }
  }

  const receivedCount =
    inquiries.filter(
      (item) =>
        item.status ===
        "RECEIVED",
    ).length;

  const progressCount =
    inquiries.filter(
      (item) =>
        item.status ===
        "IN_PROGRESS",
    ).length;

  const answeredCount =
    inquiries.filter(
      (item) =>
        item.status ===
        "ANSWERED",
    ).length;

  return (
    <main className="min-h-screen bg-[#f5f6f8] px-4 pb-10 pt-20 text-zinc-950 md:px-6">
      <div className="mx-auto max-w-[1440px]">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-[10px] font-black tracking-[0.2em] text-zinc-400">
              FLATLIVE ADMIN
            </div>

            <h1 className="mt-1 text-2xl font-black">
              고객 문의 관리
            </h1>

            <p className="mt-2 text-sm text-zinc-500">
              1:1 문의를 확인하고 답변을 등록합니다.
            </p>
          </div>

          <Link
            href="/admin"
            className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-bold shadow-sm"
          >
            관리자 홈
          </Link>
        </div>

        <div className="mb-5 grid grid-cols-3 gap-3">
          <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
            <div className="text-xs font-bold text-zinc-400">
              접수
            </div>

            <div className="mt-1 text-2xl font-black">
              {receivedCount}
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
            <div className="text-xs font-bold text-zinc-400">
              답변중
            </div>

            <div className="mt-1 text-2xl font-black">
              {progressCount}
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
            <div className="text-xs font-bold text-zinc-400">
              답변완료
            </div>

            <div className="mt-1 text-2xl font-black">
              {answeredCount}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 text-sm text-zinc-500 shadow-sm">
            문의 목록을 불러오는 중입니다.
          </div>
        ) : inquiries.length ===
          0 ? (
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 text-sm text-zinc-500 shadow-sm">
            접수된 고객 문의가 없습니다.
          </div>
        ) : (
          <div className="grid gap-5 lg:grid-cols-[420px_1fr]">
            <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
              <div className="border-b border-zinc-100 px-4 py-4 font-black">
                문의 목록
              </div>

              <div className="max-h-[720px] overflow-y-auto">
                {inquiries.map(
                  (inquiry) => (
                    <button
                      key={
                        inquiry.id
                      }
                      type="button"
                      onClick={() =>
                        setSelectedId(
                          inquiry.id,
                        )
                      }
                      className={`block w-full border-b border-zinc-100 p-4 text-left transition ${
                        selectedId ===
                        inquiry.id
                          ? "bg-zinc-950 text-white"
                          : "hover:bg-zinc-50"
                      }`}
                    >
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="font-black">
                          {
                            CATEGORY_LABELS[
                              inquiry.category
                            ]
                          }
                        </span>

                        <span
                          className={
                            selectedId ===
                            inquiry.id
                              ? "text-zinc-300"
                              : "text-zinc-500"
                          }
                        >
                          {
                            STATUS_LABELS[
                              inquiry.status
                            ]
                          }
                        </span>
                      </div>

                      <div className="mt-2 line-clamp-2 font-black">
                        {inquiry.title}
                      </div>

                      <div
                        className={`mt-2 text-xs ${
                          selectedId ===
                          inquiry.id
                            ? "text-zinc-400"
                            : "text-zinc-500"
                        }`}
                      >
                        {
                          inquiry.userEmail
                        }
                      </div>

                      <div
                        className={`mt-1 text-xs ${
                          selectedId ===
                          inquiry.id
                            ? "text-zinc-500"
                            : "text-zinc-400"
                        }`}
                      >
                        {new Date(
                          inquiry.createdAt,
                        ).toLocaleString(
                          "ko-KR",
                        )}
                      </div>
                    </button>
                  ),
                )}
              </div>
            </section>

            {selected && (
              <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm md:p-6">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-black">
                    {
                      CATEGORY_LABELS[
                        selected.category
                      ]
                    }
                  </span>

                  <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-bold text-zinc-600">
                    {
                      STATUS_LABELS[
                        selected.status
                      ]
                    }
                  </span>
                </div>

                <h2 className="mt-4 text-xl font-black">
                  {selected.title}
                </h2>

                <div className="mt-2 text-sm text-zinc-500">
                  {selected.userEmail}
                </div>

                <div className="mt-5 rounded-2xl bg-zinc-50 p-4 text-sm leading-7 whitespace-pre-wrap">
                  {selected.content}
                </div>

                <div className="mt-6">
                  <label className="mb-2 block text-sm font-black">
                    처리 상태
                  </label>

                  <select
                    value={status}
                    onChange={(
                      event,
                    ) =>
                      setStatus(
                        event
                          .target
                          .value as SupportStatus,
                      )
                    }
                    className="h-12 w-full rounded-xl border border-zinc-200 bg-white px-4 text-sm font-bold outline-none"
                  >
                    <option value="RECEIVED">
                      접수
                    </option>

                    <option value="IN_PROGRESS">
                      답변중
                    </option>

                    <option value="ANSWERED">
                      답변완료
                    </option>
                  </select>
                </div>

                <div className="mt-5">
                  <label className="mb-2 block text-sm font-black">
                    관리자 답변
                  </label>

                  <textarea
                    value={answer}
                    onChange={(
                      event,
                    ) =>
                      setAnswer(
                        event
                          .target
                          .value,
                      )
                    }
                    maxLength={
                      5000
                    }
                    rows={12}
                    placeholder="고객에게 전달할 답변을 입력해주세요."
                    className="w-full resize-none rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm leading-6 outline-none"
                  />

                  <div className="mt-1 text-right text-xs text-zinc-400">
                    {answer.length}
                    /5000
                  </div>
                </div>

                {message && (
                  <div className="mt-4 rounded-xl bg-zinc-100 p-3 text-sm font-bold text-zinc-700">
                    {message}
                  </div>
                )}

                <button
                  type="button"
                  onClick={
                    saveInquiry
                  }
                  disabled={
                    saving
                  }
                  className="mt-5 h-12 w-full rounded-xl bg-zinc-950 font-black text-white disabled:opacity-50"
                >
                  {saving
                    ? "저장 중..."
                    : "문의 처리 저장"}
                </button>
              </section>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
