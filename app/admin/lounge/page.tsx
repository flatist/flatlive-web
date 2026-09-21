import { redirect } from "next/navigation";
import {
  AuthenticationError,
  AuthorizationError,
  requirePermission,
} from "@/lib/auth/authorization";
import { listAllLoungeMemberships } from "@/lib/lounge/lounge-membership-store";
import { HybridUserRepository } from "@/lib/repositories/hybrid-user-repository";

export const dynamic = "force-dynamic";

export default async function AdminLoungePage() {
  try {
    await requirePermission("MEMBER_READ");
    const memberships = listAllLoungeMemberships();
    const users = await new HybridUserRepository().findAll();
    const userMap = new Map(users.map((user) => [user.id, user]));

    const active = memberships.filter((item) => item.status === "ACTIVE").length;
    const canceled = memberships.filter((item) => item.status === "CANCELED").length;
    const expired = memberships.filter((item) => item.status === "EXPIRED").length;

    return (
      <main className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm md:p-6">
        <div className="text-[10px] font-black tracking-[0.18em] text-zinc-400">FLAT LOUNGE</div>
        <h1 className="mt-1 text-2xl font-black">라운지 관리</h1>
        <p className="mt-2 text-sm text-zinc-500">현재 라운지 가입 현황을 확인합니다. 상품 가격·결제·자동갱신 정책은 라운지 본 개발 단계에서 연결합니다.</p>

        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="전체 가입 기록" value={memberships.length} />
          <Stat label="이용 중" value={active} />
          <Stat label="취소" value={canceled} />
          <Stat label="만료" value={expired} />
        </div>

        <div className="mt-5 overflow-x-auto rounded-2xl border border-zinc-200">
          <table className="min-w-[900px] w-full border-collapse text-sm">
            <thead className="bg-zinc-50 text-left text-xs text-zinc-500"><tr>{["회원", "상태", "시작일", "만료일", "최근 변경", "회원 ID"].map((title) => <th key={title} className="border-b border-zinc-200 px-4 py-3">{title}</th>)}</tr></thead>
            <tbody>
              {memberships.length === 0 ? <tr><td colSpan={6} className="py-10 text-center text-zinc-500">라운지 가입 기록이 없습니다.</td></tr> : memberships.map((item) => {
                const user = userMap.get(item.userId);
                return (
                  <tr key={item.id} className="border-b border-zinc-100 last:border-0">
                    <td className="px-4 py-4"><div className="font-black">{user?.displayName || user?.username || "회원"}</div><div className="text-xs text-zinc-400">{user?.email || "-"}</div></td>
                    <td className="px-4 py-4"><span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-black">{statusLabel(item.status)}</span></td>
                    <td className="px-4 py-4 text-xs text-zinc-500">{new Date(item.startedAt).toLocaleString("ko-KR")}</td>
                    <td className="px-4 py-4 text-xs text-zinc-500">{new Date(item.expiresAt).toLocaleString("ko-KR")}</td>
                    <td className="px-4 py-4 text-xs text-zinc-500">{new Date(item.updatedAt).toLocaleString("ko-KR")}</td>
                    <td className="px-4 py-4 text-xs text-zinc-400">{item.userId}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </main>
    );
  } catch (error) {
    if (error instanceof AuthenticationError || error instanceof AuthorizationError) redirect("/");
    throw error;
  }
}

function statusLabel(status: "ACTIVE" | "EXPIRED" | "CANCELED") {
  if (status === "ACTIVE") return "이용 중";
  if (status === "EXPIRED") return "만료";
  return "취소";
}

function Stat({ label, value }: { label: string; value: number }) {
  return <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4"><div className="text-xs font-bold text-zinc-400">{label}</div><div className="mt-2 text-2xl font-black">{value.toLocaleString()}</div></div>;
}
