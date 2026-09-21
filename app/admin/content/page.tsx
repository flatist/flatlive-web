import { redirect } from "next/navigation";
import {
  AuthenticationError,
  AuthorizationError,
  requirePermission,
} from "@/lib/auth/authorization";
import { readFlits } from "@/lib/flit/flit-store";
import { readVods } from "@/lib/vod/vod-store";

export const dynamic = "force-dynamic";

export default async function AdminContentPage() {
  try {
    await requirePermission("REPORT_READ");
    const [flits, vods] = await Promise.all([readFlits(), readVods()]);
    const adultCount = [...flits, ...vods].filter((item) => item.isAdult).length;
    const privateCount = [...flits, ...vods].filter((item) => item.visibility === "private").length;

    return (
      <main className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm md:p-6">
        <div className="text-[10px] font-black tracking-[0.18em] text-zinc-400">CONTENT CONTROL</div>
        <h1 className="mt-1 text-2xl font-black">콘텐츠 관리</h1>
        <p className="mt-2 text-sm text-zinc-500">FLIT · VOD 게시 상태와 연령 표시를 확인합니다. 삭제/제재는 신고 처리 정책과 연결해 운영합니다.</p>

        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="FLIT" value={flits.length} />
          <Stat label="VOD" value={vods.length} />
          <Stat label="19+" value={adultCount} />
          <Stat label="비공개" value={privateCount} />
        </div>

        <section className="mt-6">
          <h2 className="text-base font-black">최근 콘텐츠</h2>
          <div className="mt-3 overflow-x-auto rounded-2xl border border-zinc-200">
            <table className="min-w-[1000px] w-full border-collapse text-sm">
              <thead className="bg-zinc-50 text-left text-xs text-zinc-500"><tr>{["종류", "제목", "작성자", "공개", "19+", "조회", "반응", "등록일"].map((title) => <th key={title} className="border-b border-zinc-200 px-4 py-3">{title}</th>)}</tr></thead>
              <tbody>
                {[...flits.map((item) => ({ ...item, kind: "FLIT" as const })), ...vods.map((item) => ({ ...item, kind: "VOD" as const }))]
                  .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
                  .slice(0, 100)
                  .map((item) => (
                    <tr key={`${item.kind}-${item.id}`} className="border-b border-zinc-100 last:border-0">
                      <td className="px-4 py-4"><span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-black">{item.kind}</span></td>
                      <td className="px-4 py-4"><div className="max-w-[280px] truncate font-black">{item.title || "제목 없음"}</div><div className="mt-1 max-w-[280px] truncate text-xs text-zinc-400">{item.id}</div></td>
                      <td className="px-4 py-4"><div className="font-bold">{item.displayName || item.username}</div><div className="text-xs text-zinc-400">@{item.username}</div></td>
                      <td className="px-4 py-4">{visibilityLabel(item.visibility)}</td>
                      <td className="px-4 py-4">{item.isAdult ? <span className="rounded bg-red-100 px-2 py-1 text-xs font-black text-red-600">19+</span> : "일반"}</td>
                      <td className="px-4 py-4 font-black">{Number(item.views || 0).toLocaleString()}</td>
                      <td className="px-4 py-4 text-xs text-zinc-500">♥ {Number(item.likes || 0).toLocaleString()} · 멋져요 {Number(item.greats || 0).toLocaleString()} · 최고 {Number(item.bests || 0).toLocaleString()}</td>
                      <td className="px-4 py-4 text-xs text-zinc-500">{new Date(item.createdAt).toLocaleString("ko-KR")}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    );
  } catch (error) {
    if (error instanceof AuthenticationError || error instanceof AuthorizationError) redirect("/");
    throw error;
  }
}

function visibilityLabel(value: "public" | "followers" | "private") {
  if (value === "public") return "전체 공개";
  if (value === "followers") return "팔로워";
  return "비공개";
}

function Stat({ label, value }: { label: string; value: number }) {
  return <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4"><div className="text-xs font-bold text-zinc-400">{label}</div><div className="mt-2 text-2xl font-black">{value.toLocaleString()}</div></div>;
}
