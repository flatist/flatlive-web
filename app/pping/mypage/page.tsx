import Link from "next/link";

type ShoppingMenuProps = {
  title: string;
  description: string;
  badge?: string;
};

function ShoppingMenu({
  title,
  description,
  badge,
}: ShoppingMenuProps) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-zinc-950 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-black text-white">
            {title}
          </h2>

          <p className="mt-2 text-xs leading-5 text-zinc-500">
            {description}
          </p>
        </div>

        <span className="shrink-0 rounded-full bg-zinc-900 px-2.5 py-1 text-[10px] font-bold text-zinc-500">
          {badge || "준비중"}
        </span>
      </div>
    </div>
  );
}

export default function PpingMyPage() {
  return (
    <main className="min-h-screen bg-black px-4 pb-28 pt-8 text-white md:px-6 md:pt-24">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-black tracking-widest text-flat-yellow">
              P-PING
            </p>

            <h1 className="mt-2 text-3xl font-black tracking-[-0.04em]">
              플핑 마이페이지
            </h1>

            <p className="mt-2 text-sm text-zinc-500">
              주문과 쇼핑 활동을 한곳에서 관리합니다.
            </p>
          </div>

          <Link
            href="/profile"
            className="rounded-full border border-white/15 px-4 py-2 text-xs font-bold transition hover:bg-white hover:text-black"
          >
            FLAT LIVE 마이로 돌아가기
          </Link>
        </div>

        <section className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <ShoppingMenu
            title="주문 내역"
            description="주문한 상품과 주문 상태를 확인합니다."
          />

          <ShoppingMenu
            title="배송 조회"
            description="배송중인 상품과 배송 이력을 확인합니다."
          />

          <ShoppingMenu
            title="취소 · 반품 · 교환"
            description="취소, 반품, 교환 신청과 처리 상태를 확인합니다."
          />

          <ShoppingMenu
            title="장바구니"
            description="담아둔 상품을 확인합니다."
          />

          <ShoppingMenu
            title="찜 · 관심상품"
            description="관심 있는 상품을 모아봅니다."
          />

          <ShoppingMenu
            title="쿠폰 · 혜택"
            description="보유 쿠폰과 쇼핑 혜택을 확인합니다."
          />
        </section>

        <section className="mt-8 rounded-3xl border border-white/[0.08] bg-zinc-950 p-6">
          <p className="text-xs font-black text-zinc-500">
            SHOPPING ACTIVITY
          </p>

          <h2 className="mt-2 text-xl font-black">
            최근 쇼핑 활동
          </h2>

          <div className="mt-5 rounded-2xl border border-dashed border-white/[0.1] py-10 text-center text-sm text-zinc-600">
            주문 기능 연결 후 최근 주문과 배송 상태가 표시됩니다.
          </div>
        </section>
      </div>
    </main>
  );
}
