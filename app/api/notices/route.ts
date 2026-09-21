import {
  NextResponse,
} from "next/server";

import {
  randomUUID,
} from "node:crypto";

import {
  readNotices,
} from "@/lib/notice/notice-store";

export const runtime =
  "nodejs";

function makeTraceId() {
  return `NOTICE-PUBLIC-${Date.now()}-${randomUUID()
    .slice(0, 8)
    .toUpperCase()}`;
}

function isVisibleByDate(
  startAt: string | null,
  endAt: string | null,
) {
  const now =
    Date.now();

  if (startAt) {
    const start =
      new Date(
        startAt,
      ).getTime();

    if (
      !Number.isNaN(start) &&
      now < start
    ) {
      return false;
    }
  }

  if (endAt) {
    const end =
      new Date(
        endAt,
      ).getTime();

    if (
      !Number.isNaN(end) &&
      now > end
    ) {
      return false;
    }
  }

  return true;
}

export async function GET(
  request: Request,
) {
  const traceId =
    makeTraceId();

  try {
    const url =
      new URL(
        request.url,
      );

    const noticeId =
      url.searchParams
        .get("id")
        ?.trim() || "";

    const all =
      await readNotices();

    const visible =
      all
        .filter(
          (notice) =>
            notice.status ===
              "PUBLIC" &&
            (
              notice.audience ===
                "ALL" ||
              notice.audience ===
                "MEMBER"
            ) &&
            isVisibleByDate(
              notice.publishStartAt,
              notice.publishEndAt,
            ),
        )
        .sort(
          (a, b) => {
            if (
              a.pinned !==
              b.pinned
            ) {
              return a.pinned
                ? -1
                : 1;
            }

            if (
              a.important !==
              b.important
            ) {
              return a.important
                ? -1
                : 1;
            }

            return (
              new Date(
                b.createdAt,
              ).getTime() -
              new Date(
                a.createdAt,
              ).getTime()
            );
          },
        );

    if (noticeId) {
      const notice =
        visible.find(
          (item) =>
            item.id ===
            noticeId,
        );

      if (!notice) {
        return NextResponse.json(
          {
            success: false,
            errorCode:
              "NOTICE_NOT_FOUND",
            error:
              "공지사항을 찾을 수 없습니다.",
            traceId,
          },
          {
            status: 404,
          },
        );
      }

      return NextResponse.json({
        success: true,
        notice: {
          id:
            notice.id,
          title:
            notice.title,
          content:
            notice.content,
          important:
            notice.important,
          pinned:
            notice.pinned,
          createdAt:
            notice.createdAt,
          updatedAt:
            notice.updatedAt,
        },
        traceId,
      });
    }

    return NextResponse.json({
      success: true,
      count:
        visible.length,
      notices:
        visible.map(
          (notice) => ({
            id:
              notice.id,
            title:
              notice.title,
            important:
              notice.important,
            pinned:
              notice.pinned,
            createdAt:
              notice.createdAt,
          }),
        ),
      traceId,
    });
  } catch (error) {
    console.error(
      "PUBLIC NOTICE ERROR",
      {
        traceId,
        error,
      },
    );

    return NextResponse.json(
      {
        success: false,
        errorCode:
          "PUBLIC_NOTICE_FAILED",
        error:
          "공지사항을 불러오지 못했습니다.",
        traceId,
      },
      {
        status: 500,
      },
    );
  }
}
