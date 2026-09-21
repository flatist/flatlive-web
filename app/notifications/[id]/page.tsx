"use client";

import Link from "next/link";
import {
  useEffect,
  useState,
} from "react";
import {
  useParams,
} from "next/navigation";

import type {
  NotificationRecord,
  NotificationType,
} from "@/lib/notification/notification-store";

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

function getActionLabel(
  type: NotificationType,
) {
  switch (type) {
    case "LIVE":
      return "방송 보러가기";

    case "FOLLOW":
      return "프로필 보기";

    case "DONATION":
      return "후원 내역 보기";

    case "REACTION":
      return "영상 보기";

    case "REPORT":
      return "관련 내용 보기";

    case "NOTICE":
      return "공지 보기";

    default:
      return "";
  }
}

function formatDate(
  value: string,
) {
  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return value;
  }

  return date.toLocaleString(
    "ko-KR",
  );
}

export default function NotificationDetailPage() {
  const params =
    useParams<{
      id: string;
    }>();

  const notificationId =
    typeof params?.id === "string"
      ? params.id
      : "";

  const [
    notification,
    setNotification,
  ] =
    useState<NotificationRecord | null>(
      null,
    );

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

  useEffect(() => {
    if (!notificationId) {
      setError(
        "알림 ID가 올바르지 않습니다.",
      );
      setLoading(false);
      return;
    }

    let cancelled =
      false;

    async function loadNotification() {
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
          response.status === 401
        ) {
          if (!cancelled) {
            setError(
              "로그인 후 알림을 확인할 수 있습니다.",
            );
          }

          return;
        }

        if (
          !response.ok ||
          !data.success
        ) {
          if (!cancelled) {
            setError(
              data.error ||
                "알림을 불러오지 못했습니다.",
            );
          }

          return;
        }

        const notifications:
          NotificationRecord[] =
          Array.isArray(
            data.notifications,
          )
            ? data.notifications
            : [];

        const found =
          notifications.find(
            (item) =>
              item.id ===
              notificationId,
          ) ?? null;

        if (!found) {
          if (!cancelled) {
            setError(
              "알림을 찾을 수 없습니다.",
            );
          }

          return;
        }

        if (
          !found.isRead
        ) {
          const readResponse =
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
                      found.id,
                  }),
              },
            );

          const readData =
            await readResponse.json();

          if (
            readResponse.ok &&
            readData.success &&
            readData.notification
          ) {
            if (!cancelled) {
              setNotification(
                readData.notification,
              );
            }

            return;
          }
        }

        if (!cancelled) {
          setNotification(
            found,
          );
        }
      } catch (loadError) {
        console.error(
          "NOTIFICATION_DETAIL_LOAD_FAILED",
          loadError,
        );

        if (!cancelled) {
          setError(
            "알림을 불러오는 중 오류가 발생했습니다.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadNotification();

    return () => {
      cancelled =
        true;
    };
  }, [
    notificationId,
  ]);

  const actionLabel =
    notification
      ? getActionLabel(
          notification.type,
        )
      : "";

  return (
    <main className="min-h-screen bg-[#090909] pb-24 pt-6 text-white md:pt-24">
      <div className="mx-auto max-w-3xl px-4 md:px-6">

        <Link
          href="/notifications"
          className="text-sm font-bold text-zinc-500 hover:text-white"
        >
          ← 알림 목록
        </Link>

        <h1 className="mt-5 text-3xl font-black tracking-[-0.04em]">
          알림
        </h1>

        {loading && (
          <div className="mt-8 rounded-2xl border border-white/10 bg-[#111] p-6 text-sm text-zinc-400">
            알림을 불러오는 중입니다.
          </div>
        )}

        {!loading &&
          error && (
            <div className="mt-8 rounded-2xl border border-red-500/20 bg-red-500/[0.05] p-6 text-red-300">
              {error}
            </div>
          )}

        {!loading &&
          notification && (
            <article className="mt-8 overflow-hidden rounded-3xl border border-white/10 bg-[#111]">

              <div className="border-b border-white/[0.08] p-6 md:p-8">

                <span className="inline-flex rounded-full bg-[#f6c900]/10 px-3 py-1 text-xs font-black text-[#f6c900]">
                  {
                    TYPE_LABEL[
                      notification.type
                    ]
                  }
                </span>

                <h2 className="mt-5 text-2xl font-black leading-tight">
                  {
                    notification.title
                  }
                </h2>

                <p className="mt-3 text-xs text-zinc-500">
                  {
                    formatDate(
                      notification.createdAt,
                    )
                  }
                </p>
              </div>

              <div className="p-6 md:p-8">

                <p className="whitespace-pre-wrap text-[15px] leading-7 text-zinc-200">
                  {
                    notification.message
                  }
                </p>

                {notification.href &&
                  actionLabel && (
                    <Link
                      href={
                        notification.href
                      }
                      className="mt-8 flex h-12 w-full items-center justify-center rounded-xl bg-[#f6c900] font-black text-black md:w-auto md:px-7"
                    >
                      {actionLabel}
                    </Link>
                  )}

              </div>
            </article>
          )}

      </div>
    </main>
  );
}
