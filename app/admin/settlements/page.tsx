"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Status = "CALCULATED" | "PENDING" | "APPROVED" | "PAID" | "HOLD" | "CANCELLED";
type RecordItem = {
  settlementId: string;
  creatorUserId: string;
  grossAmount: number;
  affiliation: "AGENCY" | "INDEPENDENT";
  agencyId?: string | null;
  branchId?: string | null;
  creatorAmount: number;
  agencyAmount: number;
  branchAmount: number;
  headManagerAmount: number;
  companyAmount: number;
  sourceType: string;
  status: Status;
  createdAt: string;
};

const labels: Record<Status, string> = {
  CALCULATED: "계산완료",
  PENDING: "신청대기",
  APPROVED: "승인",
  PAID: "지급완료",
  HOLD: "보류",
  CANCELLED: "취소",
};

export default function AdminSettlementsPage() {
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [filter, setFilter] = useState<"ALL" | Status>("ALL");
  const [busy, setBusy] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/settlements", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || "정산 내역을 불러오지 못했습니다.");
      setRecords(Array.isArray(data.records) ? data.records : []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "정산 내역을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const visible = useMemo(() => filter === "ALL" ? records : records.filter((item) => item.status === filter), [records, filter]);
  const pendingAmount = records.filter((item) => item.status === "PENDING" || item.status === "APPROVED").reduce((sum, item) => sum + item.creatorAmount, 0);

  async function changeStatus(item: RecordItem, status: Status) {
    setBusy(item.settlementId);
    setMessage("");
    try {
      const response = await fetch("/api/admin/settlements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settlementId: item.settlementId, status }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || "정산 처리에 실패했습니다.");
      setMessage(`${labels[status]} 처리했습니다.`);
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "정산 처리에 실패했습니다.");
    } finally {
      setBusy("");
    }
  }

  return (
    <main className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm md:p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="text-[10px] font-black tracking-[0.18em] text-zinc-400">SETTLEMENT</div>
          <h1 className="mt-1 text-2xl font-black">정산 관리</h1>
          <p className="mt-2 text-sm text-zinc-500">크리에이터 정산 신청과 지급 상태를 관리합니다. 1 FLAT = 100원 정책을 기준으로 합니다.</p>
        </div>
        <button onClick={() => void load()} className="rounded-xl bg-zinc-950 px-4 py-2.5 text-xs font-black text-white">새로고침</button>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="전체 정산" value={`${records.length.toLocaleString()}건`} />
        <Stat label="신청 대기" value={`${records.filter((item) => item.status === "PENDING").length.toLocaleString()}건`} />
        <Stat label="승인 대기 금액" value={`${pendingAmount.toLocaleString()} FLAT`} />
        <Stat label="지급 완료" value={`${records.filter((item) => item.status === "PAID").length.toLocaleString()}건`} />
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {(["ALL", "CALCULATED", "PENDING", "APPROVED", "PAID", "HOLD", "CANCELLED"] as const).map((value) => (
          <button key={value} onClick={() => setFilter(value)} className={`rounded-full px-3 py-2 text-xs font-black ${filter === value ? "bg-zinc-950 text-white" : "bg-zinc-100 text-zinc-600"}`}>
            {value === "ALL" ? "전체" : labels[value]}
          </button>
        ))}
      </div>

      {message && <div className="mt-4 rounded-xl bg-zinc-100 px-4 py-3 text-sm font-bold text-zinc-700">{message}</div>}

      <div className="mt-5 overflow-x-auto rounded-2xl border border-zinc-200">
        <table className="min-w-[1200px] w-full border-collapse text-sm">
          <thead className="bg-zinc-50 text-left text-xs text-zinc-500"><tr>{["정산 ID", "크리에이터", "구분", "총 발생", "크리에이터", "기타 배분", "출처", "상태", "처리"].map((title, index) => <th key={`${title}-${index}`} className="border-b border-zinc-200 px-4 py-3">{title}</th>)}</tr></thead>
          <tbody>
            {loading && records.length === 0 ? <tr><td colSpan={9} className="py-10 text-center text-zinc-500">불러오는 중...</td></tr> : visible.length === 0 ? <tr><td colSpan={9} className="py-10 text-center text-zinc-500">정산 내역이 없습니다.</td></tr> : visible.map((item) => (
              <tr key={item.settlementId} className="border-b border-zinc-100 last:border-0">
                <td className="px-4 py-4 text-xs"><div className="max-w-[170px] truncate font-bold">{item.settlementId}</div><div className="mt-1 text-zinc-400">{new Date(item.createdAt).toLocaleString("ko-KR")}</div></td>
                <td className="px-4 py-4"><div className="max-w-[160px] truncate font-bold">{item.creatorUserId}</div></td>
                <td className="px-4 py-4">{item.affiliation === "AGENCY" ? "에이전시" : "무소속"}</td>
                <td className="px-4 py-4 font-black">{item.grossAmount.toLocaleString()} FLAT</td>
                <td className="px-4 py-4 font-black text-emerald-700">{item.creatorAmount.toLocaleString()} FLAT</td>
                <td className="px-4 py-4 text-xs text-zinc-500">에이전시 {item.agencyAmount.toLocaleString()} / 지사 {item.branchAmount.toLocaleString()} / 본부장 {item.headManagerAmount.toLocaleString()} / 본사 {item.companyAmount.toLocaleString()}</td>
                <td className="px-4 py-4 text-xs">{item.sourceType}</td>
                <td className="px-4 py-4"><span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-black">{labels[item.status]}</span></td>
                <td className="px-4 py-4"><div className="flex flex-wrap gap-1.5">{nextStatuses(item.status).map((status) => <button key={status} disabled={busy === item.settlementId} onClick={() => void changeStatus(item, status)} className="rounded-lg border border-zinc-200 px-2.5 py-1.5 text-[11px] font-black disabled:opacity-40">{labels[status]}</button>)}</div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}

function nextStatuses(status: Status): Status[] {
  switch (status) {
    case "CALCULATED": return ["PENDING", "CANCELLED"];
    case "PENDING": return ["APPROVED", "HOLD", "CANCELLED"];
    case "APPROVED": return ["PAID", "HOLD", "CANCELLED"];
    case "HOLD": return ["PENDING", "APPROVED", "CANCELLED"];
    default: return [];
  }
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4"><div className="text-xs font-bold text-zinc-400">{label}</div><div className="mt-2 text-xl font-black">{value}</div></div>;
}
