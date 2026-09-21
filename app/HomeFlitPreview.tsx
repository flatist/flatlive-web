"use client";

import {
  useRef,
} from "react";

export default function HomeFlitPreview({
  videoUrl,
}: {
  videoUrl: string;
}) {
  const videoRef =
    useRef<HTMLVideoElement | null>(
      null,
    );

  return (
    <video
      ref={videoRef}
      src={videoUrl}
      muted
      playsInline
      preload="auto"
      controls={false}
      className="h-full w-full object-cover"
      onLoadedMetadata={(event) => {
        const video =
          event.currentTarget;

        if (
          Number.isFinite(
            video.duration,
          ) &&
          video.duration > 0
        ) {
          try {
            video.currentTime =
              Math.min(
                0.15,
                Math.max(
                  0.01,
                  video.duration * 0.01,
                ),
              );
          } catch {
            // Safari 등에서 seek 실패 시
            // 실제 FLIT 재생에는 영향 없음
          }
        }
      }}
      onLoadedData={(event) => {
        const video =
          event.currentTarget;

        if (
          video.currentTime === 0 &&
          Number.isFinite(
            video.duration,
          ) &&
          video.duration > 0
        ) {
          try {
            video.currentTime =
              Math.min(
                0.15,
                video.duration / 20,
              );
          } catch {
            // 미리보기 전용
          }
        }
      }}
    />
  );
}
