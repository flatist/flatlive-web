"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import VodPreview from "./VodPreview";

type VodItem = {
  id: string;
  username: string;
  displayName: string;
  title: string;
  description: string;
  isAdult: boolean;
  videoUrl: string;
  thumbnailUrl?: string;
  views: number;
};

export default function VodSearchGrid({
  vods,
}: {
  vods: VodItem[];
}) {
  const [searchOpen, setSearchOpen] =
    useState(false);

  const [searchQuery, setSearchQuery] =
    useState("");

  const normalizedQuery =
    searchQuery.trim().toLowerCase();

  const filteredVods = useMemo(() => {
    if (!normalizedQuery) {
      return vods;
    }

    return vods.filter((vod) => {
      const searchableText = [
        vod.title,
        vod.description,
        vod.displayName,
        vod.username,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchableText.includes(
        normalizedQuery,
      );
    });
  }, [vods, normalizedQuery]);

  return (
    <>
      <div className="fixed right-4 top-4 z-[120] md:top-20">
        {!searchOpen ? (
          <button
            type="button"
            onClick={() =>
              setSearchOpen(true)
            }
            aria-label="VOD 검색 열기"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-black/80 text-lg text-white shadow-xl backdrop-blur-xl"
          >
            🔍
          </button>
        ) : (
          <div className="w-[calc(100vw-32px)] max-w-md">
            <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-black/90 px-4 py-3 shadow-xl backdrop-blur-xl">
              <span
                aria-hidden="true"
                className="text-sm text-zinc-500"
              >
                🔍
              </span>

              <input
                type="search"
                autoFocus
                value={searchQuery}
                onChange={(event) =>
                  setSearchQuery(
                    event.target.value,
                  )
                }
                placeholder="VOD 또는 크리에이터 검색"
                aria-label="VOD 검색"
                className="min-w-0 flex-1 bg-transparent text-sm font-bold text-white outline-none placeholder:text-zinc-600"
              />

              {searchQuery && (
                <button
                  type="button"
                  onClick={() =>
                    setSearchQuery("")
                  }
                  className="shrink-0 rounded-lg px-2 py-1 text-xs font-bold text-zinc-400 hover:bg-white/10 hover:text-white"
                >
                  지우기
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setSearchOpen(false);
                  setSearchQuery("");
                }}
                aria-label="VOD 검색 닫기"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-black text-zinc-400 hover:bg-white/10 hover:text-white"
              >
                ✕
              </button>
            </div>

            {normalizedQuery &&
              filteredVods.length === 0 && (
                <div className="mt-2 rounded-xl border border-white/10 bg-black/90 px-4 py-3 text-center text-xs font-bold text-zinc-400">
                  검색 결과가 없습니다.
                </div>
              )}
          </div>
        )}
      </div>

      {filteredVods.length === 0 &&
      !normalizedQuery ? (
        <div className="rounded-[22px] border border-dashed border-white/[0.1] bg-[#111] px-5 py-16 text-center">
          <p className="text-sm font-bold text-zinc-300">
            아직 등록된 VOD가 없습니다.
          </p>

          <Link
            href="/vod/upload"
            className="mt-5 inline-flex rounded-xl bg-flat-yellow px-5 py-3 text-sm font-black text-black"
          >
            첫 VOD 올리기
          </Link>
        </div>
      ) : filteredVods.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredVods.map((vod) => (
            <Link
              href={`/vod/${vod.id}`}
              key={vod.id}
              className="block"
            >
              <article>
                <div className="relative aspect-video overflow-hidden rounded-2xl border border-white/[0.07] bg-black">
                  {vod.isAdult === true ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950">
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-600 text-sm font-black text-white">
                        19+
                      </div>

                      <p className="mt-3 text-xs font-bold text-zinc-300">
                        성인인증 후 시청할 수 있습니다
                      </p>
                    </div>
                  ) : (
                    <>
                      <VodPreview
                        videoUrl={vod.videoUrl}
                        thumbnailUrl={
                          vod.thumbnailUrl
                        }
                      />

                      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-black/60 text-lg">
                          ▶
                        </span>
                      </div>
                    </>
                  )}

                  <div className="absolute bottom-3 right-3 flex items-center gap-2">
                    {vod.isAdult === true && (
                      <span className="rounded-md bg-red-600 px-2 py-1 text-[10px] font-black text-white">
                        19+
                      </span>
                    )}

                    <span className="rounded-md bg-black/70 px-2 py-1 text-[10px] font-bold">
                      VOD
                    </span>
                  </div>
                </div>

                <div className="mt-3">
                  <strong className="line-clamp-2 text-sm">
                    {vod.title}
                  </strong>

                  <div className="mt-1 flex gap-2 text-xs text-zinc-500">
                    <span>
                      {vod.displayName ||
                        vod.username ||
                        "FLATIST"}
                    </span>

                    <span>·</span>

                    <span>
                      조회 {vod.views}
                    </span>
                  </div>
                </div>
              </article>
            </Link>
          ))}
        </div>
      ) : null}
    </>
  );
}
