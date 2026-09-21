"use client";

import Link from "next/link";

import {
  useEffect,
  useState,
} from "react";

type NoticeItem = {
  id: string;
  title: string;
  important: boolean;
  pinned: boolean;
  createdAt: string;
};

export default function NoticesPage() {
  const [
    notices,
    setNotices,
  ] =
    useState<NoticeItem[]>(
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

  useEffect(() => {
    async function load() {
      try {
        const response =
          await fetch(
            "/api/notices",
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
      } catch {
        setError(
          "공지사항 조회 중 오류가 발생했습니다.",
        );
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, []);

  return (
    <main className="min-h-screen bg-black px-4 pb-24 pt-24 text-white">
      <div className="mx-auto max-w-4xl">
        <Link
          href="/"
          className="text-sm font-bold text-zinc-500"
        >
          ← FLAT LIVE
        </Link>

        <header className="mt-6">
          <p className="text-xs font-black text-flat-yellow">
            FLAT LIVE
          </p>

          <h1 className="mt-2 text-3xl font-black">
            공지사항
          </h1>

          <p className="mt-2 text-sm text-zinc-500">
            플랫라이브의 주요 안내와 업데이트를 확인하세요.
          </p>
        </header>

        <div className="mt-8 overflow-hidden rounded-3xl border border-white/10 bg-zinc-950">
          {loading && (
            <div className="p-8 text-center text-sm text-zinc-500">
              공지사항을 불러오는 중입니다.
            </div>
          )}

          {!loading &&
            error && (
              <div className="p-8 text-center text-sm font-bold text-red-300">
                {error}
              </div>
            )}

          {!loading &&
            !error &&
            notices.length ===
              0 && (
              <div className="p-8 text-center text-sm text-zinc-500">
                등록된 공지사항이 없습니다.
              </div>
            )}

          {!loading &&
            !error &&
            notices.map(
              (
                notice,
                index,
              ) => (
                <Link
                  key={
                    notice.id
                  }
                  href={`/notices/${notice.id}`}
                  className={
                    index === 0
                      ? "block px-5 py-5 transition hover:bg-white/[0.03]"
                      : "block border-t border-white/[0.07] px-5 py-5 transition hover:bg-white/[0.03]"
                  }
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
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

                      <h2 className="mt-2 text-sm font-black md:text-base">
                        {
                          notice.title
                        }
                      </h2>

                      <p className="mt-2 text-xs text-zinc-600">
                        {new Date(
                          notice.createdAt,
                        ).toLocaleDateString(
                          "ko-KR",
                        )}
                      </p>
                    </div>

                    <span className="shrink-0 text-zinc-600">
                      →
                    </span>
                  </div>
                </Link>
              ),
            )}
        </div>
      </div>
    </main>
  );
}
