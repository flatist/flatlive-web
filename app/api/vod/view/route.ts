import {
  NextResponse,
} from "next/server";
import { cookies } from "next/headers";
import {
  randomUUID,
} from "node:crypto";

import {
  incrementVodViews,
} from "@/lib/vod/vod-store";

import {
  parseSessionToken,
  SESSION_COOKIE_NAME,
} from "@/lib/auth/session";
import { awardFitWatchInterval } from "@/lib/fit";
import { getFitActivityConfig } from "@/lib/fit/fit-config-store";

export const runtime =
  "nodejs";

function makeTraceId() {
  return `VOD-VIEW-${Date.now()}-${randomUUID()
    .slice(0, 8)
    .toUpperCase()}`;
}

export async function POST(
  request: Request,
) {
  const traceId =
    makeTraceId();

  try {
    const body =
      await request.json();

    const vodId =
      typeof body?.vodId ===
      "string"
        ? body.vodId.trim()
        : "";

    if (!vodId) {
      return NextResponse.json(
        {
          success: false,
          errorCode:
            "VOD_VIEW_ID_REQUIRED",
          error:
            "VOD ID가 필요합니다.",
          traceId,
        },
        {
          status: 400,
        },
      );
    }

    const countView =
      body?.countView !== false;

    const watchedSeconds =
      typeof body?.watchedSeconds ===
      "number"
        ? body.watchedSeconds
        : 0;

    const fitIntervalIndex =
      typeof body?.fitIntervalIndex ===
      "number"
        ? Math.floor(
            body.fitIntervalIndex,
          )
        : 0;

    const vod =
      countView
        ? await incrementVodViews(
            vodId,
          )
        : null;

    if (countView && !vod) {
      return NextResponse.json(
        {
          success: false,
          errorCode:
            "VOD_VIEW_NOT_FOUND",
          error:
            "VOD를 찾을 수 없습니다.",
          traceId,
        },
        {
          status: 404,
        },
      );
    }

    // FLATLIVE_FIT_WATCH_SECONDS_REACTION_V1: VOD_WATCH
    let fitAwarded = 0;

    const fitConfig =
      await getFitActivityConfig();

    const fitRule =
      fitConfig.rules.find(
        (item) =>
          item.code ===
          "VOD_WATCH",
      );

    const fitWatchSeconds =
      fitRule?.watchSeconds ?? 30;

    try {
      const token =
        (await cookies()).get(
          SESSION_COOKIE_NAME,
        )?.value;

      const userId =
        token
          ? parseSessionToken(token)?.userId ?? null
          : null;

      if (
        userId &&
        fitIntervalIndex > 0
      ) {
        const fitResult =
          await awardFitWatchInterval({
            userId,
            activityCode:
              "VOD_WATCH",
            contentId:
              vodId,
            intervalIndex:
              fitIntervalIndex,
            watchedSeconds,
          });

        fitAwarded =
          fitResult.awarded
            ? fitResult.amount
            : 0;
      }
    } catch (fitError) {
      console.error("[FIT_AWARD_FAILED]", {
        activityCode:
          "VOD_WATCH",
        vodId,
        fitError,
      });
    }

    const response =
      NextResponse.json({
        success: true,
        vodId,
        views: vod?.views ?? null,
        fitWatchSeconds,
        traceId,
      });

    if (fitAwarded > 0) {
      response.headers.set(
        "X-FIT-Awarded",
        String(fitAwarded),
      );
    }

    return response;
  } catch (error) {
    console.error(
      "VOD VIEW ERROR",
      {
        traceId,
        error,
      },
    );

    return NextResponse.json(
      {
        success: false,
        errorCode:
          "VOD_VIEW_FAILED",
        error:
          "VOD 조회수 처리에 실패했습니다.",
        traceId,
      },
      {
        status: 500,
      },
    );
  }
}
