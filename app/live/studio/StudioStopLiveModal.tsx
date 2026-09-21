"use client";

type Props = {
  open: boolean;
  stoppingLive: boolean;
  stopLiveError: string;

  onCancel: () => void;
  onConfirm: () => void | Promise<void>;
};

export default function StudioStopLiveModal({
  open,
  stoppingLive,
  stopLiveError,
  onCancel,
  onConfirm,
}: Props) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 px-5 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-zinc-950 p-6 shadow-2xl">
        <div className="text-lg font-black text-white">
          방송을 종료하시겠습니까?
        </div>

        <p className="mt-2 text-sm leading-6 text-zinc-400">
          종료하면 현재 LIVE가 즉시 종료됩니다.
        </p>

        {stopLiveError && (
          <div className="mt-4 rounded-xl border border-red-900/60 bg-red-950/50 px-4 py-3 text-xs text-red-300">
            {stopLiveError}
          </div>
        )}

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            disabled={stoppingLive}
            onClick={onCancel}
            className="h-12 flex-1 rounded-xl border border-white/10 bg-zinc-900 text-sm font-black text-white disabled:opacity-40"
          >
            취소
          </button>

          <button
            type="button"
            disabled={stoppingLive}
            onClick={() => {
              void onConfirm();
            }}
            className="h-12 flex-1 rounded-xl bg-red-600 text-sm font-black text-white disabled:opacity-50"
          >
            {stoppingLive
              ? "종료 중..."
              : "방송 종료"}
          </button>
        </div>
      </div>
    </div>
  );
}
