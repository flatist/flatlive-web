"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

type AdminMember = {
  id: string;
  username: string;
  email: string;
  displayName: string;
  role: string;
  updatedAt: string;
};

export default function AdminPermissionsPage() {
  const [admins, setAdmins] = useState<AdminMember[]>([]);
  const [roles, setRoles] = useState<string[]>([]);
  const [userId, setUserId] = useState("");
  const [role, setRole] = useState("OPERATOR");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [canManage, setCanManage] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/permissions", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || "권한 정보를 불러오지 못했습니다.");
      setAdmins(Array.isArray(data.admins) ? data.admins : []);
      setRoles(Array.isArray(data.availableRoles) ? data.availableRoles : []);
      setCanManage(data.canManage === true);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "권한 정보를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!userId.trim() || busy) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/permissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: userId.trim(), role }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || "권한 변경에 실패했습니다.");
      setMessage("관리자 권한을 변경했습니다.");
      setUserId("");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "권한 변경에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm md:p-6">
      <div className="text-[10px] font-black tracking-[0.18em] text-zinc-400">ADMIN PERMISSIONS</div>
      <h1 className="mt-1 text-2xl font-black">관리자 권한</h1>
      <p className="mt-2 text-sm text-zinc-500">OPERATOR · ADMIN · SUPER_ADMIN 역할을 관리합니다. 권한 변경 이력은 감사 로그에 남습니다.</p>

      <form onSubmit={save} className="mt-5 grid gap-3 rounded-2xl bg-zinc-50 p-4 md:grid-cols-[1fr_220px_auto]">
        <input disabled={!canManage} value={userId} onChange={(event) => setUserId(event.target.value)} placeholder="권한을 변경할 회원 ID" className="h-11 rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-zinc-500" />
        <select disabled={!canManage} value={role} onChange={(event) => setRole(event.target.value)} className="h-11 rounded-xl border border-zinc-200 bg-white px-3 text-sm font-bold">
          {roles.filter((item) => item !== "USER").map((item) => <option key={item} value={item}>{item}</option>)}
          <option value="USER">USER (권한 제거)</option>
        </select>
        <button disabled={busy || !canManage} className="h-11 rounded-xl bg-zinc-950 px-5 text-sm font-black text-white disabled:opacity-40">{busy ? "저장 중..." : "권한 저장"}</button>
      </form>
      {!canManage && <p className="mt-2 text-xs font-bold text-amber-700">현재 역할은 관리자 권한을 조회만 할 수 있습니다. 변경은 SUPER_ADMIN 권한이 필요합니다.</p>}

      {message && <div className="mt-4 rounded-xl bg-zinc-100 px-4 py-3 text-sm font-bold text-zinc-700">{message}</div>}

      <div className="mt-5 overflow-x-auto rounded-2xl border border-zinc-200">
        <table className="min-w-[900px] w-full border-collapse text-sm">
          <thead className="bg-zinc-50 text-left text-xs text-zinc-500"><tr>{["관리자", "아이디", "이메일", "역할", "최근 변경", "빠른 변경"].map((title) => <th key={title} className="border-b border-zinc-200 px-4 py-3">{title}</th>)}</tr></thead>
          <tbody>
            {loading && admins.length === 0 ? <tr><td colSpan={6} className="py-10 text-center text-zinc-500">불러오는 중...</td></tr> : admins.length === 0 ? <tr><td colSpan={6} className="py-10 text-center text-zinc-500">등록된 관리자가 없습니다.</td></tr> : admins.map((admin) => (
              <tr key={admin.id} className="border-b border-zinc-100 last:border-0">
                <td className="px-4 py-4 font-black">{admin.displayName}</td>
                <td className="px-4 py-4">@{admin.username}</td>
                <td className="px-4 py-4 text-zinc-500">{admin.email}</td>
                <td className="px-4 py-4"><span className="rounded-full bg-zinc-950 px-2.5 py-1 text-xs font-black text-white">{admin.role}</span></td>
                <td className="px-4 py-4 text-xs text-zinc-500">{new Date(admin.updatedAt).toLocaleString("ko-KR")}</td>
                <td className="px-4 py-4"><button onClick={() => { setUserId(admin.id); setRole(admin.role); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-bold">선택</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
