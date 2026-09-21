"use client";

export default function PortalLogoutButton() {
  async function logout() {
    await fetch("/api/agency-access/logout", { method: "POST" }).catch(() => null);
    window.location.href = "/agency-portal";
  }
  return <button onClick={() => void logout()} className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-xs font-black text-zinc-700">나가기</button>;
}
