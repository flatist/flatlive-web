import {
  NextResponse,
} from "next/server";

import {
  cookies,
} from "next/headers";

import {
  AuthService,
} from "@/lib/auth/auth-service";

import {
  SESSION_COOKIE_NAME,
} from "@/lib/auth/session";

import {
  recordVideoAnalytics,
  type VideoAnalyticsContentType,
  type VideoAnalyticsEventType,
} from "@/lib/analytics/video-analytics-store";

export const runtime =
  "nodejs";

const CONTENT_TYPES:
  VideoAnalyticsContentType[] = [
    "FLIT",
    "VOD",
  ];

const EVENT_TYPES:
  VideoAnalyticsEventType[] = [
    "PLAY",
    "PAUSE",
    "PROGRESS",
    "SEEK",
    "COMPLETE",
  ];

function isContentType(
  value: unknown,
): value is VideoAnalyticsContentType {
  return (
    typeof value ===
      "string" &&
    CONTENT_TYPES.includes(
      value as
        VideoAnalyticsContentType,
    )
  );
}

function isEventType(
  value: unknown,
): value is VideoAnalyticsEventType {
  return (
    typeof value ===
      "string" &&
    EVENT_TYPES.includes(
      value as
        VideoAnalyticsEventType,
    )
  );
}

function finiteNumber(
  value: unknown,
) {
  return (
    typeof value ===
      "number" &&
    Number.isFinite(
      value,
    )
  );
}

export async function POST(
  request: Request,
) {
  try {
    const body =
      await request.json();

    if (
      !isContentType(
        body?.contentType,
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          errorCode:
            "VIDEO_ANALYTICS_CONTENT_TYPE_INVALID",
        },
        {
          status: 400,
        },
      );
    }

    if (
      !isEventType(
        body?.eventType,
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          errorCode:
            "VIDEO_ANALYTICS_EVENT_TYPE_INVALID",
        },
        {
          status: 400,
        },
      );
    }

    const contentId =
      typeof body?.contentId ===
      "string"
        ? body.contentId.trim()
        : "";

    const viewerSessionId =
      typeof body?.viewerSessionId ===
      "string"
        ? body.viewerSessionId.trim()
        : "";

    if (
      !contentId ||
      !viewerSessionId
    ) {
      return NextResponse.json(
        {
          success: false,
          errorCode:
            "VIDEO_ANALYTICS_ID_REQUIRED",
        },
        {
          status: 400,
        },
      );
    }

    if (
      viewerSessionId.length >
      120
    ) {
      return NextResponse.json(
        {
          success: false,
          errorCode:
            "VIDEO_ANALYTICS_SESSION_INVALID",
        },
        {
          status: 400,
        },
      );
    }

    if (
      !finiteNumber(
        body?.currentTime,
      ) ||
      !finiteNumber(
        body?.duration,
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          errorCode:
            "VIDEO_ANALYTICS_TIME_INVALID",
        },
        {
          status: 400,
        },
      );
    }

    let viewerUserId:
      string | null =
      null;

    try {
      const cookieStore =
        await cookies();

      const token =
        cookieStore.get(
          SESSION_COOKIE_NAME,
        )?.value;

      if (token) {
        const snapshot =
          await new AuthService()
            .getCurrentUserSnapshot(
              token,
            );

        viewerUserId =
          snapshot?.userId ??
          null;
      }
    } catch (
      authError
    ) {
      console.error(
        "VIDEO_ANALYTICS_AUTH_LOOKUP_FAILED",
        authError,
      );
    }

    const record =
      await recordVideoAnalytics({
        contentType:
          body.contentType,

        contentId,

        viewerSessionId,

        viewerUserId,

        source:
          typeof body?.source ===
          "string"
            ? body.source
            : "UNKNOWN",

        eventType:
          body.eventType,

        currentTime:
          body.currentTime,

        duration:
          body.duration,

        watchedDelta:
          finiteNumber(
            body?.watchedDelta,
          )
            ? body.watchedDelta
            : 0,
      });

    return NextResponse.json({
      success: true,
      contentType:
        record.contentType,
      contentId:
        record.contentId,
    });
  } catch (error) {
    console.error(
      "VIDEO_ANALYTICS_RECORD_FAILED",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        errorCode:
          "VIDEO_ANALYTICS_RECORD_FAILED",
      },
      {
        status: 500,
      },
    );
  }
}
