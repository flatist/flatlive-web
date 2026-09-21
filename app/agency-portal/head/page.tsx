import { redirect } from "next/navigation";
import { getAgencyAccessSession } from "@/lib/agency/access-authorization";
import { agencyPortalPathForScope } from "@/lib/agency/access-session";
import { listAllSettlementAffiliations } from "@/lib/settlement/affiliation-store";
import { listAllSettlementRecords } from "@/lib/settlement/record-store";
import PortalLogoutButton from "../PortalLogoutButton";

export const dynamic = "force-dynamic";

export default async function HeadPortalPage() {
  const session = await getAgencyAccessSession();
  if (!session) redirect("/agency-portal");
  if (session.scopeType !== "HEAD") redirect(agencyPortalPathForScope(session.scopeType));
  const [data, allRecords] = await Promise.all([listAllSettlementAffiliations(), listAllSettlementRecords()]);
  const creators = data.creators.filter((item) => item.headManagerUserId === session.scopeId);
  const branches = data.branches.filter((item) => item.headManagerUserId === session.scopeId || creators.some((creator) => creator.branchId === item.branchId));
  const branchIds = new Set(branches.map((item) => item.branchId));
  const agencies = data.agencies.filter((item) => item.headManagerUserId === session.scopeId || (item.branchId ? branchIds.has(item.branchId) : false) || creators.some((creator) => creator.agencyId === item.agencyId));
  const records = allRecords.filter((item) => item.headManagerUserId === session.scopeId);
  const gross = records.reduce((sum, item) => sum + item.grossAmount, 0);
  const share = records.reduce((sum, item) => sum + item.headManagerAmount, 0);
  return <PortalShell title="본부장 전용" label={session.label} logout={<PortalLogoutButton />}>
    <Stats items={[["지사", `${branches.length}개`], ["에이전시", `${agencies.length}개`], ["크리에이터", `${creators.length}명`], ["소속 총 발생", `${gross.toLocaleString()} FLAT`], ["본부장 정산 5%", `${share.toLocaleString()} FLAT`]]} />
    <section className="mt-5 grid gap-4 xl:grid-cols-2"><SimpleTable title="내 지사" headers={["지사명", "지사 ID"]} rows={branches.map((x) => [x.name, x.branchId])} /><SimpleTable title="내 에이전시" headers={["에이전시명", "에이전시 ID"]} rows={agencies.map((x) => [x.name, x.agencyId])} /></section>
    <CreatorTable creators={creators} records={records} />
  </PortalShell>;
}

function PortalShell({ title, label, logout, children }: { title: string; label: string; logout: React.ReactNode; children: React.ReactNode }) { return <main className="min-h-screen bg-[#f5f6f8] p-4 text-zinc-950 md:p-6"><div className="mx-auto max-w-7xl"><div className="mb-4 flex items-center justify-between"><div><div className="text-[10px] font-black tracking-[0.18em] text-zinc-400">FLATLIVE PARTNER</div><h1 className="mt-1 text-2xl font-black">{title}</h1><p className="mt-1 text-sm text-zinc-500">{label} · 본인 하위 조직만 표시됩니다.</p></div>{logout}</div><div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm md:p-6">{children}</div></div></main>; }
function Stats({ items }: { items: [string,string][] }) { return <div className="grid grid-cols-2 gap-3 md:grid-cols-5">{items.map(([label,value]) => <div key={label} className="rounded-2xl bg-zinc-50 p-4"><div className="text-xs font-bold text-zinc-400">{label}</div><div className="mt-2 text-lg font-black">{value}</div></div>)}</div>; }
function SimpleTable({ title, headers, rows }: { title: string; headers: string[]; rows: string[][] }) { return <div className="rounded-2xl border border-zinc-200"><div className="border-b border-zinc-200 px-4 py-3 font-black">{title}</div><table className="w-full text-sm"><thead className="bg-zinc-50 text-left text-xs text-zinc-500"><tr>{headers.map((h) => <th key={h} className="px-4 py-2">{h}</th>)}</tr></thead><tbody>{rows.length === 0 ? <tr><td colSpan={headers.length} className="py-8 text-center text-zinc-400">데이터 없음</td></tr> : rows.map((r,i) => <tr key={i} className="border-t border-zinc-100">{r.map((v,j) => <td key={j} className="px-4 py-3">{v}</td>)}</tr>)}</tbody></table></div>; }
function CreatorTable({ creators, records }: { creators: { creatorUserId: string; branchId: string; agencyId: string }[]; records: { creatorUserId: string; grossAmount: number; creatorAmount: number }[] }) { return <div className="mt-5 overflow-x-auto rounded-2xl border border-zinc-200"><div className="border-b border-zinc-200 px-4 py-3 font-black">소속 크리에이터</div><table className="min-w-[760px] w-full text-sm"><thead className="bg-zinc-50 text-left text-xs text-zinc-500"><tr>{["크리에이터 ID","지사","에이전시","총 발생","크리에이터 정산"].map((h)=><th key={h} className="px-4 py-3">{h}</th>)}</tr></thead><tbody>{creators.length===0?<tr><td colSpan={5} className="py-8 text-center text-zinc-400">소속 크리에이터가 없습니다.</td></tr>:creators.map((c)=>{const rs=records.filter((r)=>r.creatorUserId===c.creatorUserId);return <tr key={c.creatorUserId} className="border-t border-zinc-100"><td className="px-4 py-3 font-bold">{c.creatorUserId}</td><td className="px-4 py-3">{c.branchId}</td><td className="px-4 py-3">{c.agencyId}</td><td className="px-4 py-3 font-black">{rs.reduce((s,r)=>s+r.grossAmount,0).toLocaleString()} FLAT</td><td className="px-4 py-3">{rs.reduce((s,r)=>s+r.creatorAmount,0).toLocaleString()} FLAT</td></tr>})}</tbody></table></div>; }
