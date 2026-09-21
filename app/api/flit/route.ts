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
  ProfileService,
} from "@/lib/profile/profile-service";

import {
  getCreatorConsentServerStatus,
} from "@/lib/creator/creator-consent-server";

import {
  addFlit,
  readFlits,
  type FlitVisibility,
} from "@/lib/flit/flit-store";

export const runtime = "nodejs";

const MAX_VIDEO_SIZE =
  200 * 1024 * 1024;

function makeTraceId() {
  return `FLIT-${Date.now()}-${randomUUID()
    .slice(0, 8)
    .toUpperCase()}`;
}

export async function GET() {
  const traceId =
    makeTraceId();

  try {
    const flits =
      await readFlits();

    return NextResponse.json({
      success: true,
      flits:
        flits.filter(
          (item) =>
            item.visibility ===
            "public",
        ),
      traceId,
    });
  } catch (error) {
    console.error(
      "FLIT LIST ERROR",
      {
        traceId,
        error,
      },
    );

    return NextResponse.json(
      {
        success: false,
        errorCode:
          "FLIT_LIST_FAILED",
        error:
          "FLIT 목록을 불러오지 못했습니다.",
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

  let savedFilePath = "";

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
            "FLIT_AUTH_REQUIRED",
          error:
            "로그인이 필요합니다.",
          traceId,
        },
        {
          status: 401,
        },
      );
    }

    const authService =
      new AuthService();

    const snapshot =
      await authService
        .getCurrentUserSnapshot(
          sessionToken,
        );

    if (!snapshot) {
      return NextResponse.json(
        {
          success: false,
          errorCode:
            "FLIT_SESSION_INVALID",
          error:
            "로그인 정보가 만료되었습니다.",
          traceId,
        },
        {
          status: 401,
        },
      );
    }

    const creatorConsent =
      await getCreatorConsentServerStatus(
        snapshot.userId,
      );

    if (!creatorConsent.accepted) {
      console.warn(
        "FLIT CREATOR CONSENT REQUIRED",
        {
          traceId,
          userId: snapshot.userId,
          creatorAccepted:
            creatorConsent.creatorAccepted,
          musicAccepted:
            creatorConsent.musicAccepted,
        },
      );

      return NextResponse.json(
        {
          success: false,
          errorCode:
            "FLIT_CREATOR_CONSENT_REQUIRED",
          error:
            "크리에이터 필수 정책 동의가 필요합니다.",
          traceId,
        },
        {
          status: 403,
        },
      );
    }

    const formData =
      await request.formData();

    const video =
      formData.get("video");

    const title =
      String(
        formData.get("title") ??
          "",
      ).trim();

    const description =
      String(
        formData.get(
          "description",
        ) ?? "",
      ).trim();

    const visibilityValue =
      String(
        formData.get(
          "visibility",
        ) ?? "public",
      );

    const isAdult =
      String(
        formData.get(
          "isAdult",
        ) ?? "false",
      ) === "true";

    const allowedVisibility:
      FlitVisibility[] = [
        "public",
        "followers",
        "private",
      ];

    const visibility =
      allowedVisibility.includes(
        visibilityValue as FlitVisibility,
      )
        ? (visibilityValue as FlitVisibility)
        : "public";

    if (
      !(video instanceof File)
    ) {
      return NextResponse.json(
        {
          success: false,
          errorCode:
            "FLIT_VIDEO_REQUIRED",
          error:
            "영상 파일을 선택해주세요.",
          traceId,
        },
        {
          status: 400,
        },
      );
    }

    if (!title) {
      return NextResponse.json(
        {
          success: false,
          errorCode:
            "FLIT_TITLE_REQUIRED",
          error:
            "제목을 입력해주세요.",
          traceId,
        },
        {
          status: 400,
        },
      );
    }

    if (
      !video.type.startsWith(
        "video/",
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          errorCode:
            "FLIT_INVALID_FILE_TYPE",
          error:
            "영상 파일만 업로드할 수 있습니다.",
          traceId,
        },
        {
          status: 400,
        },
      );
    }

    if (
      video.size >
      MAX_VIDEO_SIZE
    ) {
      return NextResponse.json(
        {
          success: false,
          errorCode:
            "FLIT_FILE_TOO_LARGE",
          error:
            "현재 테스트 업로드는 200MB 이하 영상만 가능합니다.",
          traceId,
        },
        {
          status: 400,
        },
      );
    }

    const extFromName =
      path
        .extname(video.name)
        .toLowerCase();

    const allowedExtensions =
      new Set([
        ".mp4",
        ".mov",
        ".webm",
        ".m4v",
      ]);

    const extension =
      allowedExtensions.has(
        extFromName,
      )
        ? extFromName
        : ".mp4";

    const flitId =
      randomUUID();

    const fileName =
      `${flitId}${extension}`;

    const uploadDir =
      path.join(
        process.cwd(),
        "public",
        "uploads",
        "flits",
      );

    await fs.mkdir(
      uploadDir,
      {
        recursive: true,
      },
    );

    savedFilePath =
      path.join(
        uploadDir,
        fileName,
      );

    const buffer =
      Buffer.from(
        await video.arrayBuffer(),
      );

    await fs.writeFile(
      savedFilePath,
      buffer,
    );

    let profile = null;

    try {
      profile =
        await new ProfileService()
          .getByUserId(
            snapshot.userId,
          );
    } catch {
      profile = null;
    }

    const flit =
      await addFlit({
        id: flitId,

        userId:
          snapshot.userId,

        username:
          snapshot.username ||
          "",

        displayName:
          profile?.nickname ||
          snapshot.displayName ||
          snapshot.username ||
          "FLATIST",

        avatarUrl:
          profile?.avatarUrl ||
          "",

        title,

        description,

        visibility,

        isAdult,

        videoUrl:
          `/uploads/flits/${fileName}`,

        originalFileName:
          video.name,

        createdAt:
          new Date()
            .toISOString(),

        views: 0,
        likes: 0,
        greats: 0,
        bests: 0,
        comments: 0,
      });

    console.log(
      "FLIT UPLOAD SUCCESS",
      {
        traceId,
        flitId:
          flit.id,
        userId:
          snapshot.userId,
        videoSize:
          video.size,
      },
    );

    return NextResponse.json({
      success: true,
      flit,
      traceId,
    });
  } catch (error) {
    console.error(
      "FLIT UPLOAD ERROR",
      {
        traceId,
        error,
      },
    );

    if (savedFilePath) {
      try {
        await fs.unlink(
          savedFilePath,
        );
      } catch {
        // 업로드 실패 정리 과정에서는
        // 원래 오류를 유지합니다.
      }
    }

    return NextResponse.json(
      {
        success: false,
        errorCode:
          "FLIT_UPLOAD_FAILED",
        error:
          "FLIT 업로드 중 오류가 발생했습니다.",
        traceId,
      },
      {
        status: 500,
      },
    );
  }
}
