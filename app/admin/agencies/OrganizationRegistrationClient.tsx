"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type Head = { headManagerUserId: string; name?: string; status: "ACTIVE" | "INACTIVE" };
type Branch = { branchId: string; name: string; headManagerUserId?: string; status: "ACTIVE" | "INACTIVE" };
type Props = { mode: "HEAD" | "BRANCH" | "AGENCY" };

export default function OrganizationRegistrationClient({ mode }: Props) {
  const [heads, setHeads] = useState<Head[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [name, setName] = useState("");
  const [organizationId, setOrganizationId] = useState("");
  const [parentId, setParentId] = useState("");
  const [contact, setContact] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function loadParents() {
    const response = await fetch("/api/admin/agencies/organizations", { cache: "no-store" });
    const data = await response.json();
    if (!response.ok || !data.success) throw new Error(data.error || "조직 정보를 불러오지 못했습니다.");
    const nextHeads = Array.isArray(data.headManagers) ? data.headManagers : [];
    const nextBranches = Array.isArray(data.branches) ? data.branches : [];
    setHeads(nextHeads);
    setBranches(nextBranches);
    if (mode === "BRANCH" && !parentId) setParentId(nextHeads.find((x: Head) => x.status === "ACTIVE")?.headManagerUserId || "");
    if (mode === "AGENCY" && !parentId) setParentId(nextBranches.find((x: Branch) => x.status === "ACTIVE")?.branchId || "");
  }

  useEffect(() => {
    void loadParents().catch((error) => setMessage(error instanceof Error ? error.message : "조직 정보를 불러오지 못했습니다."));
  }, []);

  const parentOptions = useMemo(() => {
    if (mode === "BRANCH") return heads.filter((item) => item.status === "ACTIVE").map((item) => ({ id: item.headManagerUserId, label: item.name || item.headManagerUserId }));
    if (mode === "AGENCY") return branches.filter((item) => item.status === "ACTIVE").map((item) => ({ id: item.branchId, label: item.name || item.branchId }));
    return [];
  }, [mode, heads, branches]);

  const labels = mode === "HEAD"
    ? { title: "새 본부장 등록", id: "본부장 ID", name: "본부장명", action: "UPSERT_HEAD", parent: "" }
    : mode === "BRANCH"
      ? { title: "새 지사장 등록", id: "지사 ID", name: "지사명", action: "UPSERT_BRANCH", parent: "소속 본부장" }
      : { title: "새 에이전시 등록", id: "에이전시 ID", name: "에이전시명", action: "UPSERT_AGENCY", parent: "소속 지사" };

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setMessage("");
    try {
      const body: Record<string, string> = { action: labels.action, name, contact };
      if (mode === "HEAD") body.headManagerUserId = organizationId;
      if (mode === "BRANCH") { body.branchId = organizationId; body.headManagerUserId = parentId; }
      if (mode === "AGENCY") { body.agencyId = organizationId; body.branchId = parentId; }
      const response = await fetch("/api/admin/agencies/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || "등록에 실패했습니다.");
      setMessage("등록했습니다. 아래 목록과 접속코드 관리에서 바로 확인할 수 있습니다.");
      setName(""); setOrganizationId(""); setContact("");
      await loadParents();
      window.setTimeout(() => window.location.reload(), 350);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "등록에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  }

  const parentMissing = mode !== "HEAD" && parentOptions.length === 0;

  return <section className="mt-5 rounded-2xl border border-amber-200 bg-amber-50/40 p-4 md:p-5">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div><div className="text-xs font-black text-amber-700">조직 등록</div><h2 className="mt-1 text-lg font-black">{labels.title}</h2></div>
      <a href="/admin/agencies/access-codes" className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-xs font-black">접속코드 관리 →</a>
    </div>
    {parentMissing ? <div className="mt-3 rounded-xl bg-white px-4 py-3 text-sm font-bold text-rose-600">먼저 상위 조직을 등록해주세요.</div> : null}
    <form onSubmit={submit} className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
      <input value={organizationId} onChange={(e)=>setOrganizationId(e.target.value)} placeholder={labels.id} className="h-11 rounded-xl border border-zinc-200 bg-white px-3 text-sm" />
      <input value={name} onChange={(e)=>setName(e.target.value)} placeholder={labels.name} className="h-11 rounded-xl border border-zinc-200 bg-white px-3 text-sm" />
      {mode !== "HEAD" ? <select value={parentId} onChange={(e)=>setParentId(e.target.value)} className="h-11 rounded-xl border border-zinc-200 bg-white px-3 text-sm"><option value="">{labels.parent} 선택</option>{parentOptions.map((item)=><option key={item.id} value={item.id}>{item.label} · {item.id}</option>)}</select> : <div className="hidden xl:block" />}
      <input value={contact} onChange={(e)=>setContact(e.target.value)} placeholder="담당자 연락처 (선택)" className="h-11 rounded-xl border border-zinc-200 bg-white px-3 text-sm" />
      <button disabled={busy || !organizationId.trim() || !name.trim() || (mode !== "HEAD" && !parentId)} className="h-11 rounded-xl bg-zinc-950 px-4 text-sm font-black text-white disabled:opacity-40">{busy ? "등록 중..." : "등록"}</button>
    </form>
    {message ? <div className="mt-3 text-sm font-bold text-zinc-700">{message}</div> : null}
  </section>;
}
