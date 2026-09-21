import Link from "next/link";
import NotificationBell from "@/components/NotificationBell";
import { readVods } from "@/lib/vod/vod-store";
import { readFlits } from "@/lib/flit/flit-store";
import HomeFlitPreview from "./HomeFlitPreview";
import VodPreview from "./vod/VodPreview";

const lives = [
  {
    name: "YUNA",
    title: "오늘도 편하게 얘기해요",
    viewers: "1.2K",
    category: "소통",
    bg: "from-[#5b3a2e] via-[#33221e] to-[#111]",
  },
  {
    name: "JUNE",
    title: "새벽 감성 라이브",
    viewers: "842",
    category: "음악",
    bg: "from-[#28364a] via-[#18212e] to-[#111]",
  },
  {
    name: "SORA",
    title: "오늘의 일상",
    viewers: "516",
    category: "일상",
    bg: "from-[#55422c] via-[#2d261e] to-[#111]",
  },
];

const creators = [
  { name: "YUNA", info: "소통 · 일상" },
  { name: "JUNE", info: "음악 · 라이브" },
  { name: "SORA", info: "일상 · FLIT" },
];

export const dynamic = "force-dynamic";

export default async function Home() {
  const vods = (await readVods())
    .filter((item) => item.visibility === "public")
    .slice(0, 3);

  const flits = (await readFlits())
    .filter((item) => item.visibility === "public")
    .slice(0, 4);

  return (
    <main className="min-h-screen bg-[#090909] pb-24 text-white md:pb-12 md:pt-20">
      {/* MOBILE HEADER */}
      <header className="sticky top-0 z-40 border-b border-white/[0.07] bg-[#090909]/95 px-4 backdrop-blur-xl md:hidden">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="text-[22px] font-black tracking-[-0.05em]">
            FLAT<span className="text-flat-yellow">LIVE</span>
          </Link>

          <div className="flex items-center gap-1">
            <Link
              href="/search"
              aria-label="검색"
              className="flex h-10 w-10 items-center justify-center rounded-full text-xl text-zinc-200"
            >
              ⌕
            </Link>
            <NotificationBell variant="mobile" />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 md:px-6">

        {/* AD */}
        <section className="pt-4 md:pt-6">
          <Link
            href="/signup"
            className="relative block overflow-hidden rounded-[22px] border border-[#f6c900]/20 bg-gradient-to-br from-[#2a240d] via-[#17150c] to-[#101010] p-5 md:min-h-[210px] md:p-8"
          >
            <span className="mb-8 inline-flex rounded-full border border-[#f6c900]/25 bg-[#f6c900]/10 px-3 py-1 text-[10px] font-black tracking-[0.15em] text-flat-yellow">
              AD
            </span>

            <div className="max-w-xl">
              <p className="text-[13px] font-bold text-flat-yellow">
                FLATLIVE START
              </p>
              <h1 className="mt-2 text-2xl font-black leading-tight tracking-[-0.04em] md:text-4xl">
                지금 시작하고
                <br />
                새로운 순간을 만나보세요
              </h1>
              <p className="mt-3 text-sm text-zinc-400">
                LIVE와 FLIT, 크리에이터와 연결되는 공간
              </p>
            </div>

            <div className="absolute -bottom-14 -right-8 h-44 w-44 rounded-full bg-[#f6c900]/10 blur-2xl md:h-72 md:w-72" />
          </Link>
        </section>

        {/* LIVE - 바로 광고 아래 */}
        <section className="mt-7">
          <div className="mb-4 flex items-end justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,.8)]" />
                <h2 className="text-xl font-black tracking-[-0.03em]">
                  지금 LIVE
                </h2>
              </div>
              <p className="mt-1 text-xs text-zinc-500">
                지금 방송 중인 크리에이터
              </p>
            </div>

            <Link href="/live" className="text-xs font-bold text-zinc-400">
              전체보기 ›
            </Link>
          </div>

          <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] md:mx-0 md:grid md:grid-cols-3 md:px-0">
            {lives.map((live) => (
              <Link
                key={live.name}
                href="/live"
                className="w-[72vw] max-w-[300px] shrink-0 md:w-auto md:max-w-none"
              >
                <article
                  className={
                    "group relative aspect-[4/3] overflow-hidden rounded-[20px] bg-gradient-to-br " +
                    live.bg
                  }
                >
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_65%_30%,rgba(255,255,255,.14),transparent_28%)]" />

                  <div className="absolute left-3 top-3 flex items-center gap-2">
                    <span className="rounded-md bg-red-600 px-2 py-1 text-[10px] font-black">
                      LIVE
                    </span>
                    <span className="rounded-md bg-black/55 px-2 py-1 text-[10px] font-bold">
                      ◉ {live.viewers}
                    </span>
                  </div>

                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black via-black/65 to-transparent p-4 pt-14">
                    <div className="mb-1 flex items-center gap-2">
                      <div className="h-7 w-7 rounded-full border border-white/20 bg-white/10" />
                      <strong className="text-sm">{live.name}</strong>
                      <span className="text-flat-yellow">✓</span>
                    </div>
                    <p className="truncate text-sm font-bold">{live.title}</p>
                    <p className="mt-1 text-[11px] text-zinc-400">{live.category}</p>
                  </div>
                </article>
              </Link>
            ))}
          </div>
        </section>

        {/* VOD */}
        <section className="mt-9">
          <div className="mb-4 flex items-end justify-between">
            <div>
              <h2 className="text-xl font-black tracking-[-0.03em]">
                추천 VOD
              </h2>
              <p className="mt-1 text-xs text-zinc-500">
                가로형 영상 콘텐츠
              </p>
            </div>

            <Link href="/vod" className="text-xs font-bold text-zinc-400">
              전체보기 ›
            </Link>
          </div>

          <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] md:mx-0 md:grid md:grid-cols-3 md:px-0">
            {vods.map((vod) => (
              <Link
                key={vod.id}
                href={`/vod/${vod.id}`}
                className="w-[78vw] max-w-[340px] shrink-0 md:w-auto md:max-w-none"
              >
                <article>
                  <div className="relative aspect-video overflow-hidden rounded-[20px] bg-black">
                    {vod.isAdult === true ? (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-600 text-xs font-black text-white">
                          19+
                        </div>

                        <p className="mt-2 text-[11px] font-bold text-zinc-400">
                          성인인증 후 시청
                        </p>
                      </div>
                    ) : (
                      <VodPreview
                        videoUrl={vod.videoUrl}
                        thumbnailUrl={vod.thumbnailUrl}
                      />
                    )}

                    <div className="absolute left-3 top-3">
                      <span className="rounded-md bg-black/60 px-2.5 py-1 text-[10px] font-black text-flat-yellow">
                        VOD
                      </span>
                    </div>

                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-3xl">
                      ▶
                    </div>
                  </div>

                  <div className="mt-3">
                    <p className="truncate text-sm font-extrabold">
                      {vod.title}
                    </p>

                    <div className="mt-1 flex items-center gap-2 text-[11px] text-zinc-500">
                      <span>
                        {vod.displayName || vod.username || "FLATIST"}
                      </span>
                      <span>·</span>
                      <span>조회 {vod.views}</span>
                    </div>
                  </div>
                </article>
              </Link>
            ))}
          </div>
        </section>

        {/* FLIT - VERTICAL FEED */}
        <section className="mt-9">
          <div className="mb-4 flex items-end justify-between">
            <div>
              <h2 className="text-xl font-black tracking-[-0.03em]">
                최신 FLIT
              </h2>
              <p className="mt-1 text-xs text-zinc-500">
                새로 올라온 영상을 계속 만나보세요
              </p>
            </div>

            <Link
              href="/shorts"
              className="text-xs font-bold text-zinc-400"
            >
              전체보기 ›
            </Link>
          </div>

          {flits.length === 0 ? (
            <div className="rounded-[22px] border border-dashed border-white/[0.1] bg-[#111] px-5 py-12 text-center">
              <p className="text-sm font-bold text-zinc-400">
                아직 공개된 FLIT이 없습니다.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {flits.map((flit) => (
                <Link
                  href={`/shorts?flitId=${encodeURIComponent(
                    flit.id,
                  )}`}
                  key={flit.id}
                  className="mx-auto block w-full max-w-md"
                >
                  <article className="overflow-hidden rounded-[22px] border border-white/[0.07] bg-[#111]">
                    <div className="relative aspect-[9/16] w-full overflow-hidden bg-black">
                      {flit.isAdult === true ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950">
                          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-600 text-sm font-black text-white">
                            19+
                          </div>

                          <p className="mt-3 text-xs font-bold text-zinc-400">
                            성인인증 후 시청
                          </p>
                        </div>
                      ) : (
                        <>
                          <HomeFlitPreview
                            videoUrl={flit.videoUrl}
                          />

                          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-black/55 text-base text-white">
                              ▶
                            </span>
                          </div>
                        </>
                      )}

                      <div className="absolute left-3 top-3">
                        <span className="rounded-full bg-black/70 px-2.5 py-1 text-[10px] font-black text-white">
                          FLIT
                        </span>
                      </div>

                      {flit.isAdult === true && (
                        <div className="absolute right-3 top-3">
                          <span className="rounded bg-red-600 px-2 py-1 text-[9px] font-black text-white">
                            19+
                          </span>
                        </div>
                      )}

                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/70 to-transparent p-4 pt-24">
                        <div className="text-xs font-bold text-zinc-300">
                          {flit.displayName ||
                            flit.username ||
                            "FLATIST"}
                        </div>

                        <p className="mt-1 text-base font-black text-white">
                          {flit.title}
                        </p>

                        <div className="mt-2 flex items-center gap-4 text-[11px] text-zinc-400">
                          <span>조회 {flit.views}</span>
                          <span>좋아요 {flit.likes}</span>
                          <span>댓글 {flit.comments}</span>
                        </div>
                      </div>
                    </div>
                  </article>
                </Link>
              ))}
            </div>
          )}

        </section>

        {/* FOOTER */}
        <footer className="mt-8 border-t border-white/[0.08] pb-8 pt-7">
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-[11px] font-semibold text-zinc-500">
            <Link href="/notices">공지사항</Link>
            <Link href="/policy/terms">이용약관</Link>
            <Link href="/policy/privacy" className="text-zinc-300">
              개인정보처리방침
            </Link>
            <Link href="/policy/youth">청소년보호정책</Link>
            <Link href="/policy/operation">운영정책</Link>
            <Link href="/policy/community">커뮤니티 가이드라인</Link>
            <Link href="/policy/copyright">저작권·음원정책</Link>
            <Link href="/policy/ai">AI 콘텐츠 정책</Link>
            <Link href="/report" className="text-violet-300">
              권리침해 신고센터
            </Link>
          </div>

          <div className="mt-6 text-[11px] leading-5 text-zinc-600">
            <p className="font-bold text-zinc-500">(주)플랫티스트</p>
            <p className="mt-1">
              회사 상세정보는 서비스 오픈 전 등록됩니다.
            </p>
            <p className="mt-3">© FLATLIVE. All rights reserved.</p>
          </div>
        </footer>

      </div>
    </main>
  );
}
