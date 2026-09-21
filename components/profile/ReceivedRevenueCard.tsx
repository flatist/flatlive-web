"use client";

import Link from "next/link";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

type Props = {
  initialTotal: number;
  initialCount: number;
};

type RevenueResponse = {
  success: boolean;
  totalReceived?: number;
  count?: number;
};

export default function ReceivedRevenueCard({
  initialTotal,
  initialCount,
}: Props) {
  const [
    totalReceived,
    setTotalReceived,
  ] = useState(initialTotal);

  const [
    count,
    setCount,
  ] = useState(initialCount);

  const refresh = useCallback(
    async () => {
      try {
        const response =
          await fetch(
            "/api/profile/revenue-summary",
            {
              method: "GET",
              cache: "no-store",
              credentials:
                "same-origin",
            },
          );

        if (!response.ok) {
          return;
        }

        const data =
          (await response.json()) as RevenueResponse;

        if (
          data.success &&
          typeof data.totalReceived ===
            "number" &&
          typeof data.count ===
            "number"
        ) {
          setTotalReceived(
            data.totalReceived,
          );

          setCount(
            data.count,
          );
        }
      } catch {
        // 자동갱신 실패가
        // 서비스 이용을 막지 않도록 무시
      }
    },
    [],
  );

  useEffect(() => {
    void refresh();

    const timer =
      window.setInterval(
        () => {
          void refresh();
        },
        1000,
      );

    const handleFocus = () => {
      void refresh();
    };

    const handleVisibility =
      () => {
        if (
          document.visibilityState ===
          "visible"
        ) {
          void refresh();
        }
      };

    window.addEventListener(
      "focus",
      handleFocus,
    );

    document.addEventListener(
      "visibilitychange",
      handleVisibility,
    );

    return () => {
      window.clearInterval(
        timer,
      );

      window.removeEventListener(
        "focus",
        handleFocus,
      );

      document.removeEventListener(
        "visibilitychange",
        handleVisibility,
      );
    };
  }, [refresh]);

  return (
    <Link
      href="/profile/revenue"
      className="rounded-2xl border border-white/[0.08] bg-zinc-950 p-4 transition hover:bg-zinc-900"
    >
      <div className="text-xs font-bold text-zinc-500">
        받은 수익
      </div>

      <div className="mt-2 text-2xl font-black">
        {totalReceived.toLocaleString(
          "ko-KR",
        )}{" "}
        <span className="text-sm text-zinc-500">
          FLAT
        </span>
      </div>

      <div className="mt-1 text-[11px] text-zinc-600">
        LIVE 후원 · 영상 반응
      </div>

      <div className="mt-2 text-[10px] font-bold text-flat-yellow">
        상세보기 →
      </div>
    </Link>
  );
}
