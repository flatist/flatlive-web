"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  useSearchParams,
} from "next/navigation";

import type {
  FollowUserListItem,
} from "@/components/social/FollowUserList";

type Props = {
  followers:
    FollowUserListItem[];

  following:
    FollowUserListItem[];
};

type TabType =
  | "followers"
  | "following";

type LiveSetting = {
  userId: string;
  enabled: boolean;
};

function UserAvatar({
  item,
}: {
  item: FollowUserListItem;
}) {
  return (
    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full bg-zinc-800">
      {item.avatarUrl ? (
        <img
          src={item.avatarUrl}
          alt=""
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-sm font-black text-zinc-500">
          {
            (
              item.nickname ||
              item.displayName ||
              item.username
            )
              .slice(0, 1)
              .toUpperCase()
          }
        </div>
      )}
    </div>
  );
}

export default function FollowTabsClient({
  followers,
  following,
}: Props) {
  const searchParams =
    useSearchParams();

  const initialTab:
    TabType =
    searchParams.get("tab") ===
    "following"
      ? "following"
      : "followers";

  const [
    tab,
    setTab,
  ] =
    useState<TabType>(
      initialTab,
    );

  const [
    liveSettings,
    setLiveSettings,
  ] =
    useState<
      Record<string, boolean>
    >({});

  const [
    savingId,
    setSavingId,
  ] =
    useState("");

  const [
    settingError,
    setSettingError,
  ] =
    useState("");

  useEffect(() => {
    let cancelled =
      false;

    async function loadLiveSettings() {
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
          cancelled ||
          !response.ok ||
          !data.success
        ) {
          return;
        }

        const streamers:
          LiveSetting[] =
          Array.isArray(
            data.streamers,
          )
            ? data.streamers
            : [];

        const next:
          Record<
            string,
            boolean
          > = {};

        for (
          const streamer
          of streamers
        ) {
          next[
            streamer.userId
          ] =
            Boolean(
              streamer.enabled,
            );
        }

        setLiveSettings(
          next,
        );
      } catch (error) {
        console.error(
          "FOLLOW_LIVE_SETTINGS_LOAD_FAILED",
          error,
        );
      }
    }

    void loadLiveSettings();

    return () => {
      cancelled =
        true;
    };
  }, []);

  const currentItems =
    useMemo(
      () =>
        tab ===
        "followers"
          ? followers
          : following,
      [
        tab,
        followers,
        following,
      ],
    );

  async function toggleLiveNotification(
    streamerUserId:
      string,
  ) {
    if (savingId) {
      return;
    }

    const current =
      liveSettings[
        streamerUserId
      ] ?? false;

    const nextEnabled =
      !current;

    setSavingId(
      streamerUserId,
    );

    setSettingError("");

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
                streamerUserId,
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
        setSettingError(
          data.error ||
            "방송 알림 설정에 실패했습니다.",
        );

        return;
      }

      setLiveSettings(
        (
          previous,
        ) => ({
          ...previous,

          [streamerUserId]:
            nextEnabled,
        }),
      );
    } catch (error) {
      console.error(
        "FOLLOW_LIVE_SETTING_SAVE_FAILED",
        error,
      );

      setSettingError(
        "방송 알림 설정 중 오류가 발생했습니다.",
      );
    } finally {
      setSavingId("");
    }
  }

  return (
    <>
      <div className="mb-6 flex items-center gap-3">
        <Link
          href="/profile"
          className="rounded-full border border-white/10 px-3 py-1.5 text-sm text-zinc-400 hover:text-white"
        >
          ←
        </Link>

        <div>
          <p className="text-xs font-bold text-zinc-500">
            MY PROFILE
          </p>

          <h1 className="text-2xl font-black">
            팔로워 · 팔로잉
          </h1>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 rounded-2xl border border-white/10 bg-zinc-950 p-1">
        <button
          type="button"
          onClick={() =>
            setTab(
              "followers",
            )
          }
          className={
            tab ===
            "followers"
              ? "rounded-xl bg-white px-4 py-3 text-sm font-black text-black"
              : "rounded-xl px-4 py-3 text-sm font-bold text-zinc-500"
          }
        >
          팔로워
          <span className="ml-1.5 text-xs opacity-60">
            {followers.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() =>
            setTab(
              "following",
            )
          }
          className={
            tab ===
            "following"
              ? "rounded-xl bg-white px-4 py-3 text-sm font-black text-black"
              : "rounded-xl px-4 py-3 text-sm font-bold text-zinc-500"
          }
        >
          팔로잉
          <span className="ml-1.5 text-xs opacity-60">
            {following.length}
          </span>
        </button>
      </div>

      {tab ===
        "following" && (
        <div className="mb-4 rounded-2xl border border-[#f6c900]/15 bg-[#f6c900]/[0.04] px-4 py-3">
          <p className="text-xs leading-5 text-zinc-400">
            팔로우한 스트리머의
            방송 시작 알림을 원하는
            경우 오른쪽 종 알림을
            켜주세요.
          </p>
        </div>
      )}

      {settingError && (
        <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/[0.05] px-4 py-3 text-xs text-red-300">
          {settingError}
        </div>
      )}

      {currentItems.length ===
        0 ? (
        <div className="rounded-2xl border border-white/10 bg-zinc-950 p-8 text-center text-sm text-zinc-500">
          {tab ===
          "followers"
            ? "아직 나를 팔로우한 사용자가 없습니다."
            : "아직 팔로우한 사용자가 없습니다."}
        </div>
      ) : (
        <div className="space-y-2">
          {currentItems.map(
            (item) => {
              const enabled =
                liveSettings[
                  item.userId
                ] ?? false;

              return (
                <div
                  key={
                    item.userId
                  }
                  className="flex items-center gap-3 rounded-2xl border border-white/10 bg-zinc-950 p-4"
                >
                  <Link
                    href={`/u/${encodeURIComponent(
                      item.username,
                    )}`}
                    className="flex min-w-0 flex-1 items-center gap-4"
                  >
                    <UserAvatar
                      item={
                        item
                      }
                    />

                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold">
                        {item.nickname ||
                          item.displayName ||
                          item.username}
                      </p>

                      <p className="truncate text-sm text-zinc-500">
                        @
                        {
                          item.username
                        }
                      </p>

                      {item.bio ? (
                        <p className="mt-1 truncate text-xs text-zinc-600">
                          {
                            item.bio
                          }
                        </p>
                      ) : null}
                    </div>
                  </Link>

                  {tab ===
                    "following" && (
                    <div className="flex shrink-0 flex-col items-center gap-1">
                      <button
                        type="button"
                        disabled={
                          savingId ===
                          item.userId
                        }
                        onClick={() => {
                          void toggleLiveNotification(
                            item.userId,
                          );
                        }}
                        aria-label={
                          enabled
                            ? "방송 알림 끄기"
                            : "방송 알림 켜기"
                        }
                        className={
                          enabled
                            ? "flex h-10 w-10 items-center justify-center rounded-full bg-[#f6c900] text-black transition disabled:opacity-50"
                            : "flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-zinc-500 transition disabled:opacity-50"
                        }
                      >
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
                      </button>

                      <span
                        className={
                          enabled
                            ? "text-[10px] font-black text-[#f6c900]"
                            : "text-[10px] font-bold text-zinc-600"
                        }
                      >
                        {enabled
                          ? "알림 ON"
                          : "알림 OFF"}
                      </span>
                    </div>
                  )}

                  {tab ===
                    "followers" && (
                    <span className="text-sm text-zinc-600">
                      ›
                    </span>
                  )}
                </div>
              );
            },
          )}
        </div>
      )}
    </>
  );
}
