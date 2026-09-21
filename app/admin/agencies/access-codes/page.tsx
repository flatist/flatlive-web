"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

type ScopeType = "HEAD" | "BRANCH" | "AGENCY";
type Target = { scopeType: ScopeType; scopeId: string; label: string };
type RecordItem = { accessId: string; scopeType: ScopeType; scopeId: string; label: string; status: "ACTIVE" | "DISABLED"; updatedAt: string };

const SCOPE_LABEL: Record<ScopeType, string> = { HEAD: "본부장", BRANCH: "지사장", AGENCY: "에이전시" };

export default function AgencyAccessCodesAdminPage() {
  const [targets, setTargets] = useState<Target[]>([]);
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [scopeType, setScopeType] = useState<ScopeType>("HEAD");
  const [scopeId, setScopeId] = useState("");
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/agencies/access-codes", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || "접속코드 정보를 불러오지 못했습니다.");
      setTargets(Array.isArray(data.targets) ? data.targets : []);
      setRecords(Array.isArray(data.records) ? data.records : []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "접속코드 정보를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const visibleTargets = useMemo(() => targets.filter((item) => item.scopeType === scopeType), [targets, scopeType]);
  useEffect(() => {
    if (!visibleTargets.some((item) => item.scopeId === scopeId)) setScopeId(visibleTargets[0]?.scopeId || "");
  }, [visibleTargets, scopeId]);

  async function save(event: FormEvent) {
    event.preventDefault();
    const target = targets.find((item) => item.scopeType === scopeType && item.scopeId === scopeId);
    if (!target || busy) return;
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/admin/agencies/access-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "SET", scopeType, scopeId, label: target.label, code }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || "접속코드 저장에 실패했습니다.");
      setCode("");
      setMessage(`${target.label} 접속코드를 저장했습니다. 기존 코드는 즉시 사용할 수 없습니다.`);
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "접속코드 저장에 실패했습니다.");
    } finally { setBusy(false); }
  }

  async function disable(accessId: string) {
    if (busy || !window.confirm("이 조직의 접속코드를 비활성화할까요?")) return;
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/admin/agencies/access-codes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "DISABLE", accessId }) });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || "비활성화에 실패했습니다.");
      setMessage("접속코드를 비활성화했습니다.");
      await load();
    } catch (error) { setMessage(error instanceof Error ? error.message : "비활성화에 실패했습니다."); }
    finally { setBusy(false); }
  }

  return (
    <main className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm md:p-6">
      <div className="text-[10px] font-black tracking-[0.18em] text-zinc-400">ORGANIZATION ACCESS</div>
      <h1 className="mt-1 text-2xl font-black">조직 접속코드 관리</h1>
      <p className="mt-2 text-sm text-zinc-500">본부장 · 지사장 · 에이전시에 각각 전용 코드를 부여합니다. 코드는 저장 후 다시 표시하지 않습니다.</p>

      <form onSubmit={save} className="mt-5 grid gap-3 rounded-2xl bg-zinc-50 p-4 md:grid-cols-[150px_1fr_1fr_auto]">
        <select value={scopeType} onChange={(e) => setScopeType(e.target.value as ScopeType)} className="h-11 rounded-xl border border-zinc-200 bg-white px-3 text-sm font-bold">
          <option value="HEAD">본부장</option><option value="BRANCH">지사장</option><option value="AGENCY">에이전시</option>
        </select>
        <select value={scopeId} onChange={(e) => setScopeId(e.target.value)} className="h-11 rounded-xl border border-zinc-200 bg-white px-3 text-sm">
          {visibleTargets.length === 0 ? <option value="">등록된 대상 없음</option> : visibleTargets.map((item) => <option key={`${item.scopeType}:${item.scopeId}`} value={item.scopeId}>{item.label} · {item.scopeId}</option>)}
        </select>
        <input value={code} onChange={(e) => setCode(e.target.value)} type="password" autoComplete="new-password" placeholder="새 접속코드 (6자 이상)" className="h-11 rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-zinc-500" />
        <button disabled={busy || !scopeId || code.trim().length < 6} className="h-11 rounded-xl bg-zinc-950 px-5 text-sm font-black text-white disabled:opacity-40">{busy ? "저장 중..." : "코드 저장"}</button>
      </form>

      <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-bold text-amber-800">조직 담당자에게는 접속 주소 <span className="font-black">/agency-portal</span> 과 해당 코드를 전달하면 됩니다.</div>
      {message && <div className="mt-4 rounded-xl bg-zinc-100 px-4 py-3 text-sm font-bold text-zinc-700">{message}</div>}

      <div className="mt-5 overflow-x-auto rounded-2xl border border-zinc-200">
        <table className="min-w-[850px] w-full border-collapse text-sm">
          <thead className="bg-zinc-50 text-left text-xs text-zinc-500"><tr>{["구분", "조직", "조직 ID", "상태", "최근 변경", "관리"].map((h) => <th key={h} className="border-b border-zinc-200 px-4 py-3">{h}</th>)}</tr></thead>
          <tbody>{loading && records.length === 0 ? <tr><td colSpan={6} className="py-10 text-center text-zinc-500">불러오는 중...</td></tr> : records.length === 0 ? <tr><td colSpan={6} className="py-10 text-center text-zinc-500">등록된 접속코드가 없습니다.</td></tr> : records.map((item) => <tr key={item.accessId} className="border-b border-zinc-100 last:border-0"><td className="px-4 py-4 font-black">{SCOPE_LABEL[item.scopeType]}</td><td className="px-4 py-4 font-bold">{item.label}</td><td className="px-4 py-4 text-xs text-zinc-500">{item.scopeId}</td><td className="px-4 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-black ${item.status === "ACTIVE" ? "bg-emerald-100 text-emerald-700" : "bg-zinc-100 text-zinc-500"}`}>{item.status}</span></td><td className="px-4 py-4 text-xs text-zinc-500">{new Date(item.updatedAt).toLocaleString("ko-KR")}</td><td className="px-4 py-4"><button disabled={busy || item.status !== "ACTIVE"} onClick={() => void disable(item.accessId)} className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-bold disabled:opacity-40">비활성화</button></td></tr>)}</tbody>
        </table>
      </div>
    </main>
  );
}
