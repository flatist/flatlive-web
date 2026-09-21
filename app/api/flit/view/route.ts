import {
  randomUUID,
} from "node:crypto";

import {
  NextResponse,
} from "next/server";

import { cookies } from "next/headers";

import {
  incrementFlitViews,
} from "@/lib/flit/flit-store";

import {
  parseSessionToken,
  SESSION_COOKIE_NAME,
} from "@/lib/auth/session";
import { awardFitWatchInterval } from "@/lib/fit";
import { getFitActivityConfig } from "@/lib/fit/fit-config-store";

export const runtime =
  "nodejs";

function makeTraceId() {
  return `FLIT-VIEW-${Date.now()}-${randomUUID()
    .slice(0, 8)
    .toUpperCase()}`;
}

export async function POST(
  request: Request,
) {
  const traceId =
    makeTraceId();

  try {
    let body: unknown;

    try {
      body =
        await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          errorCode:
            "FLIT_VIEW_INVALID_JSON",
          error:
            "요청 형식이 올바르지 않습니다.",
          traceId,
        },
        {
          status: 400,
        },
      );
    }

    if (
      typeof body !==
        "object" ||
      body === null ||
      Array.isArray(body)
    ) {
      return NextResponse.json(
        {
          success: false,
          errorCode:
            "FLIT_VIEW_INVALID_BODY",
          error:
            "요청 형식이 올바르지 않습니다.",
          traceId,
        },
        {
          status: 400,
        },
      );
    }

    const flitId =
      "flitId" in body &&
      typeof body.flitId ===
        "string"
        ? body.flitId.trim()
        : "";

    if (!flitId) {
      return NextResponse.json(
        {
          success: false,
          errorCode:
            "FLIT_VIEW_ID_REQUIRED",
          error:
            "FLIT ID가 필요합니다.",
          traceId,
        },
        {
          status: 400,
        },
      );
    }

    const countView =
      !("countView" in body) ||
      body.countView !== false;

    const watchedSeconds =
      "watchedSeconds" in body &&
      typeof body.watchedSeconds === "number"
        ? body.watchedSeconds
        : 0;

    const fitIntervalIndex =
      "fitIntervalIndex" in body &&
      typeof body.fitIntervalIndex === "number"
        ? Math.floor(body.fitIntervalIndex)
        : 0;

    const flit =
      countView
        ? await incrementFlitViews(
            flitId,
          )
        : null;

    // FLATLIVE_FIT_WATCH_SECONDS_REACTION_V1: FLIT_WATCH
    let fitAwarded = 0;

    const fitConfig =
      await getFitActivityConfig();

    const fitRule =
      fitConfig.rules.find(
        (item) =>
          item.code ===
          "FLIT_WATCH",
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
              "FLIT_WATCH",
            contentId:
              flitId,
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
          "FLIT_WATCH",
        flitId,
        fitError,
      });
    }

    const response =
      NextResponse.json({
        success: true,
        flitId,
        views: flit?.views ?? null,
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
    const message =
      error instanceof Error
        ? error.message
        : "UNKNOWN_ERROR";

    if (
      message ===
      "FLIT_NOT_FOUND"
    ) {
      return NextResponse.json(
        {
          success: false,
          errorCode:
            "FLIT_NOT_FOUND",
          error:
            "FLIT을 찾을 수 없습니다.",
          traceId,
        },
        {
          status: 404,
        },
      );
    }

    if (
      message ===
      "FLIT_NOT_PUBLIC"
    ) {
      return NextResponse.json(
        {
          success: false,
          errorCode:
            "FLIT_NOT_AVAILABLE",
          error:
            "조회할 수 없는 FLIT입니다.",
          traceId,
        },
        {
          status: 404,
        },
      );
    }

    console.error(
      "FLIT VIEW ERROR",
      {
        traceId,
        error,
      },
    );

    return NextResponse.json(
      {
        success: false,
        errorCode:
          "FLIT_VIEW_FAILED",
        error:
          "조회수 처리에 실패했습니다.",
        traceId,
      },
      {
        status: 500,
      },
    );
  }
}
