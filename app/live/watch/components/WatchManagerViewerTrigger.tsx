"use client";

type Props = {
  viewerCount: number;
  open: boolean;
  onToggle: () => void;
};

export default function WatchManagerViewerTrigger({
  viewerCount,
  open,
  onToggle,
}: Props) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="pointer-events-auto mb-2 hidden w-full items-center justify-between rounded-2xl border border-yellow-400/20 bg-zinc-950/95 px-3 py-2.5 text-left shadow-lg shadow-black/30 backdrop-blur-md transition hover:border-yellow-300/40 hover:bg-zinc-900/95 md:flex"
      aria-label={open ? "시청자 목록 접기" : "시청자 목록 펼치기"}
    >
      <span>
        <span className="block text-[11px] font-black text-yellow-300">
          시청자 관리 도크
        </span>
        <span className="mt-0.5 block text-[10px] font-bold text-zinc-400">
          현재 {viewerCount}명 접속중
        </span>
      </span>

      <span className="rounded-full border border-yellow-400/30 bg-yellow-400/10 px-2.5 py-1 text-[11px] font-black text-yellow-300">
        목록 {open ? "▲" : "▼"}
      </span>
    </button>
  );
}
