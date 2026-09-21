import { redirect } from "next/navigation";
import { getAgencyAccessSession } from "@/lib/agency/access-authorization";
import { agencyPortalPathForScope } from "@/lib/agency/access-session";
import { listAllSettlementAffiliations } from "@/lib/settlement/affiliation-store";
import { listAllSettlementRecords } from "@/lib/settlement/record-store";
import PortalLogoutButton from "../PortalLogoutButton";

export const dynamic = "force-dynamic";

export default async function BranchPortalPage() {
  const session = await getAgencyAccessSession();
  if (!session) redirect("/agency-portal");
  if (session.scopeType !== "BRANCH") redirect(agencyPortalPathForScope(session.scopeType));
  const [data, allRecords] = await Promise.all([listAllSettlementAffiliations(), listAllSettlementRecords()]);
  const creators = data.creators.filter((item) => item.branchId === session.scopeId);
  const agencies = data.agencies.filter((item) => item.branchId === session.scopeId || creators.some((creator) => creator.agencyId === item.agencyId));
  const records = allRecords.filter((item) => item.branchId === session.scopeId);
  const gross = records.reduce((sum, item) => sum + item.grossAmount, 0);
  const share = records.reduce((sum, item) => sum + item.branchAmount, 0);
  return <main className="min-h-screen bg-[#f5f6f8] p-4 text-zinc-950 md:p-6"><div className="mx-auto max-w-6xl"><div className="mb-4 flex items-center justify-between"><div><div className="text-[10px] font-black tracking-[0.18em] text-zinc-400">FLATLIVE PARTNER</div><h1 className="mt-1 text-2xl font-black">지사장 전용</h1><p className="mt-1 text-sm text-zinc-500">{session.label} · 본인 지사 아래 에이전시와 크리에이터만 표시됩니다.</p></div><PortalLogoutButton /></div><div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm md:p-6"><div className="grid grid-cols-2 gap-3 md:grid-cols-4"><Stat label="에이전시" value={`${agencies.length}개`} /><Stat label="크리에이터" value={`${creators.length}명`} /><Stat label="소속 총 발생" value={`${gross.toLocaleString()} FLAT`} /><Stat label="지사 정산 5%" value={`${share.toLocaleString()} FLAT`} /></div><div className="mt-5 overflow-x-auto rounded-2xl border border-zinc-200"><table className="min-w-[900px] w-full text-sm"><thead className="bg-zinc-50 text-left text-xs text-zinc-500"><tr>{["에이전시","에이전시 ID","크리에이터","총 발생","에이전시 정산 10%"].map((h)=><th key={h} className="px-4 py-3">{h}</th>)}</tr></thead><tbody>{agencies.length===0?<tr><td colSpan={5} className="py-8 text-center text-zinc-400">소속 에이전시가 없습니다.</td></tr>:agencies.map((a)=>{const cs=creators.filter((c)=>c.agencyId===a.agencyId);const rs=records.filter((r)=>r.agencyId===a.agencyId);return <tr key={a.agencyId} className="border-t border-zinc-100"><td className="px-4 py-3 font-black">{a.name}</td><td className="px-4 py-3 text-xs text-zinc-500">{a.agencyId}</td><td className="px-4 py-3">{cs.length}명</td><td className="px-4 py-3 font-black">{rs.reduce((s,r)=>s+r.grossAmount,0).toLocaleString()} FLAT</td><td className="px-4 py-3">{rs.reduce((s,r)=>s+r.agencyAmount,0).toLocaleString()} FLAT</td></tr>})}</tbody></table></div><CreatorRows creators={creators} records={records} /></div></div></main>;
}
function Stat({label,value}:{label:string;value:string}){return <div className="rounded-2xl bg-zinc-50 p-4"><div className="text-xs font-bold text-zinc-400">{label}</div><div className="mt-2 text-lg font-black">{value}</div></div>}
function CreatorRows({creators,records}:{creators:{creatorUserId:string;agencyId:string}[];records:{creatorUserId:string;grossAmount:number;creatorAmount:number}[]}){return <div className="mt-5 overflow-x-auto rounded-2xl border border-zinc-200"><div className="border-b border-zinc-200 px-4 py-3 font-black">소속 크리에이터</div><table className="min-w-[700px] w-full text-sm"><thead className="bg-zinc-50 text-left text-xs text-zinc-500"><tr>{["크리에이터 ID","에이전시","총 발생","크리에이터 정산"].map((h)=><th key={h} className="px-4 py-3">{h}</th>)}</tr></thead><tbody>{creators.length===0?<tr><td colSpan={4} className="py-8 text-center text-zinc-400">소속 크리에이터가 없습니다.</td></tr>:creators.map((c)=>{const rs=records.filter((r)=>r.creatorUserId===c.creatorUserId);return <tr key={c.creatorUserId} className="border-t border-zinc-100"><td className="px-4 py-3 font-bold">{c.creatorUserId}</td><td className="px-4 py-3">{c.agencyId}</td><td className="px-4 py-3 font-black">{rs.reduce((s,r)=>s+r.grossAmount,0).toLocaleString()} FLAT</td><td className="px-4 py-3">{rs.reduce((s,r)=>s+r.creatorAmount,0).toLocaleString()} FLAT</td></tr>})}</tbody></table></div>}
