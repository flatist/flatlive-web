"use client";

import { useCallback, useEffect, useState } from "react";

type LiveRoom = {
  roomId: string;
  title: string;
  category: string;
  isAdult: boolean;
  broadcasterName: string;
  broadcasterUsername: string;
  deviceType: "mobile" | "pc";
  viewerCount: number;
  createdAt: number;
  updatedAt: number;
};

export default function AdminLivePage() {
  const [rooms, setRooms] = useState<LiveRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [busyRoomId, setBusyRoomId] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/live", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || "LIVE 목록을 불러오지 못했습니다.");
      setRooms(Array.isArray(data.rooms) ? data.rooms : []);
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "LIVE 목록을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 5000);
    return () => window.clearInterval(timer);
  }, [load]);

  async function forceEnd(room: LiveRoom) {
    if (busyRoomId) return;
    const reason = window.prompt(`${room.broadcasterName} 방송을 강제 종료합니다. 사유를 입력하세요.`, "운영 정책 위반");
    if (reason === null) return;
    if (!window.confirm("정말 이 LIVE를 강제 종료할까요?")) return;

    setBusyRoomId(room.roomId);
    try {
      const response = await fetch("/api/admin/live", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "force-end", roomId: room.roomId, reason }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || "강제 종료에 실패했습니다.");
      setMessage("방송을 강제 종료했습니다.");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "강제 종료에 실패했습니다.");
    } finally {
      setBusyRoomId("");
    }
  }

  return (
    <main className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm md:p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="text-[10px] font-black tracking-[0.18em] text-zinc-400">LIVE CONTROL</div>
          <h1 className="mt-1 text-2xl font-black">LIVE 관제</h1>
          <p className="mt-2 text-sm text-zinc-500">현재 방송 상태를 확인하고 필요한 경우 강제 종료합니다.</p>
        </div>
        <button onClick={() => void load()} className="rounded-xl bg-zinc-950 px-4 py-2.5 text-xs font-black text-white">새로고침</button>
      </div>

      {message && <div className="mt-4 rounded-xl bg-zinc-100 px-4 py-3 text-sm font-bold text-zinc-700">{message}</div>}

      <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="현재 LIVE" value={rooms.length} />
        <Stat label="총 시청자" value={rooms.reduce((sum, room) => sum + room.viewerCount, 0)} />
        <Stat label="모바일 송출" value={rooms.filter((room) => room.deviceType === "mobile").length} />
        <Stat label="19+ 방송" value={rooms.filter((room) => room.isAdult).length} />
      </div>

      <div className="mt-5 overflow-x-auto rounded-2xl border border-zinc-200">
        <table className="min-w-[980px] w-full border-collapse text-sm">
          <thead className="bg-zinc-50 text-left text-xs text-zinc-500">
            <tr>{["방송", "방송자", "카테고리", "기기", "시청자", "시작", "관리"].map((title) => <th key={title} className="border-b border-zinc-200 px-4 py-3">{title}</th>)}</tr>
          </thead>
          <tbody>
            {loading && rooms.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-zinc-500">불러오는 중...</td></tr>
            ) : rooms.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-zinc-500">현재 진행 중인 LIVE가 없습니다.</td></tr>
            ) : rooms.map((room) => (
              <tr key={room.roomId} className="border-b border-zinc-100 last:border-0">
                <td className="px-4 py-4"><div className="font-black">{room.title || "LIVE 방송"}</div><div className="mt-1 text-[11px] text-zinc-400">{room.roomId}</div></td>
                <td className="px-4 py-4"><div className="font-bold">{room.broadcasterName}</div><div className="text-xs text-zinc-400">@{room.broadcasterUsername}</div></td>
                <td className="px-4 py-4">{room.category || "기타"}{room.isAdult ? <span className="ml-2 rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-black text-red-600">19+</span> : null}</td>
                <td className="px-4 py-4 uppercase">{room.deviceType}</td>
                <td className="px-4 py-4 font-black">{room.viewerCount.toLocaleString()}</td>
                <td className="px-4 py-4 text-xs text-zinc-500">{new Date(room.createdAt).toLocaleString("ko-KR")}</td>
                <td className="px-4 py-4"><div className="flex gap-2"><a href={`/live/watch/${encodeURIComponent(room.roomId)}`} target="_blank" rel="noreferrer" className="rounded-lg border border-zinc-200 px-3 py-2 text-xs font-bold">보기</a><button disabled={busyRoomId === room.roomId} onClick={() => void forceEnd(room)} className="rounded-lg bg-red-600 px-3 py-2 text-xs font-black text-white disabled:opacity-40">강제 종료</button></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4"><div className="text-xs font-bold text-zinc-400">{label}</div><div className="mt-2 text-2xl font-black">{value.toLocaleString()}</div></div>;
}
