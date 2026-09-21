"use client";

import {
  useEffect,
  useState,
} from "react";

type Props = {
  roomId: string;
  userId: string;
  compact?: boolean;
};

export default function StudioManagerButton({
  roomId,
  userId,
  compact = false,
}: Props) {
  const [
    isManager,
    setIsManager,
  ] = useState(false);

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    ready,
    setReady,
  ] = useState(false);

  async function load() {
    if (!roomId || !userId) {
      return;
    }

    try {
      const response =
        await fetch(
          `/api/live/managers?roomId=${encodeURIComponent(
            roomId,
          )}`,
          {
            cache: "no-store",
          },
        );

      const data =
        await response.json();

      if (
        response.ok &&
        Array.isArray(
          data.managers,
        )
      ) {
        setIsManager(
          data.managers.some(
            (
              manager: {
                managerUserId?: string;
              },
            ) =>
              manager.managerUserId ===
              userId,
          ),
        );
      }
    } catch (error) {
      console.error(
        "LIVE_MANAGER_BUTTON_LOAD_FAILED",
        error,
      );
    } finally {
      setReady(true);
    }
  }

  useEffect(() => {
    void load();
  }, [
    roomId,
    userId,
  ]);

  async function toggle() {
    if (loading) {
      return;
    }

    try {
      setLoading(true);

      const response =
        await fetch(
          "/api/live/managers",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              roomId,
              targetUserId:
                userId,
              action:
                isManager
                  ? "revoke"
                  : "assign",
            }),
          },
        );

      const data =
        await response.json();

      if (!response.ok) {
        console.error(
          "LIVE_MANAGER_BUTTON_CHANGE_FAILED",
          data,
        );

        return;
      }

      setIsManager(
        (current) =>
          !current,
      );
    } catch (error) {
      console.error(
        "LIVE_MANAGER_BUTTON_CHANGE_ERROR",
        error,
      );
    } finally {
      setLoading(false);
    }
  }

  if (!ready || !userId) {
    return null;
  }

  return (
    <button
      type="button"
      disabled={loading}
      onClick={() => {
        void toggle();
      }}
      className={
        isManager
          ? compact
            ? "rounded-lg bg-blue-500/20 px-2 py-1.5 text-[10px] font-black text-blue-300 disabled:opacity-40"
            : "rounded-xl bg-blue-500/20 px-3 py-2 text-xs font-black text-blue-300 disabled:opacity-40"
          : compact
            ? "rounded-lg bg-white/10 px-2 py-1.5 text-[10px] font-black text-zinc-300 disabled:opacity-40"
            : "rounded-xl bg-white/10 px-3 py-2 text-xs font-black text-zinc-300 disabled:opacity-40"
      }
    >
      {loading
        ? "처리중"
        : isManager
          ? "★ 매니저"
          : "매니저 지정"}
    </button>
  );
}
