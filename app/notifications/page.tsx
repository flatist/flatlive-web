"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import type {
  NotificationRecord,
  NotificationType,
} from "@/lib/notification/notification-store";

type FilterType =
  | "ALL"
  | NotificationType;

const TYPE_LABEL: Record<
  NotificationType,
  string
> = {
  SYSTEM: "시스템",
  NOTICE: "공지",
  LIVE: "LIVE",
  FOLLOW: "팔로우",
  DONATION: "후원",
  REACTION: "반응",
  REPORT: "신고",
};

export default function NotificationsPage() {
  const [
    notifications,
    setNotifications,
  ] = useState<
    NotificationRecord[]
  >([]);

  const [
    unreadCount,
    setUnreadCount,
  ] = useState(0);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState("");

  const [
    filter,
    setFilter,
  ] =
    useState<FilterType>(
      "ALL",
    );

  const loadNotifications =
    useCallback(
      async () => {
        setLoading(true);
        setError("");

        try {
          const response =
            await fetch(
              "/api/notifications",
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
              "로그인 후 알림을 확인할 수 있습니다.",
            );
            setNotifications(
              [],
            );
            setUnreadCount(
              0,
            );
            return;
          }

          if (
            !response.ok ||
            !data.success
          ) {
            setError(
              data.error ||
                "알림을 불러오지 못했습니다.",
            );
            return;
          }

          setNotifications(
            Array.isArray(
              data.notifications,
            )
              ? data.notifications
              : [],
          );

          setUnreadCount(
            Number(
              data.unreadCount,
            ) || 0,
          );
        } catch (loadError) {
          console.error(
            "NOTIFICATION PAGE LOAD ERROR",
            loadError,
          );

          setError(
            "알림 조회 중 네트워크 오류가 발생했습니다.",
          );
        } finally {
          setLoading(false);
        }
      },
      [],
    );

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  const filtered =
    useMemo(() => {
      if (
        filter === "ALL"
      ) {
        return notifications;
      }

      return notifications.filter(
        (item) =>
          item.type ===
          filter,
      );
    }, [
      notifications,
      filter,
    ]);

  async function markRead(
    notification:
      NotificationRecord,
  ) {
    if (
      notification.isRead
    ) {
      return;
    }

    try {
      const response =
        await fetch(
          "/api/notifications",
          {
            method:
              "PATCH",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                action:
                  "READ",

                notificationId:
                  notification.id,
              }),
          },
        );

      const data =
        await response.json();

      if (
        !response.ok ||
        !data.success
      ) {
        return;
      }

      setNotifications(
        (previous) =>
          previous.map(
            (item) =>
              item.id ===
              notification.id
                ? data.notification
                : item,
          ),
      );

      setUnreadCount(
        Number(
          data.unreadCount,
        ) || 0,
      );
    } catch (readError) {
      console.error(
        "NOTIFICATION READ ERROR",
        readError,
      );
    }
  }

  async function markAllRead() {
    try {
      const response =
        await fetch(
          "/api/notifications",
          {
            method:
              "PATCH",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                action:
                  "READ_ALL",
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
            "전체 읽음 처리에 실패했습니다.",
        );
        return;
      }

      setNotifications(
        (previous) =>
          previous.map(
            (item) => ({
              ...item,

              isRead:
                true,

              readAt:
                item.readAt ??
                new Date().toISOString(),
            }),
          ),
      );

      setUnreadCount(
        0,
      );
    } catch (readAllError) {
      console.error(
        "NOTIFICATION READ ALL ERROR",
        readAllError,
      );

      alert(
        "전체 읽음 처리 중 오류가 발생했습니다.",
      );
    }
  }

  async function openNotification(
    notification:
      NotificationRecord,
  ) {
    await markRead(
      notification,
    );

    window.location.href =
      `/notifications/${notification.id}`;
  }

  return (
    <main className="min-h-screen bg-[#090909] pb-24 pt-6 text-white md:pt-24">
      <div className="mx-auto max-w-3xl px-4 md:px-6">
        <header className="flex items-start justify-between gap-4">
          <div>
            <Link
              href="/"
              className="text-sm font-bold text-zinc-500 hover:text-white"
            >
              ← 홈
            </Link>

            <h1 className="mt-4 text-3xl font-black tracking-[-0.04em]">
              알림
            </h1>

            <p className="mt-2 text-sm text-zinc-500">
              새로운 활동과 운영 알림을 확인합니다.
            </p>
          </div>

          {unreadCount >
            0 && (
            <button
              type="button"
              onClick={() => {
                void markAllRead();
              }}
              className="mt-8 rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-xs font-black text-zinc-200"
            >
              모두 읽음
            </button>
          )}
        </header>

        <div className="mt-6 flex items-center justify-between rounded-2xl border border-white/[0.08] bg-[#111] px-4 py-4">
          <div>
            <p className="text-xs font-bold text-zinc-500">
              안 읽은 알림
            </p>

            <p className="mt-1 text-2xl font-black">
              {unreadCount}
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              void loadNotifications();
            }}
            className="rounded-full bg-white/[0.08] px-4 py-2 text-xs font-black text-zinc-200"
          >
            새로고침
          </button>
        </div>

        <div className="mt-5 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
          {(
            [
              [
                "ALL",
                "전체",
              ],

              [
                "LIVE",
                "LIVE",
              ],

              [
                "DONATION",
                "후원",
              ],

              [
                "REACTION",
                "반응",
              ],

              [
                "FOLLOW",
                "팔로우",
              ],

              [
                "REPORT",
                "신고",
              ],

              [
                "NOTICE",
                "공지",
              ],

              [
                "SYSTEM",
                "시스템",
              ],
            ] as const
          ).map(
            ([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setFilter(
                    value,
                  );
                }}
                className={`shrink-0 rounded-full px-4 py-2 text-xs font-black ${
                  filter ===
                  value
                    ? "bg-flat-yellow text-black"
                    : "border border-white/10 bg-white/[0.04] text-zinc-400"
                }`}
              >
                {label}
              </button>
            ),
          )}
        </div>

        {error && (
          <div className="mt-5 rounded-2xl border border-red-500/20 bg-red-950/30 p-4 text-sm font-bold text-red-200">
            {error}
          </div>
        )}

        <section className="mt-5 space-y-2">
          {loading ? (
            <div className="rounded-2xl border border-white/[0.08] bg-[#111] p-8 text-center text-sm font-bold text-zinc-500">
              알림을 불러오는 중입니다.
            </div>
          ) : (
            filtered.map(
              (
                notification,
              ) => (
                <button
                  key={
                    notification.id
                  }
                  type="button"
                  onClick={() => {
                    void openNotification(
                      notification,
                    );
                  }}
                  className={`relative block w-full rounded-2xl border p-4 text-left transition ${
                    notification.isRead
                      ? "border-white/[0.06] bg-[#111]"
                      : "border-[#f6c900]/20 bg-[#17150b]"
                  }`}
                >
                  {!notification.isRead && (
                    <span className="absolute right-4 top-4 h-2.5 w-2.5 rounded-full bg-flat-yellow" />
                  )}

                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-white/[0.07] px-2.5 py-1 text-[10px] font-black text-zinc-400">
                      {
                        TYPE_LABEL[
                          notification
                            .type
                        ]
                      }
                    </span>

                    <span className="text-[11px] text-zinc-600">
                      {new Date(
                        notification.createdAt,
                      ).toLocaleString(
                        "ko-KR",
                      )}
                    </span>
                  </div>

                  <h2
                    className={`mt-3 pr-6 text-[15px] ${
                      notification.isRead
                        ? "font-bold text-zinc-300"
                        : "font-black text-white"
                    }`}
                  >
                    {
                      notification.title
                    }
                  </h2>

                  <p className="mt-1.5 text-sm leading-6 text-zinc-500">
                    {
                      notification.message
                    }
                  </p>

                  {notification.href && (
                    <div className="mt-3 text-[11px] font-black text-flat-yellow">
                      확인하기 →
                    </div>
                  )}
                </button>
              ),
            )
          )}

          {!loading &&
            !error &&
            filtered.length ===
              0 && (
              <div className="rounded-2xl border border-white/[0.08] bg-[#111] p-10 text-center">
                <div className="text-3xl">
                  ♢
                </div>

                <p className="mt-3 text-sm font-black text-zinc-300">
                  새로운 알림이 없습니다.
                </p>
              </div>
            )}
        </section>
      </div>
    </main>
  );
}
