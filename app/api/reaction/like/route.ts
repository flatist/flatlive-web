import { randomUUID } from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  parseSessionToken,
  SESSION_COOKIE_NAME,
} from "@/lib/auth/session";

import {
  decrementFlitLike,
  incrementFlitLike,
  readFlits,
} from "@/lib/flit/flit-store";

import {
  decrementVodLike,
  incrementVodLike,
  readVods,
} from "@/lib/vod/vod-store";

import {
  toggleLikeRecord,
  type LikeContentType,
} from "@/lib/reaction/like-store";

import { awardFitActivity } from "@/lib/fit";

export async function POST(
  request: Request,
) {
  const traceId =
    `LIKE-${Date.now()}-${randomUUID().slice(0, 8)}`;

  let toggleApplied = false;

  let toggledLiked:
    | boolean
    | null = null;

  let userId:
    | string
    | null = null;

  let contentType:
    | LikeContentType
    | null = null;

  let contentId = "";

  try {
    const token =
      (await cookies()).get(
        SESSION_COOKIE_NAME,
      )?.value;

    userId = token
      ? parseSessionToken(
          token,
        )?.userId ?? null
      : null;

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          errorCode:
            "LIKE_AUTH_REQUIRED",
          error:
            "로그인이 필요합니다.",
          traceId,
        },
        {
          status: 401,
        },
      );
    }

    let body: unknown;

    try {
      body =
        await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          errorCode:
            "LIKE_INVALID_JSON",
          error:
            "요청 형식이 올바르지 않습니다.",
          traceId,
        },
        {
          status: 400,
        },
      );
    }

    const data =
      body &&
      typeof body === "object"
        ? body as Record<
            string,
            unknown
          >
        : {};

    contentType =
      data.contentType ===
        "FLIT" ||
      data.contentType ===
        "VOD"
        ? data.contentType
        : null;

    contentId =
      typeof data.contentId ===
      "string"
        ? data.contentId.trim()
        : "";

    if (
      !contentType ||
      !contentId
    ) {
      return NextResponse.json(
        {
          success: false,
          errorCode:
            "LIKE_INVALID_REQUEST",
          error:
            "콘텐츠 정보를 확인해주세요.",
          traceId,
        },
        {
          status: 400,
        },
      );
    }

    if (
      contentType === "FLIT"
    ) {
      const flits =
        await readFlits();

      const flit =
        flits.find(
          (item) =>
            item.id ===
            contentId,
        );

      if (!flit) {
        return NextResponse.json(
          {
            success: false,
            errorCode:
              "LIKE_CONTENT_NOT_FOUND",
            error:
              "FLIT을 찾을 수 없습니다.",
            traceId,
          },
          {
            status: 404,
          },
        );
      }
    } else {
      const vods =
        await readVods();

      const vod =
        vods.find(
          (item) =>
            item.id ===
            contentId,
        );

      if (!vod) {
        return NextResponse.json(
          {
            success: false,
            errorCode:
              "LIKE_CONTENT_NOT_FOUND",
            error:
              "VOD를 찾을 수 없습니다.",
            traceId,
          },
          {
            status: 404,
          },
        );
      }
    }

    const toggleResult =
      await toggleLikeRecord({
        userId,
        contentType,
        contentId,
      });

    toggleApplied = true;
    toggledLiked =
      toggleResult.liked;

    const updated =
      contentType === "FLIT"
        ? toggleResult.liked
          ? await incrementFlitLike(
              contentId,
            )
          : await decrementFlitLike(
              contentId,
            )
        : toggleResult.liked
          ? await incrementVodLike(
              contentId,
            )
          : await decrementVodLike(
              contentId,
            );

    if (!updated) {
      throw new Error(
        "LIKE_CONTENT_UPDATE_FAILED",
      );
    }

    toggleApplied = false;

    // FLATLIVE_FIT_ACTIVITY_LINK_V1: FLIT_LIKE / VOD_LIKE
    let fitAwarded = 0;

    if (toggleResult.liked) {
      try {
        const fitResult =
          await awardFitActivity({
          userId,
          activityCode:
            contentType === "FLIT"
              ? "FLIT_LIKE"
              : "VOD_LIKE",
          eventKey: contentId,
        });

        fitAwarded =
          fitResult.awarded
            ? fitResult.amount
            : 0;
      } catch (fitError) {
        console.error("[FIT_AWARD_FAILED]", {
          activityCode:
            contentType === "FLIT"
              ? "FLIT_LIKE"
              : "VOD_LIKE",
          userId,
          contentType,
          contentId,
          fitError,
        });
      }
    }

    const response =
      NextResponse.json({
        success: true,
        liked:
          toggleResult.liked,
        contentType,
        contentId,
        likes:
          updated.likes,
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
    if (
      toggleApplied &&
      userId &&
      contentType &&
      contentId
    ) {
      try {
        const rollback =
          await toggleLikeRecord({
            userId,
            contentType,
            contentId,
          });

        console.error(
          "LIKE_RECORD_ROLLBACK",
          {
            traceId,
            failedState:
              toggledLiked,
            restoredState:
              rollback.liked,
          },
        );
      } catch (
        rollbackError
      ) {
        console.error(
          "LIKE_RECORD_ROLLBACK_FAILED",
          {
            traceId,
            rollbackError,
          },
        );
      }
    }

    console.error(
      "LIKE_POST_FAILED",
      {
        traceId,
        error,
      },
    );

    return NextResponse.json(
      {
        success: false,
        errorCode:
          "LIKE_FAILED",
        error:
          "좋아요 처리에 실패했습니다.",
        traceId,
      },
      {
        status: 500,
      },
    );
  }
}
