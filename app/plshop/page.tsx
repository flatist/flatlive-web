const categories = [
  {
    title: "닉꾸미기",
    description: "닉네임 색상 · 전용 배지 · 움직이는 효과",
  },
  {
    title: "입장효과",
    description: "LIVE 입장 시 닉네임과 함께 표시되는 전용 효과",
  },
  {
    title: "전광판",
    description: "LIVE 상단에 메시지를 노출하는 특별 아이템",
  },
  {
    title: "입장권",
    description: "유료 및 특별 LIVE 입장권",
  },
  {
    title: "라운지 꾸미기",
    description: "캐릭터 · 의상 · 액세서리 · 라운지 테마",
  },
  {
    title: "생일축하효과",
    description: "특별한 날짜에 표시되는 풀스크린 효과",
  },
  {
    title: "이모티콘",
    description: "DM과 라운지에서 사용하는 전용 이모티콘",
  },
];

export default function PlShopPage() {
  return (
    <main className="min-h-screen bg-black pb-24 pt-20 text-white">
      <div className="mx-auto w-full max-w-6xl px-5 py-8 md:px-6">
        <section className="overflow-hidden rounded-[28px] border border-white/10 bg-gradient-to-br from-[#171717] to-[#090909] p-7 md:p-10">
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-flat-yellow px-3 py-1 text-xs font-black text-black">
              FLAT LIVE
            </span>
            <span className="text-xs font-bold text-zinc-500">
              DIGITAL ITEM SHOP
            </span>
          </div>

          <h1 className="mt-5 text-4xl font-black tracking-[-0.05em] md:text-5xl">
            플<span className="text-flat-yellow">#</span>
          </h1>

          <p className="mt-4 max-w-2xl text-sm leading-6 text-zinc-400 md:text-base">
            FLAT LIVE에서 사용할 수 있는 특별한 효과와 꾸미기 아이템을
            만나는 공간입니다.
          </p>

          <div className="mt-7 inline-flex rounded-full border border-flat-yellow/20 bg-flat-yellow/[0.07] px-4 py-2 text-sm font-bold text-flat-yellow">
            준비 중입니다
          </div>
        </section>

        <section className="mt-8">
          <div className="mb-5">
            <h2 className="text-xl font-black">플# 카테고리</h2>
            <p className="mt-1 text-sm text-zinc-500">
              실제 구매 및 사용 기능은 추후 순차적으로 제공됩니다.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((category) => (
              <div
                key={category.title}
                className="rounded-2xl border border-white/10 bg-white/[0.035] p-5"
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.07] text-lg font-black text-flat-yellow">
                  #
                </div>

                <h3 className="font-extrabold">{category.title}</h3>
                <p className="mt-2 text-sm leading-5 text-zinc-500">
                  {category.description}
                </p>

                <span className="mt-4 inline-block text-xs font-bold text-zinc-600">
                  준비 중
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
