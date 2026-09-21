import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAuthenticatedUser, AuthenticationError } from "@/lib/auth/authorization";
import { roleHasPermission, type Permission } from "@/lib/auth/permissions";

const cards: Array<{ title: string; description: string; href: string; permission: Permission; code: string }> = [
  { title: "회원 관리", description: "회원 검색과 계정 운영 정보를 확인합니다.", href: "/admin/members", permission: "MEMBER_READ", code: "MB" },
  { title: "LIVE 관제", description: "현재 방송, 시청자 수, 강제 종료를 관리합니다.", href: "/admin/live", permission: "LIVE_READ", code: "LV" },
  { title: "신고 관리", description: "LIVE · FLIT · VOD 신고를 검토합니다.", href: "/admin/reports", permission: "REPORT_READ", code: "RP" },
  { title: "콘텐츠 관리", description: "FLIT · VOD 게시 현황과 성인 표시를 확인합니다.", href: "/admin/content", permission: "REPORT_READ", code: "CT" },
  { title: "후원 거래", description: "후원 거래 상태와 Trace ID를 확인합니다.", href: "/admin/donations", permission: "DONATION_READ", code: "DN" },
  { title: "지갑 · 거래", description: "FLAT 원장과 회원별 거래 내역을 조회합니다.", href: "/admin/wallet", permission: "WALLET_READ", code: "WL" },
  { title: "정산 관리", description: "크리에이터 정산 신청과 지급 상태를 관리합니다.", href: "/admin/settlements", permission: "SETTLEMENT_READ", code: "ST" },
  { title: "에이전시 구조", description: "에이전시 · 지사 · 본부장 · 크리에이터 연결을 확인합니다.", href: "/admin/agencies", permission: "SETTLEMENT_READ", code: "AG" },
  { title: "라운지 관리", description: "라운지 가입 현황과 구독 상태를 확인합니다.", href: "/admin/lounge", permission: "MEMBER_READ", code: "LG" },
  { title: "관리자 권한", description: "관리자 역할과 접근 권한을 관리합니다.", href: "/admin/permissions", permission: "ADMIN_PERMISSION_READ", code: "PM" },
  { title: "감사 로그", description: "중요 관리자 작업의 처리 이력을 확인합니다.", href: "/admin/audit", permission: "AUDIT_LOG_READ", code: "AL" },
];

export default async function AdminPage() {
  try {
    const admin = await requireAuthenticatedUser();
    const visible = cards.filter((card) => roleHasPermission(admin.role, card.permission));

    return (
      <main className="pb-10">
        <header className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="text-[10px] font-black tracking-[0.2em] text-zinc-400">ADMIN DASHBOARD</div>
          <div className="mt-2 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-3xl font-black tracking-[-0.04em]">플랫라이브 관리자</h1>
              <p className="mt-2 text-sm text-zinc-500">LIVE, 회원, 후원, 정산, 라운지 운영 기능을 한 곳에서 관리합니다.</p>
            </div>
            <div className="rounded-xl bg-zinc-950 px-4 py-3 text-white">
              <div className="text-[10px] font-bold text-zinc-400">현재 권한</div>
              <div className="mt-1 text-sm font-black">{admin.role}</div>
            </div>
          </div>
        </header>

        <section className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((card) => (
            <Link key={card.href} href={card.href} className="group rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
              <div className="flex items-start justify-between">
                <span className="flex h-10 min-w-10 items-center justify-center rounded-xl bg-zinc-950 px-2 text-[10px] font-black text-white">{card.code}</span>
                <span className="text-zinc-300 transition group-hover:translate-x-1 group-hover:text-zinc-950">→</span>
              </div>
              <h2 className="mt-4 text-base font-black">{card.title}</h2>
              <p className="mt-2 text-sm leading-6 text-zinc-500">{card.description}</p>
            </Link>
          ))}
        </section>
      </main>
    );
  } catch (error) {
    if (error instanceof AuthenticationError) redirect("/");
    throw error;
  }
}
