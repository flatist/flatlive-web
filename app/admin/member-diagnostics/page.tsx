"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";

type DonationItem = {
  donationId: string;
  status: string;
  amount: number | null;
  lastEventAt: string | null;
  errorMessages: string[];
};

type DiagnosticResult = {
  member: {
    id: string;
    username: string;
    email: string;
    displayName: string;
    role: string;
    createdAt: string;
  };
  generatedAt: string;
  summary: {
    level: "OK" | "WARN" | "ERROR";
    issueCount: number;
    warningCount: number;
    message: string;
  };
  wallet: {
    available: boolean;
    total: number;
    suspicious: number;
    transactions: Array<Record<string, unknown>>;
  };
  donations: {
    available: boolean;
    total: number;
    failed: number;
    requiresReview: number;
    items: DonationItem[];
  };
  audit: {
    available: boolean;
    total: number;
    failed: number;
    items: Array<{
      auditId: string;
      action: string;
      targetType: string;
      targetId: string;
      reason?: string;
      result: string;
      createdAt: string;
    }>;
  };
  login: { available: false; note: string };
  live: { available: false; note: string };
};

type TraceResult = {
  donationId: string;
  senderUserId: string | null;
  receiverUserId: string | null;
  amount: number | null;
  donationMode: string;
  status: string;
  requiresManualReview: boolean;
  events: Array<{
    eventId: string;
    eventType: string;
    createdAt: string;
    transactionId?: string;
    errorMessage?: string;
  }>;
};

function formatDate(value: unknown) {
  if (typeof value !== "string" || !value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("ko-KR");
}

function display(value: unknown) {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "number") return value.toLocaleString();
  return String(value);
}

function donationActionText(status: string) {
  if (status === "FAILED_REQUIRES_REVIEW") return "자동복구 실패 · 수동복구 가능";
  if (status === "FAILED_COMPENSATED") return "자동복구 완료 · 추가 지급 금지";
  if (status === "FAILED") return "실패 원인 확인 필요";
  if (status === "COMPLETED") return "정상 완료";
  return "처리 중";
}

export default function AdminMemberDiagnosticsPage() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<DiagnosticResult | null>(null);

  const [traceLoading, setTraceLoading] = useState("");
  const [trace, setTrace] = useState<TraceResult | null>(null);
  const [traceError, setTraceError] = useState("");

  const [recoveryDonationId, setRecoveryDonationId] = useState("");
  const [recoveryReason, setRecoveryReason] = useState("");
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState("");

  async function runDiagnostic(rawQuery = query) {
    const cleanQuery = rawQuery.trim();
    if (!cleanQuery) return;

    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `/api/admin/member-diagnostics?q=${encodeURIComponent(cleanQuery)}`,
        { cache: "no-store" },
      );
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "진단에 실패했습니다.");
      }
      setResult(data.result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "진단에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setResult(null);
    setActionMessage("");
    await runDiagnostic();
  }

  async function openTrace(donationId: string) {
    setTraceLoading(donationId);
    setTrace(null);
    setTraceError("");

    try {
      const response = await fetch(
        `/api/admin/donations/trace?donationId=${encodeURIComponent(donationId)}`,
        { cache: "no-store" },
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Trace 조회에 실패했습니다.");
      setTrace(data);
    } catch (err) {
      setTraceError(err instanceof Error ? err.message : "Trace 조회에 실패했습니다.");
    } finally {
      setTraceLoading("");
    }
  }

  function beginRecovery(donationId: string) {
    setRecoveryDonationId(donationId);
    setRecoveryReason("");
    setActionMessage("");
  }

  async function executeRecovery() {
    const reason = recoveryReason.trim();
    if (!recoveryDonationId || !reason) {
      setActionMessage("수동복구 사유를 입력해 주세요.");
      return;
    }

    const confirmed = window.confirm(
      `후원 ${recoveryDonationId}을 수동복구합니다.\n\n이 작업은 실제 FLAT 복구 거래를 생성합니다. 계속할까요?`,
    );
    if (!confirmed) return;

    setRecoveryLoading(true);
    setActionMessage("");

    try {
      const response = await fetch("/api/admin/donations/manual-recovery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ donationId: recoveryDonationId, reason }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "수동복구에 실패했습니다.");
      }

      const amount =
        typeof data.result?.amount === "number"
          ? `${data.result.amount.toLocaleString()} FLAT`
          : "해당 금액";

      setActionMessage(`수동복구 완료: ${amount} 복구 처리되었습니다. 진단 결과를 다시 불러왔습니다.`);
      setRecoveryDonationId("");
      setRecoveryReason("");
      await runDiagnostic(query);
    } catch (err) {
      setActionMessage(err instanceof Error ? `수동복구 실패: ${err.message}` : "수동복구에 실패했습니다.");
    } finally {
      setRecoveryLoading(false);
    }
  }

  return (
    <main className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-[10px] font-black tracking-[0.18em] text-zinc-400">MEMBER DIAGNOSTICS & RESOLUTION</div>
          <h1 className="mt-1 text-2xl font-black">회원 오류조회 · 해결센터</h1>
          <p className="mt-2 text-sm text-zinc-500">아이디로 문제를 찾고, 안전하게 처리 가능한 항목은 기존 복구 로직을 통해 바로 해결합니다.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/system-diagnostics" className="rounded-xl border border-zinc-200 px-4 py-2 text-sm font-bold text-zinc-600">시스템 진단·복구</Link>
          <Link href="/admin/members" className="rounded-xl border border-zinc-200 px-4 py-2 text-sm font-bold text-zinc-600">회원 관리</Link>
          <Link href="/admin/wallet" className="rounded-xl border border-zinc-200 px-4 py-2 text-sm font-bold text-zinc-600">지갑 관리</Link>
          <Link href="/admin/audit" className="rounded-xl border border-zinc-200 px-4 py-2 text-sm font-bold text-zinc-600">감사 로그</Link>
        </div>
      </div>

      <form onSubmit={submit} className="mt-5 flex flex-col gap-2 sm:flex-row">
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="회원 아이디 / 회원 ID / 이메일" className="min-w-0 flex-1 rounded-xl border border-zinc-300 px-4 py-3 text-sm outline-none focus:border-zinc-950" />
        <button disabled={loading || !query.trim()} className="rounded-xl bg-zinc-950 px-6 py-3 text-sm font-black text-white disabled:opacity-40">{loading ? "검사 중..." : "오류 찾기"}</button>
      </form>

      {error && <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">{error}</div>}
      {actionMessage && <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm font-bold text-blue-800">{actionMessage}</div>}

      {result && (
        <div className="mt-6 space-y-5">
          <section className={`rounded-2xl border p-5 ${result.summary.level === "ERROR" ? "border-red-200 bg-red-50" : result.summary.level === "WARN" ? "border-amber-200 bg-amber-50" : "border-emerald-200 bg-emerald-50"}`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-xs font-black">진단 결과 · {result.summary.level}</div>
                <div className="mt-1 text-lg font-black">{result.summary.message}</div>
                <div className="mt-2 text-sm text-zinc-600">오류/실패 {result.summary.issueCount}건 · 경고 {result.summary.warningCount}건 · 검사 {formatDate(result.generatedAt)}</div>
              </div>
              <button type="button" onClick={() => void runDiagnostic(query)} disabled={loading} className="rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm font-black disabled:opacity-40">다시 검사</button>
            </div>
          </section>

          <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <Card label="회원" value={`@${result.member.username}`} sub={`${result.member.displayName} · ${result.member.role}`} />
            <Card label="지갑 특이거래" value={result.wallet.available ? `${result.wallet.suspicious}건` : "권한 없음"} sub={`조회 ${result.wallet.total}건`} />
            <Card label="후원 실패" value={result.donations.available ? `${result.donations.failed}건` : "권한 없음"} sub={`수동검토 ${result.donations.requiresReview}건`} />
            <Card label="관리자 처리 실패" value={result.audit.available ? `${result.audit.failed}건` : "권한 없음"} sub={`관련 로그 ${result.audit.total}건`} />
          </section>

          <section className="rounded-2xl border border-zinc-200 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-black">회원 정보</h2><Link href="/admin/members" className="rounded-lg bg-zinc-100 px-3 py-2 text-xs font-black text-zinc-700">회원관리에서 조치</Link></div>
            <div className="mt-3 grid gap-2 text-sm md:grid-cols-2">
              <div>회원 ID: <b>{result.member.id}</b></div><div>아이디: <b>@{result.member.username}</b></div><div>이메일: {result.member.email}</div><div>가입일: {formatDate(result.member.createdAt)}</div>
            </div>
          </section>

          <section className="rounded-2xl border border-zinc-200 p-5">
            <div className="flex items-center justify-between gap-3"><h2 className="font-black">후원 오류/실패 · 해결</h2><span className="text-xs text-zinc-500">최근 최대 100건</span></div>
            {!result.donations.available ? <PermissionNotice /> : result.donations.items.length === 0 ? <Empty text="관련 후원 기록이 없습니다." /> : (
              <div className="mt-3 overflow-x-auto"><table className="min-w-[1050px] w-full text-sm"><thead><tr className="text-left text-xs text-zinc-400"><th className="py-2">후원 ID</th><th>상태</th><th>금액</th><th>최근 시각</th><th>오류메시지</th><th>해결</th></tr></thead><tbody>
                {result.donations.items.map((item) => <tr key={item.donationId} className="border-t border-zinc-100 align-top"><td className="py-3 font-mono text-xs">{item.donationId}</td><td><div className="font-bold">{item.status}</div><div className="mt-1 text-[11px] text-zinc-500">{donationActionText(item.status)}</div></td><td>{item.amount === null ? "-" : `${item.amount.toLocaleString()} FLAT`}</td><td>{formatDate(item.lastEventAt)}</td><td className="max-w-[300px] break-words text-red-600">{item.errorMessages.join(" / ") || "-"}</td><td><div className="flex flex-wrap gap-2"><button type="button" onClick={() => void openTrace(item.donationId)} disabled={traceLoading === item.donationId} className="rounded-lg border border-zinc-300 px-3 py-2 text-xs font-black disabled:opacity-40">{traceLoading === item.donationId ? "조회 중" : "Trace 보기"}</button>{item.status === "FAILED_REQUIRES_REVIEW" && <button type="button" onClick={() => beginRecovery(item.donationId)} className="rounded-lg bg-red-600 px-3 py-2 text-xs font-black text-white">수동 복구</button>}</div></td></tr>)}
              </tbody></table></div>
            )}
          </section>

          <section className="rounded-2xl border border-zinc-200 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-black">지갑/거래 이력</h2><p className="mt-1 text-xs text-zinc-500">HOLD · REVERSED · CANCELLED는 자동 표시합니다. 임의 잔액조정 버튼은 제공하지 않습니다.</p></div><Link href="/admin/wallet" className="rounded-lg bg-zinc-100 px-3 py-2 text-xs font-black text-zinc-700">지갑 관리 열기</Link></div>
            {!result.wallet.available ? <PermissionNotice /> : result.wallet.transactions.length === 0 ? <Empty text="관련 지갑 거래가 없습니다." /> : (
              <div className="mt-3 overflow-x-auto"><table className="min-w-[980px] w-full text-sm"><thead><tr className="text-left text-xs text-zinc-400"><th className="py-2">시각</th><th>상태</th><th>방향</th><th>금액</th><th>소스</th><th>거래 ID</th></tr></thead><tbody>{result.wallet.transactions.map((item, index) => <tr key={String(item.transactionId ?? index)} className="border-t border-zinc-100"><td className="py-3">{formatDate(item.createdAt)}</td><td className="font-bold">{display(item.status)}</td><td>{display(item.direction)}</td><td>{display(item.amount)} {display(item.assetType)}</td><td>{display(item.sourceType)} / {display(item.sourceId)}</td><td className="font-mono text-xs">{display(item.transactionId)}</td></tr>)}</tbody></table></div>
            )}
          </section>

          <section className="rounded-2xl border border-zinc-200 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-black">관리자 처리/감사 로그</h2><Link href="/admin/audit" className="rounded-lg bg-zinc-100 px-3 py-2 text-xs font-black text-zinc-700">전체 감사로그</Link></div>
            {!result.audit.available ? <PermissionNotice /> : result.audit.items.length === 0 ? <Empty text="관련 감사 로그가 없습니다." /> : (
              <div className="mt-3 overflow-x-auto"><table className="min-w-[850px] w-full text-sm"><thead><tr className="text-left text-xs text-zinc-400"><th className="py-2">시각</th><th>결과</th><th>작업</th><th>대상</th><th>사유</th></tr></thead><tbody>{result.audit.items.map((item) => <tr key={item.auditId} className="border-t border-zinc-100"><td className="py-3">{formatDate(item.createdAt)}</td><td className={item.result === "FAILED" ? "font-black text-red-600" : "font-bold"}>{item.result}</td><td>{item.action}</td><td>{item.targetType} / {item.targetId}</td><td>{item.reason || "-"}</td></tr>)}</tbody></table></div>
            )}
          </section>

          <section className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5 text-sm text-zinc-600"><div><b>로그인 오류:</b> {result.login.note}</div><div className="mt-2"><b>LIVE 연결 오류:</b> {result.live.note}</div><div className="mt-3 rounded-xl bg-white p-3 text-xs leading-5 text-zinc-500">저장된 전용 로그가 없는 항목은 이 화면에서 임의로 “해결됨” 처리하지 않습니다. 실제 로그 저장 기능이 추가되면 같은 해결센터에서 연결할 수 있습니다.</div></section>
        </div>
      )}

      {recoveryDonationId && <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/55 p-4"><div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl"><div className="text-xs font-black text-red-600">실제 자산 복구 작업</div><h3 className="mt-1 text-xl font-black">후원 수동복구</h3><p className="mt-2 text-sm text-zinc-600">자동 보상까지 실패한 후원만 기존 수동복구 서비스로 처리합니다. 같은 후원은 중복 복구할 수 없도록 서버가 다시 검사합니다.</p><div className="mt-4 rounded-xl bg-zinc-50 p-3 font-mono text-xs">{recoveryDonationId}</div><textarea value={recoveryReason} onChange={(event) => setRecoveryReason(event.target.value)} placeholder="처리 사유를 반드시 입력하세요. 예: 자동 보상 실패 Trace 확인 후 수동복구" rows={4} className="mt-4 w-full resize-none rounded-xl border border-zinc-300 p-3 text-sm outline-none focus:border-zinc-950" /><div className="mt-4 flex justify-end gap-2"><button type="button" onClick={() => { if (!recoveryLoading) { setRecoveryDonationId(""); setRecoveryReason(""); } }} disabled={recoveryLoading} className="rounded-xl border border-zinc-300 px-4 py-2 text-sm font-black disabled:opacity-40">취소</button><button type="button" onClick={() => void executeRecovery()} disabled={recoveryLoading || !recoveryReason.trim()} className="rounded-xl bg-red-600 px-4 py-2 text-sm font-black text-white disabled:opacity-40">{recoveryLoading ? "복구 처리 중..." : "사유 확인 후 복구 실행"}</button></div></div></div>}

      {(trace || traceError) && <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/55 p-4"><div className="max-h-[85vh] w-full max-w-3xl overflow-auto rounded-2xl bg-white p-5 shadow-2xl"><div className="flex items-start justify-between gap-3"><div><div className="text-xs font-black text-zinc-400">DONATION TRACE</div><h3 className="mt-1 text-xl font-black">후원 처리 흐름</h3></div><button type="button" onClick={() => { setTrace(null); setTraceError(""); }} className="rounded-lg border border-zinc-300 px-3 py-2 text-xs font-black">닫기</button></div>{traceError ? <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">{traceError}</div> : trace ? <><div className="mt-4 grid gap-2 rounded-xl bg-zinc-50 p-4 text-sm md:grid-cols-2"><div>후원 ID: <b>{trace.donationId}</b></div><div>상태: <b>{trace.status}</b></div><div>보낸 회원: {trace.senderUserId || "-"}</div><div>받은 회원: {trace.receiverUserId || "-"}</div><div>금액: {trace.amount === null ? "-" : `${trace.amount.toLocaleString()} FLAT`}</div><div>수동검토: {trace.requiresManualReview ? "필요" : "아님"}</div></div><div className="mt-4 space-y-2">{trace.events.map((event) => <div key={event.eventId} className="rounded-xl border border-zinc-200 p-3 text-sm"><div className="flex flex-wrap items-center justify-between gap-2"><b>{event.eventType}</b><span className="text-xs text-zinc-400">{formatDate(event.createdAt)}</span></div>{event.transactionId && <div className="mt-2 break-all font-mono text-xs text-zinc-600">transactionId: {event.transactionId}</div>}{event.errorMessage && <div className="mt-2 break-words rounded-lg bg-red-50 p-2 text-xs text-red-700">{event.errorMessage}</div>}</div>)}</div></> : null}</div></div>}
    </main>
  );
}

function Card({ label, value, sub }: { label: string; value: string; sub: string }) {
  return <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4"><div className="text-xs font-bold text-zinc-400">{label}</div><div className="mt-2 text-xl font-black">{value}</div><div className="mt-1 text-xs text-zinc-500">{sub}</div></div>;
}
function Empty({ text }: { text: string }) { return <div className="mt-3 rounded-xl bg-zinc-50 p-4 text-sm text-zinc-500">{text}</div>; }
function PermissionNotice() { return <div className="mt-3 rounded-xl bg-zinc-50 p-4 text-sm text-zinc-500">현재 관리자 권한으로는 이 항목을 조회할 수 없습니다.</div>; }
