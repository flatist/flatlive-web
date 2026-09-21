import {
  NextResponse,
} from "next/server";

import {
  cookies,
} from "next/headers";

import {
  randomUUID,
} from "node:crypto";

import fs from "node:fs/promises";
import path from "node:path";

import {
  AuthService,
} from "@/lib/auth/auth-service";

import {
  SESSION_COOKIE_NAME,
} from "@/lib/auth/session";

import {
  deleteVodByOwner,
  readVods,
} from "@/lib/vod/vod-store";

import {
  deleteLikesForContent,
} from "@/lib/reaction/like-store";

export const runtime = "nodejs";

function makeTraceId() {
  return `VOD-DELETE-${Date.now()}-${randomUUID()
    .slice(0, 8)
    .toUpperCase()}`;
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
          errorCode:
            "VOD_DELETE_AUTH_REQUIRED",
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
          errorCode:
            "VOD_DELETE_SESSION_INVALID",
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
          errorCode:
            "VOD_DELETE_INVALID_JSON",
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
            "VOD_DELETE_INVALID_BODY",
          error:
            "요청 형식이 올바르지 않습니다.",
          traceId,
        },
        {
          status: 400,
        },
      );
    }

    const vodId =
      "vodId" in body &&
      typeof body.vodId ===
        "string"
        ? body.vodId.trim()
        : "";

    if (!vodId) {
      return NextResponse.json(
        {
          success: false,
          errorCode:
            "VOD_DELETE_ID_REQUIRED",
          error:
            "VOD ID가 필요합니다.",
          traceId,
        },
        {
          status: 400,
        },
      );
    }

    const vods =
      await readVods();

    const target =
      vods.find(
        (item) =>
          item.id === vodId,
      );

    if (!target) {
      return NextResponse.json(
        {
          success: false,
          errorCode:
            "VOD_DELETE_NOT_FOUND",
          error:
            "VOD를 찾을 수 없습니다.",
          traceId,
        },
        {
          status: 404,
        },
      );
    }

    if (
      target.userId !==
      snapshot.userId
    ) {
      return NextResponse.json(
        {
          success: false,
          errorCode:
            "VOD_DELETE_FORBIDDEN",
          error:
            "본인이 올린 VOD만 삭제할 수 있습니다.",
          traceId,
        },
        {
          status: 403,
        },
      );
    }

    const deleted =
      await deleteVodByOwner(
        vodId,
        snapshot.userId,
      );

    if (!deleted) {
      return NextResponse.json(
        {
          success: false,
          errorCode:
            "VOD_DELETE_NOT_FOUND",
          error:
            "VOD를 찾을 수 없습니다.",
          traceId,
        },
        {
          status: 404,
        },
      );
    }

    let fileDeleted = false;

    if (
      deleted.videoUrl.startsWith(
        "/uploads/vods/",
      )
    ) {
      const fileName =
        path.basename(
          deleted.videoUrl,
        );

      const filePath =
        path.join(
          process.cwd(),
          "public",
          "uploads",
          "vods",
          fileName,
        );

      try {
        await fs.unlink(
          filePath,
        );

        fileDeleted = true;
      } catch (error) {
        const code =
          (
            error as NodeJS.ErrnoException
          )?.code;

        if (
          code === "ENOENT"
        ) {
          fileDeleted = true;
        } else {
          console.error(
            "VOD DELETE FILE CLEANUP ERROR",
            {
              traceId,
              vodId,
              filePath,
              error,
            },
          );
        }
      }
    }

    let removedLikes = 0;

    try {
      removedLikes =
        await deleteLikesForContent(
          "VOD",
          vodId,
        );
    } catch (error) {
      console.error(
        "VOD DELETE LIKE CLEANUP ERROR",
        {
          traceId,
          vodId,
          error,
        },
      );
    }

    console.log(
      "VOD DELETE SUCCESS",
      {
        traceId,
        vodId,
        userId:
          snapshot.userId,
        fileDeleted,
        removedLikes,
      },
    );

    return NextResponse.json({
      success: true,
      vodId,
      fileDeleted,
      removedLikes,
      traceId,
    });
  } catch (error) {
    console.error(
      "VOD DELETE ERROR",
      {
        traceId,
        error,
      },
    );

    return NextResponse.json(
      {
        success: false,
        errorCode:
          "VOD_DELETE_FAILED",
        error:
          "VOD 삭제에 실패했습니다.",
        traceId,
      },
      {
        status: 500,
      },
    );
  }
}
