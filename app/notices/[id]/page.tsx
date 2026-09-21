"use client";

import Link from "next/link";

import {
  useParams,
} from "next/navigation";

import {
  useEffect,
  useState,
} from "react";

type Notice = {
  id: string;
  title: string;
  content: string;
  important: boolean;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
};

export default function NoticeDetailPage() {
  const params =
    useParams<{
      id: string;
    }>();

  const noticeId =
    typeof params.id ===
    "string"
      ? params.id
      : "";

  const [
    notice,
    setNotice,
  ] =
    useState<Notice | null>(
      null,
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

  useEffect(() => {
    if (!noticeId) {
      return;
    }

    async function load() {
      try {
        const response =
          await fetch(
            `/api/notices?id=${encodeURIComponent(
              noticeId,
            )}`,
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
              "공지사항을 찾을 수 없습니다.",
          );
          return;
        }

        setNotice(
          data.notice,
        );
      } catch {
        setError(
          "공지사항 조회 중 오류가 발생했습니다.",
        );
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [noticeId]);

  return (
    <main className="min-h-screen bg-black px-4 pb-24 pt-24 text-white">
      <div className="mx-auto max-w-4xl">
        <Link
          href="/notices"
          className="text-sm font-bold text-zinc-500"
        >
          ← 공지사항 목록
        </Link>

        {loading && (
          <div className="mt-8 rounded-3xl border border-white/10 bg-zinc-950 p-8 text-center text-sm text-zinc-500">
            공지사항을 불러오는 중입니다.
          </div>
        )}

        {!loading &&
          error && (
            <div className="mt-8 rounded-3xl border border-red-500/20 bg-red-500/10 p-6 text-sm font-bold text-red-300">
              {error}
            </div>
          )}

        {!loading &&
          notice && (
            <article className="mt-8 overflow-hidden rounded-3xl border border-white/10 bg-zinc-950">
              <header className="border-b border-white/[0.08] p-6 md:p-8">
                <div className="flex flex-wrap gap-2">
                  {notice.pinned && (
                    <span className="rounded-md bg-flat-yellow px-2 py-1 text-[10px] font-black text-black">
                      고정
                    </span>
                  )}

                  {notice.important && (
                    <span className="rounded-md bg-red-500/15 px-2 py-1 text-[10px] font-black text-red-300">
                      중요
                    </span>
                  )}
                </div>

                <h1 className="mt-4 text-2xl font-black leading-tight md:text-3xl">
                  {
                    notice.title
                  }
                </h1>

                <p className="mt-4 text-xs text-zinc-600">
                  {new Date(
                    notice.createdAt,
                  ).toLocaleString(
                    "ko-KR",
                  )}
                </p>
              </header>

              <div className="whitespace-pre-wrap break-words p-6 text-sm leading-8 text-zinc-300 md:p-8">
                {
                  notice.content
                }
              </div>
            </article>
          )}
      </div>
    </main>
  );
}
