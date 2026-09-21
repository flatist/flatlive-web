"use client";

import { useRef } from "react";

export default function VodPreview({
  videoUrl,
  thumbnailUrl,
}: {
  videoUrl: string;
  thumbnailUrl?: string;
}) {
  const videoRef =
    useRef<HTMLVideoElement | null>(null);

  if (thumbnailUrl) {
    return (
      <img
        src={thumbnailUrl}
        alt="VOD 썸네일"
        className="h-full w-full object-cover"
        loading="lazy"
      />
    );
  }

  return (
    <video
      ref={videoRef}
      src={videoUrl}
      muted
      playsInline
      preload="metadata"
      className="h-full w-full object-cover"
      onLoadedMetadata={(event) => {
        const video =
          event.currentTarget;

        if (
          Number.isFinite(video.duration) &&
          video.duration > 0
        ) {
          try {
            video.currentTime = Math.min(
              0.1,
              video.duration / 20,
            );
          } catch {
            // 기존 VOD fallback 미리보기
          }
        }
      }}
    />
  );
}
