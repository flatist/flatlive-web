import Link from "next/link";
import { redirect } from "next/navigation";
import {
  AuthenticationError,
  AuthorizationError,
  requirePermission,
} from "@/lib/auth/authorization";
import { listAllSettlementAffiliations } from "@/lib/settlement/affiliation-store";
import { listAllSettlementRecords } from "@/lib/settlement/record-store";

export const dynamic = "force-dynamic";

export default async function AdminAgenciesPage() {
  try {
    await requirePermission("SETTLEMENT_READ");
    const [data, records] = await Promise.all([
      listAllSettlementAffiliations(),
      listAllSettlementRecords(),
    ]);

    const agencyGross = records
      .filter((item) => item.affiliation === "AGENCY")
      .reduce((sum, item) => sum + item.grossAmount, 0);

    return (
      <main className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm md:p-6">
        <div className="text-[10px] font-black tracking-[0.18em] text-zinc-400">AGENCY ORGANIZATION</div>
        <h1 className="mt-1 text-2xl font-black">에이전시 조직 통합 현황</h1>
        <p className="mt-2 text-sm text-zinc-500">본부장 · 지사장 · 에이전시를 각각 분리 관리합니다. 정산 정책은 크리에이터 60% · 에이전시 10% · 지사장 5% · 본부장 5% · 본사 20%입니다.</p>

        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-5">
          <Stat label="본부장" value={`${data.headManagers.length.toLocaleString()}명`} />
          <Stat label="지사" value={`${data.branches.length.toLocaleString()}개`} />
          <Stat label="에이전시" value={`${data.agencies.length.toLocaleString()}개`} />
          <Stat label="소속 크리에이터" value={`${data.creators.length.toLocaleString()}명`} />
          <Stat label="소속 총 발생" value={`${agencyGross.toLocaleString()} FLAT`} />
        </div>

        <div className="mt-5 flex justify-end"><Link href="/admin/agencies/access-codes" className="rounded-xl bg-zinc-950 px-4 py-2.5 text-xs font-black text-white">조직 접속코드 관리</Link></div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <RoleCard href="/admin/agencies/head" code="HQ" title="본부장 관리" description="본부장별 지사·에이전시·크리에이터와 본부장 정산 5%를 확인합니다." count={`${data.headManagers.length}명`} />
          <RoleCard href="/admin/agencies/branch" code="BR" title="지사장 관리" description="지사별 에이전시·크리에이터와 지사 정산 5%를 확인합니다." count={`${data.branches.length}개`} />
          <RoleCard href="/admin/agencies/agency" code="AG" title="에이전시 관리" description="에이전시별 소속 크리에이터와 에이전시 정산 10%를 확인합니다." count={`${data.agencies.length}개`} />
        </div>
      </main>
    );
  } catch (error) {
    if (error instanceof AuthenticationError || error instanceof AuthorizationError) redirect("/");
    throw error;
  }
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4"><div className="text-xs font-bold text-zinc-400">{label}</div><div className="mt-2 text-xl font-black">{value}</div></div>;
}

function RoleCard({ href, code, title, description, count }: { href: string; code: string; title: string; description: string; count: string }) {
  return (
    <Link href={href} className="group rounded-2xl border border-zinc-200 p-5 transition hover:border-zinc-400 hover:shadow-sm">
      <div className="flex items-center justify-between"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-950 text-xs font-black text-white">{code}</span><span className="text-xl font-black">{count}</span></div>
      <div className="mt-4 text-lg font-black">{title}</div>
      <p className="mt-2 text-sm leading-6 text-zinc-500">{description}</p>
      <div className="mt-4 text-xs font-black text-zinc-900 group-hover:underline">관리 페이지 열기 →</div>
    </Link>
  );
}
