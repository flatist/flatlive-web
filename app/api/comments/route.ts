import {
  NextResponse,
} from "next/server";

import {
  cookies,
} from "next/headers";

import {
  randomUUID,
} from "node:crypto";

import {
  AuthService,
} from "@/lib/auth/auth-service";

import {
  SESSION_COOKIE_NAME,
} from "@/lib/auth/session";

import {
  addComment,
  deleteCommentByOwner,
  getCommentsByContent,
  type CommentContentType,
} from "@/lib/comment/comment-store";

import {
  setFlitCommentCount,
} from "@/lib/flit/flit-store";

import {
  setVodCommentCount,
} from "@/lib/vod/vod-store";

import { awardFitActivity } from "@/lib/fit";

export const runtime =
  "nodejs";

function makeTraceId() {
  return `COMMENT-${Date.now()}-${randomUUID()
    .slice(0, 8)
    .toUpperCase()}`;
}

async function syncContentCommentCount(
  contentType:
    CommentContentType,
  contentId: string,
  count: number,
) {
  if (
    contentType === "FLIT"
  ) {
    await setFlitCommentCount(
      contentId,
      count,
    );

    return;
  }

  await setVodCommentCount(
    contentId,
    count,
  );
}

function isContentType(
  value: unknown,
): value is CommentContentType {
  return (
    value === "VOD" ||
    value === "FLIT"
  );
}

export async function GET(
  request: Request,
) {
  const traceId =
    makeTraceId();

  try {
    const url =
      new URL(request.url);

    const contentType =
      url.searchParams.get(
        "contentType",
      );

    const contentId =
      url.searchParams
        .get("contentId")
        ?.trim();

    if (
      !isContentType(
        contentType,
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "댓글 대상 유형이 올바르지 않습니다.",
          traceId,
        },
        {
          status: 400,
        },
      );
    }

    if (!contentId) {
      return NextResponse.json(
        {
          success: false,
          error:
            "댓글 대상 ID가 필요합니다.",
          traceId,
        },
        {
          status: 400,
        },
      );
    }

    const comments =
      await getCommentsByContent(
        contentType,
        contentId,
      );

    return NextResponse.json({
      success: true,
      comments,
      count:
        comments.length,
      traceId,
    });
  } catch (error) {
    console.error(
      "COMMENT GET ERROR",
      {
        error,
        traceId,
      },
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "댓글을 불러오지 못했습니다.",
        traceId,
      },
      {
        status: 500,
      },
    );
  }
}

export async function POST(
  request: Request,
) {
  const traceId =
    makeTraceId();

  try {
    const cookieStore =
      await cookies();

    const sessionToken =
      cookieStore.get(
        SESSION_COOKIE_NAME,
      )?.value;

    if (!sessionToken) {
      return NextResponse.json(
        {
          success: false,
          error:
            "댓글을 작성하려면 로그인이 필요합니다.",
          traceId,
        },
        {
          status: 401,
        },
      );
    }

    const snapshot =
      await new AuthService()
        .getCurrentUserSnapshot(
          sessionToken,
        );

    if (!snapshot) {
      return NextResponse.json(
        {
          success: false,
          error:
            "로그인 정보가 만료되었습니다.",
          traceId,
        },
        {
          status: 401,
        },
      );
    }

    const body =
      await request.json();

    const contentType =
      body?.contentType;

    const contentId =
      typeof body?.contentId ===
      "string"
        ? body.contentId.trim()
        : "";

    const text =
      typeof body?.text ===
      "string"
        ? body.text.trim()
        : "";

    if (
      !isContentType(
        contentType,
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "댓글 대상 유형이 올바르지 않습니다.",
          traceId,
        },
        {
          status: 400,
        },
      );
    }

    if (!contentId) {
      return NextResponse.json(
        {
          success: false,
          error:
            "댓글 대상 ID가 필요합니다.",
          traceId,
        },
        {
          status: 400,
        },
      );
    }

    if (!text) {
      return NextResponse.json(
        {
          success: false,
          error:
            "댓글 내용을 입력해주세요.",
          traceId,
        },
        {
          status: 400,
        },
      );
    }

    if (
      text.length > 500
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "댓글은 500자 이내로 작성해주세요.",
          traceId,
        },
        {
          status: 400,
        },
      );
    }

    const comment =
      await addComment({
        contentType,
        contentId,
        userId:
          snapshot.userId,
        username:
          snapshot.username ||
          "",
        displayName:
          snapshot.displayName ||
          snapshot.username ||
          "사용자",
        text,
      });

    const comments =
      await getCommentsByContent(
        contentType,
        contentId,
      );

    await syncContentCommentCount(
      contentType,
      contentId,
      comments.length,
    );

    // FLATLIVE_FIT_ACTIVITY_LINK_V1: FLIT_COMMENT / VOD_COMMENT
    let fitAwarded = 0;

    try {
      const fitResult =
        await awardFitActivity({
        userId: snapshot.userId,
        activityCode:
          contentType === "FLIT"
            ? "FLIT_COMMENT"
            : "VOD_COMMENT",
        eventKey: traceId,
      });

      fitAwarded =
        fitResult.awarded
          ? fitResult.amount
          : 0;
    } catch (fitError) {
      console.error("[FIT_AWARD_FAILED]", {
        activityCode:
          contentType === "FLIT"
            ? "FLIT_COMMENT"
            : "VOD_COMMENT",
        userId: snapshot.userId,
        contentType,
        contentId,
        fitError,
      });
    }

    const response =
      NextResponse.json(
        {
          success: true,
          comment,
          count:
            comments.length,
          traceId,
        },
        {
          status: 201,
        },
      );

    if (fitAwarded > 0) {
      response.headers.set(
        "X-FIT-Awarded",
        String(fitAwarded),
      );
    }

    return response;
  } catch (error) {
    console.error(
      "COMMENT POST ERROR",
      {
        error,
        traceId,
      },
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "댓글 작성 중 오류가 발생했습니다.",
        traceId,
      },
      {
        status: 500,
      },
    );
  }
}

export async function DELETE(
  request: Request,
) {
  const traceId =
    makeTraceId();

  try {
    const cookieStore =
      await cookies();

    const sessionToken =
      cookieStore.get(
        SESSION_COOKIE_NAME,
      )?.value;

    if (!sessionToken) {
      return NextResponse.json(
        {
          success: false,
          error:
            "로그인이 필요합니다.",
          traceId,
        },
        {
          status: 401,
        },
      );
    }

    const snapshot =
      await new AuthService()
        .getCurrentUserSnapshot(
          sessionToken,
        );

    if (!snapshot) {
      return NextResponse.json(
        {
          success: false,
          error:
            "로그인 정보가 만료되었습니다.",
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
          error:
            "요청 형식이 올바르지 않습니다.",
          traceId,
        },
        {
          status: 400,
        },
      );
    }

    const commentId =
      "commentId" in body &&
      typeof body.commentId ===
        "string"
        ? body.commentId.trim()
        : "";

    if (!commentId) {
      return NextResponse.json(
        {
          success: false,
          error:
            "댓글 ID가 필요합니다.",
          traceId,
        },
        {
          status: 400,
        },
      );
    }

    const result =
      await deleteCommentByOwner(
        commentId,
        snapshot.userId,
      );

    if (
      !result.success
    ) {
      if (
        result.reason ===
        "FORBIDDEN"
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "본인이 작성한 댓글만 삭제할 수 있습니다.",
            traceId,
          },
          {
            status: 403,
          },
        );
      }

      return NextResponse.json(
        {
          success: false,
          error:
            "댓글을 찾을 수 없습니다.",
          traceId,
        },
        {
          status: 404,
        },
      );
    }

    const comments =
      await getCommentsByContent(
        result.comment
          .contentType,
        result.comment
          .contentId,
      );

    await syncContentCommentCount(
      result.comment.contentType,
      result.comment.contentId,
      comments.length,
    );

    return NextResponse.json({
      success: true,
      deletedCommentId:
        result.comment.id,
      count:
        comments.length,
      traceId,
    });
  } catch (error) {
    console.error(
      "COMMENT DELETE ERROR",
      {
        error,
        traceId,
      },
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "댓글 삭제 중 오류가 발생했습니다.",
        traceId,
      },
      {
        status: 500,
      },
    );
  }
}
