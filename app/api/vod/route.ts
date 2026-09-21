import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

import { AuthService } from "@/lib/auth/auth-service";
import { SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { ProfileService } from "@/lib/profile/profile-service";
import {
  getCreatorConsentServerStatus,
} from "@/lib/creator/creator-consent-server";

import {
  addVod,
  readVods,
  type VodVisibility,
} from "@/lib/vod/vod-store";

export const runtime = "nodejs";

const MAX_VIDEO_SIZE = 500 * 1024 * 1024;
const MAX_THUMBNAIL_SIZE = 5 * 1024 * 1024;

const THUMBNAIL_MIME_TO_EXTENSION: Record<
  string,
  string
> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

function matchesImageSignature(
  bytes: Uint8Array,
  mime: string,
) {
  if (mime === "image/jpeg") {
    return (
      bytes.length >= 3 &&
      bytes[0] === 0xff &&
      bytes[1] === 0xd8 &&
      bytes[2] === 0xff
    );
  }

  if (mime === "image/png") {
    return (
      bytes.length >= 8 &&
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47 &&
      bytes[4] === 0x0d &&
      bytes[5] === 0x0a &&
      bytes[6] === 0x1a &&
      bytes[7] === 0x0a
    );
  }

  if (mime === "image/webp") {
    return (
      bytes.length >= 12 &&
      String.fromCharCode(
        ...bytes.slice(0, 4),
      ) === "RIFF" &&
      String.fromCharCode(
        ...bytes.slice(8, 12),
      ) === "WEBP"
    );
  }

  return false;
}

function makeTraceId() {
  return `VOD-${Date.now()}-${randomUUID()
    .slice(0, 8)
    .toUpperCase()}`;
}

export async function GET() {
  const traceId = makeTraceId();

  try {
    const vods = await readVods();

    return NextResponse.json({
      success: true,
      vods: vods.filter(
        (item) => item.visibility === "public",
      ),
      traceId,
    });
  } catch (error) {
    console.error("VOD LIST ERROR", {
      traceId,
      error,
    });

    return NextResponse.json(
      {
        success: false,
        errorCode: "VOD_LIST_FAILED",
        error: "VOD 목록을 불러오지 못했습니다.",
        traceId,
      },
      {
        status: 500,
      },
    );
  }
}

export async function POST(request: Request) {
  const traceId = makeTraceId();
  let savedFilePath = "";
  let savedThumbnailPath = "";

  try {
    const cookieStore = await cookies();

    const sessionToken = cookieStore.get(
      SESSION_COOKIE_NAME,
    )?.value;

    if (!sessionToken) {
      return NextResponse.json(
        {
          success: false,
          errorCode: "VOD_AUTH_REQUIRED",
          error: "로그인이 필요합니다.",
          traceId,
        },
        {
          status: 401,
        },
      );
    }

    const snapshot = await new AuthService()
      .getCurrentUserSnapshot(sessionToken);

    if (!snapshot) {
      return NextResponse.json(
        {
          success: false,
          errorCode: "VOD_SESSION_INVALID",
          error: "로그인 정보가 만료되었습니다.",
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
        "VOD CREATOR CONSENT REQUIRED",
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
            "VOD_CREATOR_CONSENT_REQUIRED",
          error:
            "크리에이터 필수 정책 동의가 필요합니다.",
          traceId,
        },
        {
          status: 403,
        },
      );
    }

    const formData = await request.formData();

    const video = formData.get("video");
    const thumbnail = formData.get(
      "thumbnail",
    );

    const title = String(
      formData.get("title") ?? "",
    ).trim();

    const description = String(
      formData.get("description") ?? "",
    ).trim();

    const visibilityValue = String(
      formData.get("visibility") ?? "public",
    );

    const isAdult =
      String(
        formData.get("isAdult") ?? "false",
      ) === "true";

    const allowedVisibility: VodVisibility[] = [
      "public",
      "followers",
      "private",
    ];

    const visibility =
      allowedVisibility.includes(
        visibilityValue as VodVisibility,
      )
        ? (visibilityValue as VodVisibility)
        : "public";

    if (!(video instanceof File)) {
      return NextResponse.json(
        {
          success: false,
          errorCode: "VOD_VIDEO_REQUIRED",
          error: "영상 파일을 선택해주세요.",
          traceId,
        },
        {
          status: 400,
        },
      );
    }

    if (!(thumbnail instanceof File)) {
      return NextResponse.json(
        {
          success: false,
          errorCode:
            "VOD_THUMBNAIL_REQUIRED",
          error:
            "VOD 썸네일 이미지를 선택해주세요.",
          traceId,
        },
        {
          status: 400,
        },
      );
    }

    const thumbnailExtension =
      THUMBNAIL_MIME_TO_EXTENSION[
        thumbnail.type
      ];

    if (!thumbnailExtension) {
      return NextResponse.json(
        {
          success: false,
          errorCode:
            "VOD_THUMBNAIL_TYPE_INVALID",
          error:
            "썸네일은 JPG, PNG, WEBP 이미지만 사용할 수 있습니다.",
          traceId,
        },
        {
          status: 400,
        },
      );
    }

    if (
      thumbnail.size <= 0 ||
      thumbnail.size >
        MAX_THUMBNAIL_SIZE
    ) {
      return NextResponse.json(
        {
          success: false,
          errorCode:
            "VOD_THUMBNAIL_TOO_LARGE",
          error:
            "썸네일 이미지는 5MB 이하만 업로드할 수 있습니다.",
          traceId,
        },
        {
          status: 400,
        },
      );
    }

    const thumbnailBytes =
      new Uint8Array(
        await thumbnail.arrayBuffer(),
      );

    if (
      !matchesImageSignature(
        thumbnailBytes,
        thumbnail.type,
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          errorCode:
            "VOD_THUMBNAIL_INVALID",
          error:
            "올바른 썸네일 이미지 파일이 아닙니다.",
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
          errorCode: "VOD_TITLE_REQUIRED",
          error: "제목을 입력해주세요.",
          traceId,
        },
        {
          status: 400,
        },
      );
    }

    if (!video.type.startsWith("video/")) {
      return NextResponse.json(
        {
          success: false,
          errorCode: "VOD_INVALID_FILE_TYPE",
          error: "영상 파일만 업로드할 수 있습니다.",
          traceId,
        },
        {
          status: 400,
        },
      );
    }

    if (video.size > MAX_VIDEO_SIZE) {
      return NextResponse.json(
        {
          success: false,
          errorCode: "VOD_FILE_TOO_LARGE",
          error:
            "현재 테스트 업로드는 500MB 이하 영상만 가능합니다.",
          traceId,
        },
        {
          status: 400,
        },
      );
    }

    const extFromName = path
      .extname(video.name)
      .toLowerCase();

    const allowedExtensions = new Set([
      ".mp4",
      ".mov",
      ".webm",
      ".m4v",
    ]);

    const extension = allowedExtensions.has(
      extFromName,
    )
      ? extFromName
      : ".mp4";

    const vodId = randomUUID();
    const fileName = `${vodId}${extension}`;

    const uploadDir = path.join(
      process.cwd(),
      "public",
      "uploads",
      "vods",
    );

    await fs.mkdir(uploadDir, {
      recursive: true,
    });

    savedFilePath = path.join(
      uploadDir,
      fileName,
    );

    const buffer = Buffer.from(
      await video.arrayBuffer(),
    );

    await fs.writeFile(
      savedFilePath,
      buffer,
    );

    const thumbnailDir = path.join(
      process.cwd(),
      "public",
      "uploads",
      "vod-thumbnails",
    );

    await fs.mkdir(
      thumbnailDir,
      {
        recursive: true,
      },
    );

    const thumbnailFileName =
      `${vodId}.${thumbnailExtension}`;

    savedThumbnailPath =
      path.join(
        thumbnailDir,
        thumbnailFileName,
      );

    await fs.writeFile(
      savedThumbnailPath,
      thumbnailBytes,
      {
        flag: "wx",
      },
    );

    let profile = null;

    try {
      profile = await new ProfileService()
        .getByUserId(snapshot.userId);
    } catch {
      profile = null;
    }

    const vod = await addVod({
      id: vodId,
      userId: snapshot.userId,
      username: snapshot.username || "",
      displayName:
        profile?.nickname ||
        snapshot.displayName ||
        snapshot.username ||
        "FLATIST",
      avatarUrl: profile?.avatarUrl || "",
      title,
      description,
      visibility,
      isAdult,
      videoUrl: `/uploads/vods/${fileName}`,
      thumbnailUrl:
        `/uploads/vod-thumbnails/${thumbnailFileName}`,
      originalFileName: video.name,
    });

    console.log("VOD UPLOAD SUCCESS", {
      traceId,
      vodId,
      userId: snapshot.userId,
      fileName,
      thumbnailFileName,
      size: video.size,
      thumbnailSize:
        thumbnail.size,
    });

    return NextResponse.json({
      success: true,
      vod,
      traceId,
    });
  } catch (error) {
    console.error("VOD UPLOAD ERROR", {
      traceId,
      error,
    });

    if (savedFilePath) {
      try {
        await fs.unlink(savedFilePath);
      } catch {
        // ignore cleanup failure
      }
    }

    if (savedThumbnailPath) {
      try {
        await fs.unlink(
          savedThumbnailPath,
        );
      } catch {
        // ignore cleanup failure
      }
    }

    return NextResponse.json(
      {
        success: false,
        errorCode: "VOD_UPLOAD_FAILED",
        error: "VOD 업로드에 실패했습니다.",
        traceId,
      },
      {
        status: 500,
      },
    );
  }
}
