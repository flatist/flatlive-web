"use client";

import { FormEvent, useState } from "react";

export default function AgencyPortalLoginPage() {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy || code.trim().length < 6) return;
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/agency-access/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code }) });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || "접속에 실패했습니다.");
      window.location.href = data.redirectTo;
    } catch (error) { setMessage(error instanceof Error ? error.message : "접속에 실패했습니다."); }
    finally { setBusy(false); }
  }

  return (
    <main className="min-h-screen bg-[#f5f6f8] px-4 py-16 text-zinc-950">
      <div className="mx-auto max-w-md rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm md:p-8">
        <div className="text-[10px] font-black tracking-[0.2em] text-zinc-400">FLATLIVE PARTNER</div>
        <h1 className="mt-2 text-2xl font-black">조직 전용 접속</h1>
        <p className="mt-2 text-sm leading-6 text-zinc-500">본부장 · 지사장 · 에이전시에게 발급된 전용 코드를 입력하세요. 접속 후에는 본인 조직 아래 데이터만 표시됩니다.</p>
        <form onSubmit={submit} className="mt-6 space-y-3">
          <input value={code} onChange={(e) => setCode(e.target.value)} type="password" autoComplete="one-time-code" placeholder="접속코드 입력" className="h-12 w-full rounded-xl border border-zinc-200 px-4 text-base outline-none focus:border-zinc-500" />
          <button disabled={busy || code.trim().length < 6} className="h-12 w-full rounded-xl bg-zinc-950 text-sm font-black text-white disabled:opacity-40">{busy ? "확인 중..." : "들어가기"}</button>
        </form>
        {message && <div className="mt-4 rounded-xl bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">{message}</div>}
      </div>
    </main>
  );
}
