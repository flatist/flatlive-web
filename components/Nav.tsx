"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import NotificationBell from "@/components/NotificationBell";

const menus = [
  { href: "/", label: "홈", icon: "⌂" },
  { href: "/live", label: "LIVE", icon: "●" },
  { href: "/shorts", label: "FLIT", icon: "▶" },
  { href: "/following", label: "팔로우", icon: "♡" },
];

export default function Nav() {
  const pathname = usePathname();
  const { isAuthenticated, user, logout } = useAuth();

  const [menuOpen, setMenuOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <>
      {/* PC HEADER */}
      <header className="fixed inset-x-0 top-0 z-50 hidden h-16 border-b border-white/10 bg-[#090909]/95 backdrop-blur-xl md:block">
        <div className="mx-auto flex h-full max-w-7xl items-center gap-8 px-6">
          <Link
            href="/"
            className="shrink-0 text-xl font-black tracking-[-0.04em]"
          >
            FLAT<span className="text-flat-yellow">LIVE</span>
          </Link>

          <div className="mx-auto flex max-w-md flex-1 items-center rounded-full border border-white/10 bg-white/[0.06] px-4">
            <span className="mr-2 text-zinc-500">⌕</span>
            <input
              aria-label="검색"
              placeholder="크리에이터, LIVE, FLIT 검색"
              className="h-10 w-full bg-transparent text-sm text-white outline-none placeholder:text-zinc-600"
            />
          </div>

          <nav className="flex items-center gap-6">
            {menus.map((menu) => (
              <Link
                key={menu.href}
                href={menu.href}
                className={
                  "text-sm transition " +
                  (isActive(menu.href)
                    ? "font-extrabold text-flat-yellow"
                    : "font-semibold text-zinc-400 hover:text-white")
                }
              >
                {menu.label}
              </Link>
            ))}
          </nav>

          <NotificationBell variant="pc" />


          <button
            type="button"
            aria-label="메뉴 열기"
            onClick={() => setMenuOpen(true)}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-xl"
          >
            ☰
          </button>
        </div>
      </header>

      {/* MOBILE BOTTOM NAV */}
      <nav
        data-flat-mobile-nav="true"
        className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-[#090909]/95 backdrop-blur-xl md:hidden"
      >
        <div className="grid h-[68px] grid-cols-5">
          <Link
            href="/"
            className={isActive("/") ? "flat-nav-active" : "flat-nav"}
          >
            <span className="text-xl">⌂</span>
            <span>홈</span>
          </Link>

          <Link
            href="/live"
            className={isActive("/live") ? "flat-nav-active" : "flat-nav"}
          >
            <span className="text-lg">●</span>
            <span>LIVE</span>
          </Link>

          <button
            type="button"
            aria-label="만들기"
            onClick={() => setCreateOpen(true)}
            className="flex items-center justify-center"
          >
            <span className="flex h-11 w-14 items-center justify-center rounded-[15px] bg-flat-yellow text-2xl font-black text-black shadow-[0_0_24px_rgba(255,205,0,.18)]">
              ＋
            </span>
          </button>

          <Link
            href="/shorts"
            className={
              isActive("/shorts") ? "flat-nav-active" : "flat-nav"
            }
          >
            <span className="text-xl">▶</span>
            <span>FLIT</span>
          </Link>

          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="flat-nav"
          >
            <span className="text-xl">☰</span>
            <span>메뉴</span>
          </button>
        </div>
      </nav>

      {/* MOBILE CREATE SHEET */}
      {createOpen && (
        <div className="fixed inset-0 z-[120] md:hidden">
          <button
            type="button"
            aria-label="만들기 메뉴 닫기"
            onClick={() => setCreateOpen(false)}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />

          <section className="absolute inset-x-0 bottom-0 rounded-t-[28px] border-t border-white/10 bg-[#111] px-5 pb-8 pt-4 shadow-2xl">
            <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-zinc-700" />

            <div className="mb-5">
              <h2 className="text-xl font-black">만들기</h2>
              <p className="mt-1 text-xs text-zinc-500">
                FLIT 영상을 올려보세요
              </p>
            </div>

            <div className="space-y-3">
              <Link
                href="/shorts/upload"
                onClick={() => setCreateOpen(false)}
                className="flex min-h-[72px] items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.04] px-4"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-xl">
                  ▶
                </span>
                <div>
                  <strong className="text-sm">FLIT 올리기</strong>
                  <p className="mt-1 text-xs text-zinc-500">
                    영상 촬영·업로드 및 편집
                  </p>
                </div>
              </Link>

              <Link
                href="/live/studio"
                onClick={() => setCreateOpen(false)}
                className="flex min-h-[72px] items-center gap-4 rounded-2xl border border-[#f6c900]/25 bg-[#f6c900]/[0.06] px-4"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-flat-yellow text-lg font-black text-black">
                  ●
                </span>

                <div>
                  <strong className="text-sm">
                    자체 송출하기
                  </strong>

                  <p className="mt-1 text-xs text-zinc-500">
                    카메라·마이크로 바로 LIVE 방송
                  </p>
                </div>
              </Link>
            </div>
          </section>
        </div>
      )}

      {/* ACCOUNT / SERVICE DRAWER */}
      {menuOpen && (
        <div className="fixed inset-0 z-[500]">
          <button
            type="button"
            aria-label="메뉴 닫기"
            onClick={() => setMenuOpen(false)}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />

          <aside className="absolute right-0 top-0 h-full w-[86%] max-w-sm overflow-y-auto border-l border-white/10 bg-[#111] p-6 shadow-2xl">
            <div className="mb-8 flex items-center justify-between">
              <strong className="text-xl">
                FLAT<span className="text-flat-yellow">LIVE</span>
              </strong>

              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-xl"
              >
                ×
              </button>
            </div>

            {isAuthenticated ? (
              <Link
                href="/profile"
                onClick={() => setMenuOpen(false)}
                className="mb-7 block rounded-2xl border border-white/10 bg-white/[0.04] p-4"
              >
                <p className="text-sm font-bold text-white">
                  {user?.email}
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  내 프로필 보기
                </p>
              </Link>
            ) : (
              <Link
                href="/login"
                onClick={() => setMenuOpen(false)}
                className="mb-7 flex h-12 items-center justify-center rounded-xl bg-flat-yellow font-extrabold text-black"
              >
                로그인
              </Link>
            )}

            <div className="space-y-1">
              <Link
                href="/notices"
                onClick={() => setMenuOpen(false)}
                className="flat-drawer-item"
              >
                공지사항
              </Link>

              <Link
                href="/support"
                onClick={() => setMenuOpen(false)}
                className="flat-drawer-item"
              >
                고객센터
              </Link>

              <Link
                href="/profile"
                onClick={() => setMenuOpen(false)}
                className="flat-drawer-item"
              >
                프로필
              </Link>
              {/* PC STUDIO ONLY - 모바일에서는 부모째 숨김 */}
              <div className="hidden md:block">


              <Link
                href="/studio"
                onClick={() => setMenuOpen(false)}
                className="flat-drawer-item"
              >
                콘텐츠 스튜디오
              </Link>

              <Link
                href="/live/studio"
                onClick={() => setMenuOpen(false)}
                className="flat-drawer-item"
              >
                방송 스튜디오
              </Link>
              </div>

              <Link
                href="/lounge"
                onClick={() => setMenuOpen(false)}
                className="flat-drawer-item"
              >
                플랫라운지
              </Link>

              <Link
                href="/plshop"
                onClick={() => setMenuOpen(false)}
                className="flat-drawer-item"
              >
                플#
              </Link>

              <Link
                href="/pping"
                onClick={() => setMenuOpen(false)}
                className="flat-drawer-item"
              >
                플핑
              </Link>

              <Link
                href="/ranking"
                onClick={() => setMenuOpen(false)}
                className="flat-drawer-item"
              >
                랭킹
              </Link>

              <Link
                href="/wallet"
                onClick={() => setMenuOpen(false)}
                className="flat-drawer-item"
              >
                FLAT · 지갑
              </Link>

              <Link
                href="/settings"
                onClick={() => setMenuOpen(false)}
                className="flat-drawer-item"
              >
                설정
              </Link>
            </div>

            {isAuthenticated && (
              <button
                type="button"
                onClick={() => {
                  logout();
                  setMenuOpen(false);
                }}
                className="mt-8 text-sm font-semibold text-zinc-500"
              >
                로그아웃
              </button>
            )}
          </aside>
        </div>
      )}
    </>
  );
}
