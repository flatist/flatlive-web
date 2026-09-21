"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type MembershipStatus =
  | "ACTIVE"
  | "EXPIRED"
  | "CANCELED";

type LoungeMembership = {
  id: string;
  userId: string;
  status: MembershipStatus;
  startedAt: string;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
};

const benefits = [
  "라운지 전용 게시물 · 공지",
  "멤버십 배지",
  "라운지 전용 댓글 · 채팅 표시",
  "멤버 전용 LIVE",
  "우선 알림",
  "전용 사진 · 영상",
];

function formatDate(value?: string) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export default function LoungePage() {
  const [loaded, setLoaded] = useState(false);
  const [authenticated, setAuthenticated] =
    useState(false);

  const [membership, setMembership] =
    useState<LoungeMembership | null>(null);

  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const isActive =
    membership?.status === "ACTIVE";

  async function loadMembership() {
    try {
      setMessage("");

      const response = await fetch(
        "/api/lounge/membership",
        {
          method: "GET",
          cache: "no-store",
        },
      );

      const data = await response.json();

      if (response.status === 401) {
        setAuthenticated(false);
        setMembership(null);
        return;
      }

      if (!response.ok) {
        throw new Error(
          data?.message ||
            "멤버십 정보를 불러오지 못했습니다.",
        );
      }

      setAuthenticated(true);
      setMembership(data.membership ?? null);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "멤버십 정보를 불러오지 못했습니다.",
      );
    } finally {
      setLoaded(true);
    }
  }

  useEffect(() => {
    void loadMembership();
  }, []);

  async function activateMembership() {
    try {
      setBusy(true);
      setMessage("");

      const response = await fetch(
        "/api/lounge/membership",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "activate-test",
            months: 1,
          }),
        },
      );

      const data = await response.json();

      if (response.status === 401) {
        setAuthenticated(false);
        setMembership(null);
        setMessage("로그인이 필요합니다.");
        return;
      }

      if (!response.ok) {
        throw new Error(
          data?.message ||
            "라운지 가입 처리에 실패했습니다.",
        );
      }

      setAuthenticated(true);
      setMembership(data.membership);
      setMessage(
        "테스트 멤버십이 활성화되었습니다.",
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "라운지 가입 처리에 실패했습니다.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function cancelMembership() {
    try {
      setBusy(true);
      setMessage("");

      const response = await fetch(
        "/api/lounge/membership",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "cancel-test",
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.message ||
            "멤버십 해지 처리에 실패했습니다.",
        );
      }

      setMembership(data.membership);
      setMessage(
        "테스트 멤버십이 해지되었습니다.",
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "멤버십 해지 처리에 실패했습니다.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto w-full max-w-5xl px-4 pb-24 pt-8 md:px-8 md:pt-14">
        <section className="overflow-hidden rounded-[28px] border border-white/10 bg-gradient-to-br from-[#181818] via-[#111] to-black p-6 md:p-10">
          <div className="max-w-2xl">
            <p className="text-sm font-black text-flat-yellow">
              FLAT LOUNGE
            </p>

            <h1 className="mt-3 text-3xl font-black tracking-tight md:text-5xl">
              플랫라운지
            </h1>

            <p className="mt-4 text-sm leading-6 text-zinc-400 md:text-base">
              좋아하는 크리에이터와 더 가까이 연결되는
              FLATLIVE 멤버십 공간입니다.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              {!loaded ? (
                <div className="rounded-2xl bg-white/10 px-5 py-3 text-sm font-bold text-zinc-400">
                  멤버십 확인 중...
                </div>
              ) : !authenticated ? (
                <Link
                  href="/login"
                  className="rounded-2xl bg-flat-yellow px-5 py-3 text-sm font-black text-black"
                >
                  로그인 후 가입하기
                </Link>
              ) : isActive ? (
                <>
                  <div className="rounded-2xl bg-flat-yellow px-5 py-3 text-sm font-black text-black">
                    ✓ 라운지 멤버
                  </div>

                  <button
                    type="button"
                    onClick={cancelMembership}
                    disabled={busy}
                    className="rounded-2xl border border-white/10 bg-white/[0.05] px-5 py-3 text-xs font-bold text-zinc-400 disabled:opacity-50"
                  >
                    {busy
                      ? "처리 중..."
                      : "테스트 멤버십 해지"}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={activateMembership}
                  disabled={busy}
                  className="rounded-2xl bg-flat-yellow px-5 py-3 text-sm font-black text-black disabled:opacity-50"
                >
                  {busy
                    ? "처리 중..."
                    : "라운지 가입 테스트"}
                </button>
              )}

              <Link
                href="/"
                className="rounded-2xl border border-white/10 bg-white/[0.05] px-5 py-3 text-sm font-bold text-white"
              >
                홈으로
              </Link>
            </div>

            {message && (
              <p className="mt-4 text-sm text-zinc-400">
                {message}
              </p>
            )}

            {membership && (
              <div className="mt-6 grid gap-3 rounded-2xl border border-white/10 bg-black/30 p-4 sm:grid-cols-3">
                <div>
                  <p className="text-[11px] font-bold text-zinc-500">
                    상태
                  </p>
                  <p className="mt-1 text-sm font-black">
                    {membership.status}
                  </p>
                </div>

                <div>
                  <p className="text-[11px] font-bold text-zinc-500">
                    시작일
                  </p>
                  <p className="mt-1 text-sm font-bold">
                    {formatDate(
                      membership.startedAt,
                    )}
                  </p>
                </div>

                <div>
                  <p className="text-[11px] font-bold text-zinc-500">
                    만료일
                  </p>
                  <p className="mt-1 text-sm font-bold">
                    {formatDate(
                      membership.expiresAt,
                    )}
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="mt-8">
          <div className="mb-4">
            <p className="text-xs font-bold text-zinc-500">
              MEMBER BENEFITS
            </p>

            <h2 className="mt-1 text-xl font-black">
              라운지 멤버 혜택
            </h2>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {benefits.map((benefit) => (
              <div
                key={benefit}
                className="rounded-2xl border border-white/10 bg-white/[0.04] p-5"
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-flat-yellow text-sm font-black text-black">
                  L
                </div>

                <p className="text-sm font-bold text-white">
                  {benefit}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-8 rounded-[24px] border border-white/10 bg-[#111] p-5 md:p-7">
          {isActive ? (
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-flat-yellow px-2.5 py-1 text-[10px] font-black text-black">
                  MEMBER
                </span>

                <p className="text-xs font-bold text-flat-yellow">
                  MEMBERS ONLY
                </p>
              </div>

              <h2 className="mt-3 text-xl font-black">
                라운지 전용 콘텐츠
              </h2>

              <p className="mt-2 text-sm text-zinc-400">
                멤버 전용 LIVE, 게시물, 사진, 영상이
                이 공간에 표시됩니다.
              </p>

              <div className="mt-5 grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-black/40 p-5">
                  <p className="text-xs font-black text-flat-yellow">
                    MEMBER LIVE
                  </p>
                  <p className="mt-2 font-bold">
                    멤버 전용 LIVE
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">
                    전용 방송 기능 연결 예정
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/40 p-5">
                  <p className="text-xs font-black text-flat-yellow">
                    EXCLUSIVE
                  </p>
                  <p className="mt-2 font-bold">
                    전용 사진 · 영상
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">
                    라운지 콘텐츠 연결 예정
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white/[0.06] text-xl">
                🔒
              </div>

              <h2 className="mt-4 text-lg font-black">
                멤버 전용 공간
              </h2>

              <p className="mt-2 text-sm text-zinc-500">
                라운지 가입 후 전용 콘텐츠를 이용할 수 있습니다.
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
