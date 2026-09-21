import { redirect } from "next/navigation";
import { AuthenticationError, AuthorizationError, requirePermission } from "@/lib/auth/authorization";
import { listAllSettlementAffiliations } from "@/lib/settlement/affiliation-store";
import { listAllSettlementRecords } from "@/lib/settlement/record-store";
import OrganizationRegistrationClient from "../OrganizationRegistrationClient";

export const dynamic = "force-dynamic";

export default async function AdminAgencyPage() {
  try {
    await requirePermission("SETTLEMENT_READ");
    const [data, records] = await Promise.all([listAllSettlementAffiliations(), listAllSettlementRecords()]);
    const rows = data.agencies.map((agency) => {
      const creators = data.creators.filter((item) => item.agencyId === agency.agencyId);
      const branchIds = new Set([...(agency.branchId ? [agency.branchId] : []), ...creators.map((item) => item.branchId)]);
      const headIds = new Set([...(agency.headManagerUserId ? [agency.headManagerUserId] : []), ...creators.map((item) => item.headManagerUserId)]);
      const settlement = records.filter((item) => item.agencyId === agency.agencyId);
      return { ...agency, branchIds: Array.from(branchIds), headIds: Array.from(headIds), creators: creators.length, gross: settlement.reduce((sum, item) => sum + item.grossAmount, 0), share: settlement.reduce((sum, item) => sum + item.agencyAmount, 0) };
    });
    return (
      <main className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm md:p-6">
        <Header />
        <OrganizationRegistrationClient mode="AGENCY" />
        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4"><Stat label="에이전시" value={`${rows.length}개`} /><Stat label="소속 크리에이터" value={`${data.creators.length}명`} /><Stat label="소속 총 발생" value={`${rows.reduce((s,x)=>s+x.gross,0).toLocaleString()} FLAT`} /><Stat label="에이전시 누적 정산" value={`${rows.reduce((s,x)=>s+x.share,0).toLocaleString()} FLAT`} /></div>
        <div className="mt-5 overflow-x-auto rounded-2xl border border-zinc-200"><table className="min-w-[1100px] w-full border-collapse text-sm"><thead className="bg-zinc-50 text-left text-xs text-zinc-500"><tr>{["에이전시명", "에이전시 ID", "상태", "본부장", "지사", "크리에이터", "소속 총 발생", "에이전시 10%", "최근 변경"].map((h)=><th key={h} className="border-b border-zinc-200 px-4 py-3">{h}</th>)}</tr></thead><tbody>{rows.length===0?<Empty/>:rows.map((item)=><tr key={item.agencyId} className="border-b border-zinc-100 last:border-0"><Td strong>{item.name}</Td><Td small>{item.agencyId}</Td><Td>{item.status}</Td><Td small>{item.headIds.join(", ") || "-"}</Td><Td small>{item.branchIds.join(", ") || "-"}</Td><Td>{item.creators}명</Td><Td strong>{item.gross.toLocaleString()} FLAT</Td><Td strong>{item.share.toLocaleString()} FLAT</Td><Td small>{new Date(item.updatedAt).toLocaleString("ko-KR")}</Td></tr>)}</tbody></table></div>
      </main>
    );
  } catch (error) { if (error instanceof AuthenticationError || error instanceof AuthorizationError) redirect("/"); throw error; }
}
function Header(){return <div><div className="text-[10px] font-black tracking-[0.18em] text-zinc-400">AGENCY</div><h1 className="mt-1 text-2xl font-black">에이전시 관리</h1><p className="mt-2 text-sm text-zinc-500">에이전시별 소속 크리에이터와 정산 현황을 관리합니다. 에이전시 정산 배분은 10%입니다.</p></div>}
function Stat({label,value}:{label:string;value:string}){return <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4"><div className="text-xs font-bold text-zinc-400">{label}</div><div className="mt-2 text-xl font-black">{value}</div></div>}
function Td({children,strong=false,small=false}:{children:React.ReactNode;strong?:boolean;small?:boolean}){return <td className={`px-4 py-4 ${strong?"font-black":""} ${small?"text-xs text-zinc-500":""}`}>{children}</td>}
function Empty(){return <tr><td colSpan={9} className="py-10 text-center text-zinc-500">등록된 에이전시가 없습니다.</td></tr>}
