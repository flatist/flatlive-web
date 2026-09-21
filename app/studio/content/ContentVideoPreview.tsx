"use client";

import {
  useRef,
} from "react";

export default function ContentVideoPreview({
  videoUrl,
  type,
  isAdult,
}: {
  videoUrl: string;
  type: "FLIT" | "VOD";
  isAdult: boolean;
}) {
  const videoRef =
    useRef<HTMLVideoElement | null>(
      null,
    );

  if (isAdult) {
    return (
      <div
        className={
          type === "FLIT"
            ? "relative flex h-28 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-zinc-900"
            : "relative flex aspect-video w-40 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-zinc-900"
        }
      >
        <div className="text-center">
          <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-full bg-red-600 text-[10px] font-black text-white">
            19+
          </div>

          <div className="mt-2 text-[9px] font-bold text-zinc-500">
            성인 콘텐츠
          </div>
        </div>

        <span className="absolute bottom-2 right-2 rounded bg-black/70 px-1.5 py-0.5 text-[8px] font-black text-white">
          {type}
        </span>
      </div>
    );
  }

  return (
    <div
      className={
        type === "FLIT"
          ? "relative h-28 w-20 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-black"
          : "relative aspect-video w-40 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-black"
      }
    >
      <video
        ref={videoRef}
        src={videoUrl}
        muted
        playsInline
        preload="metadata"
        disablePictureInPicture
        controls={false}
        className="h-full w-full object-cover"
        onLoadedMetadata={(event) => {
          const video =
            event.currentTarget;

          if (
            Number.isFinite(
              video.duration,
            ) &&
            video.duration > 0.2
          ) {
            try {
              video.currentTime =
                Math.min(
                  0.1,
                  video.duration / 10,
                );
            } catch {
              // 목록 미리보기 실패는
              // 실제 영상 재생에 영향을 주지 않습니다.
            }
          }
        }}
      />

      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-black/55 text-xs text-white backdrop-blur-sm">
          ▶
        </span>
      </div>

      <span className="pointer-events-none absolute bottom-2 right-2 rounded bg-black/70 px-1.5 py-0.5 text-[8px] font-black text-white">
        {type}
      </span>
    </div>
  );
}
