"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  useCallback,
  useEffect,
  useState,
} from "react";

type NotificationBellProps = {
  variant?: "mobile" | "pc";
};

export default function NotificationBell({
  variant = "mobile",
}: NotificationBellProps) {
  const pathname = usePathname();
  const [unreadCount, setUnreadCount] = useState(0);

  const loadUnreadCount = useCallback(async () => {
    try {
      const response = await fetch("/api/notifications", {
        cache: "no-store",
      });

      if (!response.ok) {
        setUnreadCount(0);
        return;
      }

      const data = await response.json();
      setUnreadCount(Number(data?.unreadCount) || 0);
    } catch {
      setUnreadCount(0);
    }
  }, []);

  useEffect(() => {
    void loadUnreadCount();
  }, [loadUnreadCount, pathname]);

  useEffect(() => {
    const handleFocus = () => {
      void loadUnreadCount();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void loadUnreadCount();
      }
    };

    const intervalId = window.setInterval(() => {
      void loadUnreadCount();
    }, 15000);

    window.addEventListener("focus", handleFocus);
    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange,
    );

    return () => {
      window.clearInterval(intervalId);

      window.removeEventListener(
        "focus",
        handleFocus,
      );

      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange,
      );
    };
  }, [loadUnreadCount]);

  const badgeText =
    unreadCount > 99
      ? "99+"
      : String(unreadCount);

  const bellIcon = (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="h-5 w-5"
    >
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
      <path d="M10 21h4" />
    </svg>
  );

  if (variant === "pc") {
    return (
      <Link
        href="/notifications"
        aria-label={
          unreadCount > 0
            ? `알림 ${unreadCount}개`
            : "알림"
        }
        className="relative flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-zinc-300 transition hover:bg-white/[0.09] hover:text-white"
      >
        {bellIcon}

        {unreadCount > 0 && (
          <span className="absolute -right-2 -top-2 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-flat-yellow px-1 text-[10px] font-black leading-none text-black">
            {badgeText}
          </span>
        )}
      </Link>
    );
  }

  return (
    <Link
      href="/notifications"
      aria-label={
        unreadCount > 0
          ? `알림 ${unreadCount}개`
          : "알림"
      }
      className="relative flex h-10 w-10 items-center justify-center rounded-full text-zinc-200"
    >
      {bellIcon}

      {unreadCount > 0 && (
        <span className="absolute -right-1 top-0 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-flat-yellow px-1 text-[10px] font-black leading-none text-black">
          {badgeText}
        </span>
      )}
    </Link>
  );
}
