"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import LiveLevelBadge from "@/app/live/common/LiveLevelBadge";

type LiveRoom = {
  roomId: string;
  title: string;
  category: string;
  isAdult: boolean;
  broadcasterName: string;
  broadcasterUserId: string;
  broadcasterUsername: string;
  broadcasterAvatarUrl: string;
  broadcasterLevel?: number;
  viewerCount: number;
  createdAt: number;
  updatedAt: number;
};

const categories = [
  "전체",
  "토크",
  "음악",
  "게임",
  "먹방",
  "댄스",
  "버츄얼",
  "기타",
];

export default function LivePage() {
  const [rooms, setRooms] = useState<LiveRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] =
    useState("전체");

  const filteredRooms =
    selectedCategory === "전체"
      ? rooms
      : rooms.filter(
          (room) => room.category === selectedCategory,
        );

  useEffect(() => {
    let cancelled = false;

    async function loadRooms() {
      try {
        const response = await fetch("/api/live/rooms", {
          cache: "no-store",
        });

        if (!response.ok) {
          return;
        }

        const data = await response.json();

        if (!cancelled && Array.isArray(data.rooms)) {
          setRooms(data.rooms);
        }
      } catch (error) {
        console.error("LIVE ROOMS LOAD FAILED:", error);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadRooms();

    const timer = setInterval(() => {
      void loadRooms();
    }, 2000);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  return (
    <main className="min-h-screen bg-[#090909] pb-24 text-white md:pt-20">
      <div className="mx-auto max-w-2xl">

        {/* HEADER */}
        <section className="px-4 pb-4 pt-5">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-black tracking-[-0.04em]">
                LIVE
              </h1>

              <p className="mt-1 text-xs text-zinc-500">
                지금 방송 중인 플랫티스트
              </p>
            </div>

            <button
              type="button"
              aria-label="LIVE 검색"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-xl"
            >
              ⌕
            </button>
          </div>
        </section>

        {/* CATEGORY */}
        <section className="sticky top-0 z-20 border-y border-white/[0.06] bg-[#090909]/95 backdrop-blur-xl md:top-16">
          <div className="flex gap-2 overflow-x-auto px-4 py-3 [scrollbar-width:none]">
            {categories.map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => setSelectedCategory(category)}
                className={
                  "shrink-0 rounded-full px-4 py-2 text-xs font-bold " +
                  (selectedCategory === category
                    ? "bg-flat-yellow text-black"
                    : "border border-white/10 bg-white/[0.04] text-zinc-400")
                }
              >
                {category}
              </button>
            ))}
          </div>
        </section>

        {/* REAL LIVE FEED */}
        <section className="space-y-6 px-4 pt-5">
          {loading && (
            <div className="py-16 text-center text-sm text-zinc-500">
              LIVE 목록을 불러오는 중...
            </div>
          )}

          {!loading && filteredRooms.length === 0 && (
            <div className="py-20 text-center">
              <p className="text-sm font-bold text-zinc-300">
                현재 진행 중인 LIVE가 없습니다.
              </p>
              <p className="mt-2 text-xs text-zinc-600">
                방송이 시작되면 이곳에 자동으로 표시됩니다.
              </p>
            </div>
          )}

          {filteredRooms.map((room) => (
            <Link
              href={`/live/watch/${room.roomId}`}
              key={room.roomId}
              className="block"
            >
              <article>
                <div className="relative aspect-[4/5] overflow-hidden rounded-[22px] bg-gradient-to-b from-zinc-800 via-zinc-900 to-black">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_28%,rgba(255,255,255,.14),transparent_32%)]" />

                  <div className="absolute left-3 top-3 flex items-center gap-2">
                    <span className="rounded-md bg-red-600 px-2.5 py-1 text-[10px] font-black">
                      LIVE
                    </span>

                    {room.isAdult === true && (
                      <span className="rounded-md border border-red-400/70 bg-red-700 px-2.5 py-1 text-[10px] font-black text-white">
                        19+
                      </span>
                    )}

                    <span className="rounded-md bg-black/55 px-2.5 py-1 text-[10px] font-bold">
                      ◉ {room.viewerCount}
                    </span>
                  </div>

                  <span className="absolute right-3 top-3 rounded-full bg-black/55 px-3 py-1 text-[10px] font-bold text-zinc-300">
                    {room.category}
                  </span>

                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/65 to-transparent p-4 pt-24">
                    <div className="flex items-end justify-between gap-3">
                      <div className="min-w-0">
                        <div className="mb-2 flex items-center gap-2">
                          <div className="h-9 w-9 overflow-hidden rounded-full border border-white/20 bg-white/10">
                            {room.broadcasterAvatarUrl ? (
                              <img
                                src={room.broadcasterAvatarUrl}
                                alt={room.broadcasterName}
                                className="h-full w-full object-cover"
                              />
                            ) : null}
                          </div>

                          <LiveLevelBadge
                            label={`FLATIST Lv.${room.broadcasterLevel ?? 1}`}
                          />

                          <strong className="text-sm">
                            {room.broadcasterName}
                          </strong>

                          <span className="text-flat-yellow">
                            ✓
                          </span>
                        </div>

                        <p className="truncate text-base font-extrabold">
                          {room.title}
                        </p>
                      </div>

                      <span className="shrink-0 rounded-full bg-flat-yellow px-4 py-2 text-xs font-black text-black">
                        시청
                      </span>
                    </div>
                  </div>
                </div>
              </article>
            </Link>
          ))}
        </section>

      </div>
    </main>
  );
}
