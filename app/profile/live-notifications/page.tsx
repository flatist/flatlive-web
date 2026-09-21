"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useState,
} from "react";

type StreamerSetting = {
  userId: string;
  username: string;
  displayName: string;
  enabled: boolean;
};

export default function LiveNotificationSettingsPage() {
  const [
    streamers,
    setStreamers,
  ] =
    useState<
      StreamerSetting[]
    >([]);

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    error,
    setError,
  ] =
    useState("");

  const [
    savingId,
    setSavingId,
  ] =
    useState("");

  const loadSettings =
    useCallback(
      async () => {
        setLoading(true);
        setError("");

        try {
          const response =
            await fetch(
              "/api/live-notification-settings",
              {
                cache:
                  "no-store",
              },
            );

          const data =
            await response.json();

          if (
            response.status ===
            401
          ) {
            setError(
              "로그인 후 방송 알림을 설정할 수 있습니다.",
            );

            return;
          }

          if (
            !response.ok ||
            !data.success
          ) {
            setError(
              data.error ||
                "방송 알림 설정을 불러오지 못했습니다.",
            );

            return;
          }

          setStreamers(
            Array.isArray(
              data.streamers,
            )
              ? data.streamers
              : [],
          );
        } catch (
          loadError
        ) {
          console.error(
            "LIVE_NOTIFICATION_SETTINGS_LOAD_ERROR",
            loadError,
          );

          setError(
            "방송 알림 설정을 불러오는 중 오류가 발생했습니다.",
          );
        } finally {
          setLoading(
            false,
          );
        }
      },
      [],
    );

  useEffect(() => {
    void loadSettings();
  }, [
    loadSettings,
  ]);

  async function toggleSetting(
    streamer:
      StreamerSetting,
  ) {
    if (
      savingId
    ) {
      return;
    }

    const nextEnabled =
      !streamer.enabled;

    setSavingId(
      streamer.userId,
    );

    try {
      const response =
        await fetch(
          "/api/live-notification-settings",
          {
            method:
              "PATCH",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                streamerUserId:
                  streamer.userId,

                enabled:
                  nextEnabled,
              }),
          },
        );

      const data =
        await response.json();

      if (
        !response.ok ||
        !data.success
      ) {
        alert(
          data.error ||
            "방송 알림 설정에 실패했습니다.",
        );

        return;
      }

      setStreamers(
        (
          previous,
        ) =>
          previous.map(
            (
              item,
            ) =>
              item.userId ===
              streamer.userId
                ? {
                    ...item,
                    enabled:
                      nextEnabled,
                  }
                : item,
          ),
      );
    } catch (
      saveError
    ) {
      console.error(
        "LIVE_NOTIFICATION_SETTINGS_SAVE_ERROR",
        saveError,
      );

      alert(
        "방송 알림 설정 중 오류가 발생했습니다.",
      );
    } finally {
      setSavingId(
        "",
      );
    }
  }

  return (
    <main className="min-h-screen bg-black px-4 pb-28 pt-8 text-white md:px-6 md:pt-24">
      <div className="mx-auto max-w-3xl">

        <Link
          href="/profile"
          className="text-sm font-bold text-zinc-500 hover:text-white"
        >
          ← 마이페이지
        </Link>

        <h1 className="mt-5 text-3xl font-black tracking-[-0.04em]">
          방송 알림 설정
        </h1>

        <p className="mt-2 text-sm leading-6 text-zinc-500">
          팔로우한 스트리머 중 원하는 방송만 시작 알림을 받을 수 있습니다.
        </p>

        {loading && (
          <div className="mt-8 rounded-2xl border border-white/10 bg-zinc-950 p-6 text-sm text-zinc-500">
            방송 알림 설정을 불러오는 중입니다.
          </div>
        )}

        {!loading &&
          error && (
            <div className="mt-8 rounded-2xl border border-red-500/20 bg-red-500/[0.05] p-6 text-sm text-red-300">
              {error}
            </div>
          )}

        {!loading &&
          !error &&
          streamers.length ===
            0 && (
            <div className="mt-8 rounded-2xl border border-white/10 bg-zinc-950 p-6">
              <p className="font-bold">
                팔로우한 스트리머가 없습니다.
              </p>

              <p className="mt-2 text-sm text-zinc-500">
                스트리머를 팔로우하면 여기에서 방송 시작 알림을 선택할 수 있습니다.
              </p>
            </div>
          )}

        {!loading &&
          !error &&
          streamers.length >
            0 && (
            <div className="mt-8 space-y-3">
              {streamers.map(
                (
                  streamer,
                ) => (
                  <div
                    key={
                      streamer.userId
                    }
                    className="flex items-center justify-between gap-4 rounded-2xl border border-white/[0.08] bg-zinc-950 p-4"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-black">
                        {
                          streamer.displayName
                        }
                      </p>

                      <p className="mt-1 truncate text-xs text-zinc-500">
                        @
                        {
                          streamer.username
                        }
                      </p>
                    </div>

                    <button
                      type="button"
                      disabled={
                        savingId ===
                        streamer.userId
                      }
                      onClick={() => {
                        void toggleSetting(
                          streamer,
                        );
                      }}
                      className={
                        streamer.enabled
                          ? "relative h-8 w-14 shrink-0 rounded-full bg-[#f6c900] transition disabled:opacity-50"
                          : "relative h-8 w-14 shrink-0 rounded-full bg-zinc-700 transition disabled:opacity-50"
                      }
                      aria-label={
                        streamer.enabled
                          ? "방송 알림 끄기"
                          : "방송 알림 켜기"
                      }
                    >
                      <span
                        className={
                          streamer.enabled
                            ? "absolute left-7 top-1 h-6 w-6 rounded-full bg-black transition"
                            : "absolute left-1 top-1 h-6 w-6 rounded-full bg-white transition"
                        }
                      />
                    </button>
                  </div>
                ),
              )}
            </div>
          )}

      </div>
    </main>
  );
}
