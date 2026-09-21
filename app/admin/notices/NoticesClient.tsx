"use client";

import Link from "next/link";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import type {
  NoticeAudience,
  NoticeRecord,
  NoticeStatus,
} from "@/lib/notice/notice-store";

type NoticeForm = {
  title: string;
  content: string;
  audience: NoticeAudience;
  status: NoticeStatus;
  important: boolean;
  pinned: boolean;
  publishStartAt: string;
  publishEndAt: string;
};

const EMPTY_FORM: NoticeForm = {
  title: "",
  content: "",
  audience: "ALL",
  status: "PUBLIC",
  important: false,
  pinned: false,
  publishStartAt: "",
  publishEndAt: "",
};

const AUDIENCE_LABEL: Record<
  NoticeAudience,
  string
> = {
  ALL: "전체",
  MEMBER: "일반회원",
  SELLER: "셀러",
};

function toLocalInputValue(
  value: string | null,
) {
  if (!value) {
    return "";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "";
  }

  const pad = (
    number: number,
  ) =>
    String(number).padStart(
      2,
      "0",
    );

  return [
    date.getFullYear(),
    "-",
    pad(
      date.getMonth() + 1,
    ),
    "-",
    pad(
      date.getDate(),
    ),
    "T",
    pad(
      date.getHours(),
    ),
    ":",
    pad(
      date.getMinutes(),
    ),
  ].join("");
}

export default function NoticesClient() {
  const [
    notices,
    setNotices,
  ] =
    useState<NoticeRecord[]>(
      [],
    );

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
    error,
    setError,
  ] =
    useState("");

  const [
    editingId,
    setEditingId,
  ] =
    useState("");

  const [
    keyword,
    setKeyword,
  ] =
    useState("");

  const [
    form,
    setForm,
  ] =
    useState<NoticeForm>(
      EMPTY_FORM,
    );

  const loadNotices =
    useCallback(
      async () => {
        setLoading(true);
        setError("");

        try {
          const response =
            await fetch(
              "/api/admin/notices",
              {
                cache:
                  "no-store",
              },
            );

          const data =
            await response.json();

          if (
            !response.ok ||
            !data.success
          ) {
            setError(
              data.error ||
                "공지사항을 불러오지 못했습니다.",
            );
            return;
          }

          setNotices(
            Array.isArray(
              data.notices,
            )
              ? data.notices
              : [],
          );
        } catch (loadError) {
          console.error(
            "NOTICE LOAD ERROR",
            loadError,
          );

          setError(
            "공지사항 조회 중 네트워크 오류가 발생했습니다.",
          );
        } finally {
          setLoading(false);
        }
      },
      [],
    );

  useEffect(() => {
    void loadNotices();
  }, [loadNotices]);

  const filteredNotices =
    useMemo(() => {
      const query =
        keyword
          .trim()
          .toLowerCase();

      if (!query) {
        return notices;
      }

      return notices.filter(
        (notice) =>
          [
            notice.title,
            notice.content,
            notice.audience,
            notice.status,
            notice.id,
          ]
            .join(" ")
            .toLowerCase()
            .includes(query),
      );
    }, [
      notices,
      keyword,
    ]);

  function resetForm() {
    setEditingId("");
    setForm(EMPTY_FORM);
  }

  function startEdit(
    notice: NoticeRecord,
  ) {
    setEditingId(
      notice.id,
    );

    setForm({
      title:
        notice.title,
      content:
        notice.content,
      audience:
        notice.audience,
      status:
        notice.status,
      important:
        notice.important,
      pinned:
        notice.pinned,
      publishStartAt:
        toLocalInputValue(
          notice.publishStartAt,
        ),
      publishEndAt:
        toLocalInputValue(
          notice.publishEndAt,
        ),
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function saveNotice() {
    if (saving) {
      return;
    }

    const title =
      form.title.trim();

    const content =
      form.content.trim();

    if (!title) {
      alert(
        "공지 제목을 입력해주세요.",
      );
      return;
    }

    if (!content) {
      alert(
        "공지 내용을 입력해주세요.",
      );
      return;
    }

    setSaving(true);

    try {
      const response =
        await fetch(
          "/api/admin/notices",
          {
            method:
              editingId
                ? "PATCH"
                : "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                ...(editingId
                  ? {
                      noticeId:
                        editingId,
                    }
                  : {}),

                title,
                content,

                audience:
                  form.audience,

                status:
                  form.status,

                important:
                  form.important,

                pinned:
                  form.pinned,

                publishStartAt:
                  form.publishStartAt ||
                  null,

                publishEndAt:
                  form.publishEndAt ||
                  null,
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
            "공지 저장에 실패했습니다.",
        );
        return;
      }

      alert(
        editingId
          ? "공지사항을 수정했습니다."
          : "공지사항을 등록했습니다.",
      );

      resetForm();

      await loadNotices();
    } catch (saveError) {
      console.error(
        "NOTICE SAVE ERROR",
        saveError,
      );

      alert(
        "공지 저장 중 네트워크 오류가 발생했습니다.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function removeNotice(
    notice: NoticeRecord,
  ) {
    if (
      !window.confirm(
        `"${notice.title}" 공지를 삭제할까요?`,
      )
    ) {
      return;
    }

    try {
      const response =
        await fetch(
          "/api/admin/notices",
          {
            method:
              "DELETE",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                noticeId:
                  notice.id,
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
            "공지 삭제에 실패했습니다.",
        );
        return;
      }

      if (
        editingId ===
        notice.id
      ) {
        resetForm();
      }

      await loadNotices();
    } catch (deleteError) {
      console.error(
        "NOTICE DELETE ERROR",
        deleteError,
      );

      alert(
        "공지 삭제 중 네트워크 오류가 발생했습니다.",
      );
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
          <div className="text-[10px] font-black tracking-[0.18em] text-zinc-400">
            FLATLIVE ADMIN
          </div>

          <h1 className="mt-1 text-2xl font-black tracking-[-0.03em] md:text-3xl">
            공지 관리
          </h1>

          <p className="mt-2 text-sm text-zinc-500">
            전체회원 · 일반회원 · 셀러 대상 공지를 등록하고 관리합니다.
          </p>
        </header>

        <section className="mt-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black">
              {editingId
                ? "공지 수정"
                : "새 공지 등록"}
            </h2>

            {editingId && (
              <button
                type="button"
                onClick={
                  resetForm
                }
                className="rounded-lg bg-zinc-100 px-3 py-2 text-xs font-black"
              >
                수정 취소
              </button>
            )}
          </div>

          <div className="mt-5 grid gap-4">
            <label>
              <span className="mb-1.5 block text-xs font-black text-zinc-600">
                제목
              </span>

              <input
                value={
                  form.title
                }
                maxLength={200}
                onChange={(
                  event,
                ) => {
                  setForm(
                    (
                      previous,
                    ) => ({
                      ...previous,
                      title:
                        event
                          .target
                          .value,
                    }),
                  );
                }}
                className="h-12 w-full rounded-xl border border-zinc-200 px-4 text-sm outline-none focus:border-zinc-500"
                placeholder="공지 제목"
              />
            </label>

            <label>
              <span className="mb-1.5 block text-xs font-black text-zinc-600">
                내용
              </span>

              <textarea
                value={
                  form.content
                }
                maxLength={
                  20000
                }
                onChange={(
                  event,
                ) => {
                  setForm(
                    (
                      previous,
                    ) => ({
                      ...previous,
                      content:
                        event
                          .target
                          .value,
                    }),
                  );
                }}
                className="min-h-[220px] w-full resize-y rounded-xl border border-zinc-200 p-4 text-sm leading-6 outline-none focus:border-zinc-500"
                placeholder="공지 내용을 입력해주세요."
              />
            </label>

            <div className="grid gap-3 md:grid-cols-2">
              <label>
                <span className="mb-1.5 block text-xs font-black text-zinc-600">
                  공개 대상
                </span>

                <select
                  value={
                    form.audience
                  }
                  onChange={(
                    event,
                  ) => {
                    setForm(
                      (
                        previous,
                      ) => ({
                        ...previous,
                        audience:
                          event
                            .target
                            .value as NoticeAudience,
                      }),
                    );
                  }}
                  className="h-12 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm font-bold"
                >
                  <option value="ALL">
                    전체
                  </option>
                  <option value="MEMBER">
                    일반회원
                  </option>
                  <option value="SELLER">
                    셀러
                  </option>
                </select>
              </label>

              <label>
                <span className="mb-1.5 block text-xs font-black text-zinc-600">
                  공개 상태
                </span>

                <select
                  value={
                    form.status
                  }
                  onChange={(
                    event,
                  ) => {
                    setForm(
                      (
                        previous,
                      ) => ({
                        ...previous,
                        status:
                          event
                            .target
                            .value as NoticeStatus,
                      }),
                    );
                  }}
                  className="h-12 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm font-bold"
                >
                  <option value="PUBLIC">
                    공개
                  </option>
                  <option value="PRIVATE">
                    비공개
                  </option>
                </select>
              </label>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <label>
                <span className="mb-1.5 block text-xs font-black text-zinc-600">
                  게시 시작
                </span>

                <input
                  type="datetime-local"
                  value={
                    form.publishStartAt
                  }
                  onChange={(
                    event,
                  ) => {
                    setForm(
                      (
                        previous,
                      ) => ({
                        ...previous,
                        publishStartAt:
                          event
                            .target
                            .value,
                      }),
                    );
                  }}
                  className="h-12 w-full rounded-xl border border-zinc-200 px-3 text-sm"
                />
              </label>

              <label>
                <span className="mb-1.5 block text-xs font-black text-zinc-600">
                  게시 종료
                </span>

                <input
                  type="datetime-local"
                  value={
                    form.publishEndAt
                  }
                  onChange={(
                    event,
                  ) => {
                    setForm(
                      (
                        previous,
                      ) => ({
                        ...previous,
                        publishEndAt:
                          event
                            .target
                            .value,
                      }),
                    );
                  }}
                  className="h-12 w-full rounded-xl border border-zinc-200 px-3 text-sm"
                />
              </label>
            </div>

            <div className="flex flex-wrap gap-5 rounded-xl bg-zinc-50 p-4">
              <label className="flex items-center gap-2 text-sm font-bold">
                <input
                  type="checkbox"
                  checked={
                    form.important
                  }
                  onChange={(
                    event,
                  ) => {
                    setForm(
                      (
                        previous,
                      ) => ({
                        ...previous,
                        important:
                          event
                            .target
                            .checked,
                      }),
                    );
                  }}
                />
                중요공지
              </label>

              <label className="flex items-center gap-2 text-sm font-bold">
                <input
                  type="checkbox"
                  checked={
                    form.pinned
                  }
                  onChange={(
                    event,
                  ) => {
                    setForm(
                      (
                        previous,
                      ) => ({
                        ...previous,
                        pinned:
                          event
                            .target
                            .checked,
                      }),
                    );
                  }}
                />
                상단고정
              </label>
            </div>

            <button
              type="button"
              onClick={() => {
                void saveNotice();
              }}
              disabled={saving}
              className="h-12 rounded-xl bg-zinc-950 text-sm font-black text-white disabled:opacity-50 md:w-[220px]"
            >
              {saving
                ? "저장 중..."
                : editingId
                  ? "공지 수정 저장"
                  : "공지 등록"}
            </button>
          </div>
        </section>

        <section className="mt-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-black">
                등록된 공지
              </h2>

              <p className="mt-1 text-xs text-zinc-500">
                총 {notices.length}개
              </p>
            </div>

            <div className="flex gap-2">
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
                placeholder="공지 검색"
                className="h-10 rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none"
              />

              <button
                type="button"
                onClick={() => {
                  void loadNotices();
                }}
                className="h-10 rounded-xl bg-white px-4 text-xs font-black shadow-sm"
              >
                새로고침
              </button>
            </div>
          </div>

          <div className="mt-3 space-y-3">
            {loading ? (
              <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center text-sm font-bold text-zinc-500">
                공지사항을 불러오는 중입니다.
              </div>
            ) : (
              filteredNotices.map(
                (notice) => (
                  <article
                    key={
                      notice.id
                    }
                    className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"
                  >
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap gap-2">
                          {notice.pinned && (
                            <span className="rounded-full bg-zinc-950 px-2.5 py-1 text-[10px] font-black text-white">
                              상단고정
                            </span>
                          )}

                          {notice.important && (
                            <span className="rounded-full bg-red-100 px-2.5 py-1 text-[10px] font-black text-red-700">
                              중요
                            </span>
                          )}

                          <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-[10px] font-black">
                            {
                              AUDIENCE_LABEL[
                                notice.audience
                              ]
                            }
                          </span>

                          <span
                            className={`rounded-full px-2.5 py-1 text-[10px] font-black ${
                              notice.status ===
                              "PUBLIC"
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-zinc-100 text-zinc-500"
                            }`}
                          >
                            {notice.status ===
                            "PUBLIC"
                              ? "공개"
                              : "비공개"}
                          </span>
                        </div>

                        <h3 className="mt-3 text-lg font-black">
                          {
                            notice.title
                          }
                        </h3>

                        <p className="mt-2 line-clamp-3 whitespace-pre-wrap text-sm leading-6 text-zinc-600">
                          {
                            notice.content
                          }
                        </p>

                        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-[11px] text-zinc-400">
                          <span>
                            등록{" "}
                            {new Date(
                              notice.createdAt,
                            ).toLocaleString(
                              "ko-KR",
                            )}
                          </span>

                          {notice.publishStartAt && (
                            <span>
                              시작{" "}
                              {new Date(
                                notice.publishStartAt,
                              ).toLocaleString(
                                "ko-KR",
                              )}
                            </span>
                          )}

                          {notice.publishEndAt && (
                            <span>
                              종료{" "}
                              {new Date(
                                notice.publishEndAt,
                              ).toLocaleString(
                                "ko-KR",
                              )}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex shrink-0 gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            startEdit(
                              notice,
                            );
                          }}
                          className="rounded-xl bg-zinc-100 px-4 py-2.5 text-xs font-black"
                        >
                          수정
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            void removeNotice(
                              notice,
                            );
                          }}
                          className="rounded-xl bg-red-50 px-4 py-2.5 text-xs font-black text-red-700"
                        >
                          삭제
                        </button>
                      </div>
                    </div>
                  </article>
                ),
              )
            )}

            {!loading &&
              filteredNotices.length ===
                0 && (
                <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center text-sm font-bold text-zinc-500">
                  등록된 공지사항이 없습니다.
                </div>
              )}
          </div>
        </section>

        {error && (
          <div className="fixed inset-x-4 bottom-6 z-50 mx-auto max-w-lg rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700 shadow-xl">
            {error}
          </div>
        )}
      </div>
    </main>
  );
}
