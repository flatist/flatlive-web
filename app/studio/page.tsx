import Link from "next/link";

const studioMenus = [
  {
    href: "/shorts/upload",
    title: "FLIT 올리기",
    description: "세로형 숏폼 영상을 업로드합니다.",
    badge: "9:16",
    icon: "▶",
  },
  {
    href: "/vod/upload",
    title: "VOD 올리기",
    description: "가로형 일반 영상을 업로드합니다.",
    badge: "16:9",
    icon: "▭",
  },
  {
    href: "/studio/content",
    title: "내 콘텐츠 관리",
    description: "내가 올린 FLIT과 VOD를 관리합니다.",
    badge: "관리",
    icon: "☷",
  },
];

export default function StudioPage() {
  return (
    <main className="min-h-screen bg-[#090909] pb-24 pt-20 text-white">
      <div className="mx-auto max-w-6xl px-5 py-8 md:px-6">
        <div className="mb-8">
          <p className="text-xs font-black text-flat-yellow">
            CREATOR STUDIO
          </p>

          <h1 className="mt-2 text-3xl font-black tracking-[-0.04em]">
            스튜디오
          </h1>

          <p className="mt-2 text-sm text-zinc-500">
            FLIT과 VOD를 업로드하고 내 콘텐츠를 관리하세요.
          </p>
        </div>

        <section className="grid gap-4 md:grid-cols-3">
          {studioMenus.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group rounded-[24px] border border-white/[0.08] bg-[#111] p-5 transition hover:border-flat-yellow/40 hover:bg-[#151515]"
            >
              <div className="flex items-start justify-between">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.06] text-xl">
                  {item.icon}
                </span>

                <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1 text-[10px] font-black text-zinc-400">
                  {item.badge}
                </span>
              </div>

              <h2 className="mt-6 text-xl font-black">
                {item.title}
              </h2>

              <p className="mt-2 text-sm leading-6 text-zinc-500">
                {item.description}
              </p>

              <div className="mt-6 text-sm font-black text-flat-yellow">
                시작하기 →
              </div>
            </Link>
          ))}
        </section>

        <section className="mt-10 rounded-[24px] border border-white/[0.08] bg-[#111] p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black">
                최근 콘텐츠
              </h2>

              <p className="mt-1 text-sm text-zinc-500">
                업로드한 FLIT과 VOD가 여기에 표시됩니다.
              </p>
            </div>

            <Link
              href="/studio/content"
              className="text-sm font-black text-flat-yellow"
            >
              전체보기 →
            </Link>
          </div>

          <div className="mt-6 rounded-[18px] border border-dashed border-white/[0.1] px-5 py-10 text-center text-sm text-zinc-600">
            콘텐츠 관리 기능을 연결할 예정입니다.
          </div>
        </section>
      </div>
    </main>
  );
}
