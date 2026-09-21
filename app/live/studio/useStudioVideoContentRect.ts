"use client";

import {
  type RefObject,
  useEffect,
  useState,
} from "react";

export type StudioVideoContentRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export function useStudioVideoContentRect(
  videoRef: RefObject<HTMLVideoElement | null>,
) {
  const [
    rect,
    setRect,
  ] = useState<StudioVideoContentRect | null>(
    null,
  );

  useEffect(() => {
    let frame = 0;
    const timers: number[] = [];

    const measure = () => {
      window.cancelAnimationFrame(frame);

      frame =
        window.requestAnimationFrame(() => {
          const video =
            videoRef.current;

          if (!video) {
            return;
          }

          const parent =
            video.parentElement;

          if (!parent) {
            return;
          }

          if (
            video.videoWidth <= 0 ||
            video.videoHeight <= 0
          ) {
            return;
          }

          const videoBox =
            video.getBoundingClientRect();

          const parentBox =
            parent.getBoundingClientRect();

          if (
            videoBox.width <= 0 ||
            videoBox.height <= 0
          ) {
            return;
          }

          const scale =
            Math.min(
              videoBox.width /
                video.videoWidth,
              videoBox.height /
                video.videoHeight,
            );

          const width =
            video.videoWidth *
            scale;

          const height =
            video.videoHeight *
            scale;

          const left =
            videoBox.left -
            parentBox.left +
            (
              videoBox.width -
              width
            ) /
              2;

          const top =
            videoBox.top -
            parentBox.top +
            (
              videoBox.height -
              height
            ) /
              2;

          setRect({
            left,
            top,
            width,
            height,
          });
        });
    };

    const measureAgain = () => {
      measure();

      timers.push(
        window.setTimeout(
          measure,
          80,
        ),
      );

      timers.push(
        window.setTimeout(
          measure,
          250,
        ),
      );

      timers.push(
        window.setTimeout(
          measure,
          600,
        ),
      );
    };

    const video =
      videoRef.current;

    const parent =
      video?.parentElement;

    const observer =
      new ResizeObserver(
        measureAgain,
      );

    if (video) {
      observer.observe(video);

      video.addEventListener(
        "loadedmetadata",
        measureAgain,
      );

      video.addEventListener(
        "resize",
        measureAgain,
      );
    }

    if (parent) {
      observer.observe(parent);
    }

    const handleVisibility = () => {
      if (
        document.visibilityState ===
        "visible"
      ) {
        measureAgain();
      }
    };

    window.addEventListener(
      "resize",
      measureAgain,
    );

    window.addEventListener(
      "orientationchange",
      measureAgain,
    );

    window.addEventListener(
      "focus",
      measureAgain,
    );

    window.addEventListener(
      "pageshow",
      measureAgain,
    );

    document.addEventListener(
      "visibilitychange",
      handleVisibility,
    );

    measureAgain();

    return () => {
      window.cancelAnimationFrame(
        frame,
      );

      timers.forEach((timer) => {
        window.clearTimeout(timer);
      });

      observer.disconnect();

      if (video) {
        video.removeEventListener(
          "loadedmetadata",
          measureAgain,
        );

        video.removeEventListener(
          "resize",
          measureAgain,
        );
      }

      window.removeEventListener(
        "resize",
        measureAgain,
      );

      window.removeEventListener(
        "orientationchange",
        measureAgain,
      );

      window.removeEventListener(
        "focus",
        measureAgain,
      );

      window.removeEventListener(
        "pageshow",
        measureAgain,
      );

      document.removeEventListener(
        "visibilitychange",
        handleVisibility,
      );
    };
  }, [videoRef]);

  return rect;
}
