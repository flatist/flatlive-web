import { redirect } from "next/navigation";
import { AuthenticationError, AuthorizationError, requirePermission } from "@/lib/auth/authorization";
import { listAllSettlementAffiliations } from "@/lib/settlement/affiliation-store";
import { listAllSettlementRecords } from "@/lib/settlement/record-store";
import OrganizationRegistrationClient from "../OrganizationRegistrationClient";

export const dynamic = "force-dynamic";

export default async function AdminBranchesPage() {
  try {
    await requirePermission("SETTLEMENT_READ");
    const [data, records] = await Promise.all([listAllSettlementAffiliations(), listAllSettlementRecords()]);
    const rows = data.branches.map((branch) => {
      const creators = data.creators.filter((item) => item.branchId === branch.branchId);
      const agencyIds = new Set([
        ...data.agencies.filter((item) => item.branchId === branch.branchId).map((item) => item.agencyId),
        ...creators.map((item) => item.agencyId),
      ]);
      const settlement = records.filter((item) => item.branchId === branch.branchId);
      const headIds = new Set([...(branch.headManagerUserId ? [branch.headManagerUserId] : []), ...creators.map((item) => item.headManagerUserId)]);
      return { ...branch, headIds: Array.from(headIds), agencies: agencyIds.size, creators: creators.length, gross: settlement.reduce((sum, item) => sum + item.grossAmount, 0), share: settlement.reduce((sum, item) => sum + item.branchAmount, 0) };
    });
    return (
      <main className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm md:p-6">
        <Header />
        <OrganizationRegistrationClient mode="BRANCH" />
        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4"><Stat label="지사" value={`${rows.length}개`} /><Stat label="연결 에이전시" value={`${data.agencies.length}개`} /><Stat label="소속 크리에이터" value={`${data.creators.length}명`} /><Stat label="지사 누적 정산" value={`${rows.reduce((s,x)=>s+x.share,0).toLocaleString()} FLAT`} /></div>
        <div className="mt-5 overflow-x-auto rounded-2xl border border-zinc-200"><table className="min-w-[1050px] w-full border-collapse text-sm"><thead className="bg-zinc-50 text-left text-xs text-zinc-500"><tr>{["지사명", "지사 ID", "상태", "본부장", "에이전시", "크리에이터", "소속 총 발생", "지사 5%", "최근 변경"].map((h)=><th key={h} className="border-b border-zinc-200 px-4 py-3">{h}</th>)}</tr></thead><tbody>{rows.length===0?<Empty/>:rows.map((item)=><tr key={item.branchId} className="border-b border-zinc-100 last:border-0"><Td strong>{item.name}</Td><Td small>{item.branchId}</Td><Td>{item.status}</Td><Td small>{item.headIds.join(", ") || "-"}</Td><Td>{item.agencies}개</Td><Td>{item.creators}명</Td><Td strong>{item.gross.toLocaleString()} FLAT</Td><Td strong>{item.share.toLocaleString()} FLAT</Td><Td small>{new Date(item.updatedAt).toLocaleString("ko-KR")}</Td></tr>)}</tbody></table></div>
      </main>
    );
  } catch (error) { if (error instanceof AuthenticationError || error instanceof AuthorizationError) redirect("/"); throw error; }
}
function Header(){return <div><div className="text-[10px] font-black tracking-[0.18em] text-zinc-400">BRANCH</div><h1 className="mt-1 text-2xl font-black">지사장 관리</h1><p className="mt-2 text-sm text-zinc-500">지사별 에이전시·크리에이터와 정산 현황을 관리합니다. 지사 정산 배분은 5%입니다.</p></div>}
function Stat({label,value}:{label:string;value:string}){return <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4"><div className="text-xs font-bold text-zinc-400">{label}</div><div className="mt-2 text-xl font-black">{value}</div></div>}
function Td({children,strong=false,small=false}:{children:React.ReactNode;strong?:boolean;small?:boolean}){return <td className={`px-4 py-4 ${strong?"font-black":""} ${small?"text-xs text-zinc-500":""}`}>{children}</td>}
function Empty(){return <tr><td colSpan={9} className="py-10 text-center text-zinc-500">등록된 지사가 없습니다.</td></tr>}
