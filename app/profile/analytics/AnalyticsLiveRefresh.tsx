"use client";

import {
  useEffect,
} from "react";

import {
  useRouter,
} from "next/navigation";

export default function AnalyticsLiveRefresh() {
  const router =
    useRouter();

  useEffect(() => {
    let refreshing =
      false;

    const refresh = () => {
      if (
        document.visibilityState !==
        "visible"
      ) {
        return;
      }

      if (refreshing) {
        return;
      }

      refreshing = true;

      router.refresh();

      window.setTimeout(() => {
        refreshing = false;
      }, 500);
    };

    // 분석 화면에 들어왔을 때 최신값 확인
    const firstTimer =
      window.setTimeout(
        refresh,
        300,
      );

    // 화면을 다시 보는 순간 최신값 반영
    const handleVisibility =
      () => {
        if (
          document.visibilityState ===
          "visible"
        ) {
          refresh();
        }
      };

    const handleFocus =
      () => {
        refresh();
      };

    const handlePageShow =
      () => {
        refresh();
      };

    document.addEventListener(
      "visibilitychange",
      handleVisibility,
    );

    window.addEventListener(
      "focus",
      handleFocus,
    );

    window.addEventListener(
      "pageshow",
      handlePageShow,
    );

    // 분석 화면을 켜놓은 경우에도 최신 반응 반영
    const interval =
      window.setInterval(
        refresh,
        2500,
      );

    return () => {
      window.clearTimeout(
        firstTimer,
      );

      window.clearInterval(
        interval,
      );

      document.removeEventListener(
        "visibilitychange",
        handleVisibility,
      );

      window.removeEventListener(
        "focus",
        handleFocus,
      );

      window.removeEventListener(
        "pageshow",
        handlePageShow,
      );
    };
  }, [router]);

  return null;
}
