import { redirect } from "next/navigation";
import { AuthenticationError, AuthorizationError, requirePermission } from "@/lib/auth/authorization";
import { listAllSettlementAffiliations } from "@/lib/settlement/affiliation-store";
import { listAllSettlementRecords } from "@/lib/settlement/record-store";
import OrganizationRegistrationClient from "../OrganizationRegistrationClient";

export const dynamic = "force-dynamic";

export default async function AdminHeadManagersPage() {
  try {
    await requirePermission("SETTLEMENT_READ");
    const [data, records] = await Promise.all([listAllSettlementAffiliations(), listAllSettlementRecords()]);
    const rows = data.headManagers.map((head) => {
      const creators = data.creators.filter((item) => item.headManagerUserId === head.headManagerUserId);
      const branchIds = new Set([
        ...data.branches.filter((item) => item.headManagerUserId === head.headManagerUserId).map((item) => item.branchId),
        ...creators.map((item) => item.branchId),
      ]);
      const agencyIds = new Set([
        ...data.agencies.filter((item) => item.headManagerUserId === head.headManagerUserId).map((item) => item.agencyId),
        ...creators.map((item) => item.agencyId),
      ]);
      const settlement = records.filter((item) => item.headManagerUserId === head.headManagerUserId);
      return {
        ...head,
        branches: branchIds.size,
        agencies: agencyIds.size,
        creators: creators.length,
        gross: settlement.reduce((sum, item) => sum + item.grossAmount, 0),
        share: settlement.reduce((sum, item) => sum + item.headManagerAmount, 0),
      };
    });
    const totalShare = rows.reduce((sum, item) => sum + item.share, 0);

    return (
      <main className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm md:p-6">
        <Header eyebrow="HEAD MANAGER" title="본부장 관리" description="본부장 등록부터 하위 조직과 정산 현황까지 관리합니다. 본부장 정산 배분은 5%입니다." />
        <OrganizationRegistrationClient mode="HEAD" />
        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4"><Stat label="본부장" value={`${rows.length}명`} /><Stat label="연결 지사" value={`${data.branches.length}개`} /><Stat label="소속 크리에이터" value={`${data.creators.length}명`} /><Stat label="본부장 누적 정산" value={`${totalShare.toLocaleString()} FLAT`} /></div>
        <Table headers={["본부장명", "본부장 ID", "상태", "지사", "에이전시", "크리에이터", "소속 총 발생", "본부장 5%", "최근 변경"]}>
          {rows.length === 0 ? <Empty colSpan={9} text="등록된 본부장이 없습니다." /> : rows.map((item) => <tr key={item.headManagerUserId} className="border-b border-zinc-100 last:border-0"><Td strong>{item.name || item.headManagerUserId}</Td><Td small>{item.headManagerUserId}</Td><Td>{item.status}</Td><Td>{item.branches}개</Td><Td>{item.agencies}개</Td><Td>{item.creators}명</Td><Td strong>{item.gross.toLocaleString()} FLAT</Td><Td strong>{item.share.toLocaleString()} FLAT</Td><Td small>{new Date(item.updatedAt).toLocaleString("ko-KR")}</Td></tr>)}
        </Table>
      </main>
    );
  } catch (error) { if (error instanceof AuthenticationError || error instanceof AuthorizationError) redirect("/"); throw error; }
}

function Header({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) { return <div><div className="text-[10px] font-black tracking-[0.18em] text-zinc-400">{eyebrow}</div><h1 className="mt-1 text-2xl font-black">{title}</h1><p className="mt-2 text-sm text-zinc-500">{description}</p></div>; }
function Stat({ label, value }: { label: string; value: string }) { return <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4"><div className="text-xs font-bold text-zinc-400">{label}</div><div className="mt-2 text-xl font-black">{value}</div></div>; }
function Table({ headers, children }: { headers: string[]; children: React.ReactNode }) { return <div className="mt-5 overflow-x-auto rounded-2xl border border-zinc-200"><table className="min-w-[1050px] w-full border-collapse text-sm"><thead className="bg-zinc-50 text-left text-xs text-zinc-500"><tr>{headers.map((h) => <th key={h} className="border-b border-zinc-200 px-4 py-3">{h}</th>)}</tr></thead><tbody>{children}</tbody></table></div>; }
function Td({ children, strong = false, small = false }: { children: React.ReactNode; strong?: boolean; small?: boolean }) { return <td className={`px-4 py-4 ${strong ? "font-black" : ""} ${small ? "text-xs text-zinc-500" : ""}`}>{children}</td>; }
function Empty({ colSpan, text }: { colSpan: number; text: string }) { return <tr><td colSpan={colSpan} className="py-10 text-center text-zinc-500">{text}</td></tr>; }
