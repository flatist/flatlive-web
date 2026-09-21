"use client";

import Link from "next/link";
import {
  FormEvent,
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  useAuth,
} from "@/lib/auth-context";

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

  category: SupportCategory;

  title: string;
  content: string;

  status: SupportStatus;

  adminAnswer: string;

  answeredAt: string | null;

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

const FAQS = [
  {
    question:
      "로그인이 되지 않아요.",
    answer:
      "아이디와 비밀번호를 다시 확인해주세요. 계속 문제가 발생하면 1:1 문의를 남겨주세요.",
  },
  {
    question:
      "LIVE 방송이 보이지 않아요.",
    answer:
      "네트워크 상태와 방송 종료 여부를 먼저 확인해주세요. 성인 콘텐츠는 성인인증 상태에 따라 재생이 제한될 수 있습니다.",
  },
  {
    question:
      "FLIT 또는 VOD 재생에 문제가 있어요.",
    answer:
      "페이지를 새로고침한 뒤 다시 확인해주세요. 동일한 문제가 반복되면 콘텐츠 종류와 발생 상황을 함께 적어 문의해주세요.",
  },
  {
    question:
      "FLAT 잔액이 맞지 않아요.",
    answer:
      "후원이나 유료 반응 사용 내역을 먼저 확인해주세요. 잔액 차이가 계속되면 발생 시간과 금액을 포함해 문의해주세요.",
  },
  {
    question:
      "신고는 어디에서 하나요?",
    answer:
      "LIVE, FLIT, VOD 화면의 신고 기능을 이용할 수 있습니다. 저작권·초상권·개인정보 등 권리침해는 권리침해 신고센터를 이용해주세요.",
  },
];

export default function SupportPage() {
  const {
    isAuthenticated,
  } = useAuth();

  const [
    inquiries,
    setInquiries,
  ] =
    useState<
      SupportInquiry[]
    >([]);

  const [
    category,
    setCategory,
  ] =
    useState<
      SupportCategory
    >(
      "ACCOUNT",
    );

  const [
    title,
    setTitle,
  ] =
    useState("");

  const [
    content,
    setContent,
  ] =
    useState("");

  const [
    loading,
    setLoading,
  ] =
    useState(false);

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
    openFaq,
    setOpenFaq,
  ] =
    useState<
      number | null
    >(null);

  const loadInquiries =
    useCallback(
      async () => {
        if (
          !isAuthenticated
        ) {
          setInquiries([]);
          return;
        }

        setLoading(true);

        try {
          const response =
            await fetch(
              "/api/support",
              {
                cache:
                  "no-store",
              },
            );

          const data =
            await response.json();

          if (
            response.ok &&
            data?.success
          ) {
            setInquiries(
              Array.isArray(
                data.inquiries,
              )
                ? data.inquiries
                : [],
            );
          }
        } catch {
          setMessage(
            "문의 내역을 불러오지 못했습니다.",
          );
        } finally {
          setLoading(false);
        }
      },
      [
        isAuthenticated,
      ],
    );

  useEffect(() => {
    void loadInquiries();
  }, [
    loadInquiries,
  ]);

  async function handleSubmit(
    event:
      FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (
      !isAuthenticated
    ) {
      setMessage(
        "1:1 문의는 로그인 후 이용할 수 있습니다.",
      );
      return;
    }

    setSubmitting(true);
    setMessage("");

    try {
      const response =
        await fetch(
          "/api/support",
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                category,
                title,
                content,
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
            "문의 접수에 실패했습니다.",
        );
        return;
      }

      setTitle("");
      setContent("");

      setMessage(
        "문의가 정상적으로 접수되었습니다.",
      );

      await loadInquiries();
    } catch {
      setMessage(
        "문의 접수 중 네트워크 오류가 발생했습니다.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#090909] px-4 pb-24 pt-24 text-white">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8">
          <div className="text-xs font-black tracking-[0.2em] text-flat-yellow">
            FLATLIVE SUPPORT
          </div>

          <h1 className="mt-2 text-3xl font-black">
            고객센터
          </h1>

          <p className="mt-3 text-sm text-zinc-400">
            자주 묻는 질문을 확인하거나 1:1 문의를 남길 수 있습니다.
          </p>
        </div>

        <section className="mb-6 rounded-3xl border border-white/10 bg-white/[0.04] p-5 md:p-7">
          <h2 className="text-xl font-black">
            자주 묻는 질문
          </h2>

          <div className="mt-5 divide-y divide-white/10">
            {FAQS.map(
              (
                faq,
                index,
              ) => (
                <div
                  key={
                    faq.question
                  }
                  className="py-4"
                >
                  <button
                    type="button"
                    onClick={() =>
                      setOpenFaq(
                        openFaq ===
                          index
                          ? null
                          : index,
                      )
                    }
                    className="flex w-full items-center justify-between gap-4 text-left font-bold"
                  >
                    <span>
                      {faq.question}
                    </span>

                    <span className="text-zinc-500">
                      {openFaq ===
                      index
                        ? "−"
                        : "+"}
                    </span>
                  </button>

                  {openFaq ===
                    index && (
                    <p className="mt-3 text-sm leading-6 text-zinc-400">
                      {faq.answer}
                    </p>
                  )}
                </div>
              ),
            )}
          </div>
        </section>

        <section className="mb-6 rounded-3xl border border-white/10 bg-white/[0.04] p-5 md:p-7">
          <h2 className="text-xl font-black">
            1:1 문의하기
          </h2>

          {!isAuthenticated && (
            <div className="mt-4 rounded-2xl border border-flat-yellow/30 bg-flat-yellow/10 p-4 text-sm text-zinc-200">
              1:1 문의는 로그인 후 이용할 수 있습니다.

              <div className="mt-3">
                <Link
                  href="/login"
                  className="font-black text-flat-yellow"
                >
                  로그인 →
                </Link>
              </div>
            </div>
          )}

          <form
            onSubmit={
              handleSubmit
            }
            className="mt-5 space-y-4"
          >
            <div>
              <label className="mb-2 block text-sm font-bold text-zinc-300">
                문의 유형
              </label>

              <select
                value={
                  category
                }
                onChange={(
                  event,
                ) =>
                  setCategory(
                    event
                      .target
                      .value as SupportCategory,
                  )
                }
                disabled={
                  !isAuthenticated
                }
                className="h-12 w-full rounded-xl border border-white/10 bg-[#151515] px-4 text-sm outline-none"
              >
                {Object.entries(
                  CATEGORY_LABELS,
                ).map(
                  ([
                    value,
                    label,
                  ]) => (
                    <option
                      key={
                        value
                      }
                      value={
                        value
                      }
                    >
                      {label}
                    </option>
                  ),
                )}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-zinc-300">
                제목
              </label>

              <input
                value={
                  title
                }
                onChange={(
                  event,
                ) =>
                  setTitle(
                    event
                      .target
                      .value,
                  )
                }
                maxLength={
                  100
                }
                disabled={
                  !isAuthenticated
                }
                placeholder="문의 제목을 입력해주세요."
                className="h-12 w-full rounded-xl border border-white/10 bg-[#151515] px-4 text-sm outline-none"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-zinc-300">
                문의 내용
              </label>

              <textarea
                value={
                  content
                }
                onChange={(
                  event,
                ) =>
                  setContent(
                    event
                      .target
                      .value,
                  )
                }
                maxLength={
                  3000
                }
                disabled={
                  !isAuthenticated
                }
                rows={
                  7
                }
                placeholder="문제가 발생한 상황을 자세히 적어주세요."
                className="w-full resize-none rounded-xl border border-white/10 bg-[#151515] px-4 py-3 text-sm outline-none"
              />

              <div className="mt-1 text-right text-xs text-zinc-500">
                {
                  content.length
                }
                /3000
              </div>
            </div>

            <button
              type="submit"
              disabled={
                !isAuthenticated ||
                submitting
              }
              className="h-12 w-full rounded-xl bg-flat-yellow font-black text-black disabled:cursor-not-allowed disabled:opacity-40"
            >
              {submitting
                ? "접수 중..."
                : "문의 접수"}
            </button>

            {message && (
              <p className="text-sm text-zinc-300">
                {message}
              </p>
            )}
          </form>
        </section>

        <section className="mb-6 rounded-3xl border border-white/10 bg-white/[0.04] p-5 md:p-7">
          <h2 className="text-xl font-black">
            내 문의 내역
          </h2>

          {!isAuthenticated ? (
            <p className="mt-4 text-sm text-zinc-500">
              로그인 후 확인할 수 있습니다.
            </p>
          ) : loading ? (
            <p className="mt-4 text-sm text-zinc-500">
              문의 내역을 불러오는 중입니다.
            </p>
          ) : inquiries.length ===
            0 ? (
            <p className="mt-4 text-sm text-zinc-500">
              아직 등록한 문의가 없습니다.
            </p>
          ) : (
            <div className="mt-5 space-y-4">
              {inquiries.map(
                (
                  inquiry,
                ) => (
                  <article
                    key={
                      inquiry.id
                    }
                    className="rounded-2xl border border-white/10 bg-black/20 p-4"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-bold text-zinc-300">
                        {
                          CATEGORY_LABELS[
                            inquiry
                              .category
                          ]
                        }
                      </span>

                      <span className="rounded-full bg-flat-yellow/15 px-2.5 py-1 text-xs font-black text-flat-yellow">
                        {
                          STATUS_LABELS[
                            inquiry
                              .status
                          ]
                        }
                      </span>
                    </div>

                    <h3 className="mt-3 font-black">
                      {
                        inquiry.title
                      }
                    </h3>

                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-400">
                      {
                        inquiry.content
                      }
                    </p>

                    <p className="mt-3 text-xs text-zinc-600">
                      {new Date(
                        inquiry.createdAt,
                      ).toLocaleString(
                        "ko-KR",
                      )}
                    </p>

                    {inquiry.adminAnswer && (
                      <div className="mt-4 rounded-xl border border-flat-yellow/20 bg-flat-yellow/5 p-4">
                        <div className="text-xs font-black text-flat-yellow">
                          FLATLIVE 답변
                        </div>

                        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-300">
                          {
                            inquiry.adminAnswer
                          }
                        </p>
                      </div>
                    )}
                  </article>
                ),
              )}
            </div>
          )}
        </section>

        <section className="grid gap-3 md:grid-cols-2">
          <Link
            href="/notices"
            className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 font-black"
          >
            공지사항 →
          </Link>

          <Link
            href="/report"
            className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 font-black"
          >
            권리침해 신고센터 →
          </Link>
        </section>
      </div>
    </main>
  );
}
