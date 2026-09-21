"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

type FitToast = {
  id: number;
  amount: number;
};

export default function FitAwardToastBridge() {
  const [toast, setToast] =
    useState<FitToast | null>(null);

  const timerRef =
    useRef<ReturnType<
      typeof setTimeout
    > | null>(null);

  useEffect(() => {
    const originalFetch =
      window.fetch.bind(window);

    const wrappedFetch: typeof window.fetch =
      async (...args) => {
        const response =
          await originalFetch(...args);

        const rawAmount =
          response.headers.get(
            "x-fit-awarded",
          );

        const amount =
          rawAmount
            ? Number(rawAmount)
            : 0;

        if (
          Number.isSafeInteger(amount) &&
          amount > 0
        ) {
          if (timerRef.current) {
            clearTimeout(
              timerRef.current,
            );
          }

          setToast({
            id: Date.now(),
            amount,
          });

          timerRef.current =
            setTimeout(() => {
              setToast(null);
            }, 1800);
        }

        return response;
      };

    window.fetch =
      wrappedFetch;

    return () => {
      if (
        window.fetch ===
        wrappedFetch
      ) {
        window.fetch =
          originalFetch;
      }

      if (timerRef.current) {
        clearTimeout(
          timerRef.current,
        );
      }
    };
  }, []);

  if (!toast) {
    return null;
  }

  return (
    <div
      key={toast.id}
      className="pointer-events-none fixed left-1/2 top-[18%] z-[9999] -translate-x-1/2"
      aria-live="polite"
    >
      <div className="rounded-full border border-yellow-300/50 bg-black/90 px-5 py-2.5 text-base font-black text-yellow-300 shadow-2xl backdrop-blur">
        +{toast.amount} FIT
      </div>
    </div>
  );
}
