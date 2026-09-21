import { randomUUID } from "crypto";
import fs from "fs/promises";
import path from "path";

import { NextResponse } from "next/server";

import {
  AuthenticationError,
  AuthorizationError,
  requirePermission,
} from "@/lib/auth/authorization";

type DonationEffectMediaType =
  | "image"
  | "video";

type DonationEffectType =
  | "single_video"
  | "continuous_image";

type DonationEffect = {
  id: string;
  name: string;

  amount: number;

  effectType: DonationEffectType;

  mediaType: DonationEffectMediaType;
  mediaUrl: string;
  originalFileName: string;

  durationMs?: number;
  enabled: boolean;

  createdAt: string;
  updatedAt: string;
};

const DATA_FILE = path.join(
  process.cwd(),
  "data",
  "donation-effects.json",
);

const UPLOAD_DIR = path.join(
  process.cwd(),
  "public",
  "uploads",
  "donation-effects",
);

const MAX_IMAGE_SIZE =
  10 * 1024 * 1024;

const MAX_VIDEO_SIZE =
  100 * 1024 * 1024;

const IMAGE_MIME_TO_EXTENSION:
  Record<string, string> = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
  };

const VIDEO_MIME_TO_EXTENSION:
  Record<string, string> = {
    "video/mp4": ".mp4",
    "video/webm": ".webm",
    "video/quicktime": ".mov",
    "video/x-m4v": ".m4v",
  };

async function readEffects():
  Promise<DonationEffect[]> {
  try {
    const raw =
      await fs.readFile(
        DATA_FILE,
        "utf8",
      );

    const parsed =
      JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.map(
      (item) => ({
        ...item,
        effectType:
          item.effectType ===
            "continuous_image"
            ? "continuous_image"
            : item.effectType ===
                "single_video"
              ? "single_video"
              : item.mediaType ===
                  "image"
                ? "continuous_image"
                : "single_video",
      }),
    );
  } catch (error) {
    const code =
      (
        error as NodeJS.ErrnoException
      ).code;

    if (code === "ENOENT") {
      return [];
    }

    throw error;
  }
}

async function writeEffects(
  effects: DonationEffect[],
) {
  await fs.mkdir(
    path.dirname(DATA_FILE),
    {
      recursive: true,
    },
  );

  const tempFile =
    `${DATA_FILE}.${randomUUID()}.tmp`;

  await fs.writeFile(
    tempFile,
    JSON.stringify(
      effects,
      null,
      2,
    ),
    "utf8",
  );

  await fs.rename(
    tempFile,
    DATA_FILE,
  );
}

function parsePositiveInteger(
  value: FormDataEntryValue | null,
) {
  const parsed =
    Number(
      String(value ?? "").trim(),
    );

  if (
    !Number.isSafeInteger(parsed) ||
    parsed < 1
  ) {
    return null;
  }

  return parsed;
}

function parseOptionalPositiveInteger(
  value: FormDataEntryValue | null,
) {
  const text =
    String(value ?? "").trim();

  if (!text) {
    return null;
  }

  const parsed =
    Number(text);

  if (
    !Number.isSafeInteger(parsed) ||
    parsed < 1
  ) {
    return undefined;
  }

  return parsed;
}

function getMediaInfo(
  file: File,
) {
  const imageExtension =
    IMAGE_MIME_TO_EXTENSION[
      file.type
    ];

  if (imageExtension) {
    return {
      mediaType:
        "image" as const,
      extension:
        imageExtension,
      maxSize:
        MAX_IMAGE_SIZE,
    };
  }

  const videoExtension =
    VIDEO_MIME_TO_EXTENSION[
      file.type
    ];

  if (videoExtension) {
    return {
      mediaType:
        "video" as const,
      extension:
        videoExtension,
      maxSize:
        MAX_VIDEO_SIZE,
    };
  }

  return null;
}

function authErrorResponse(
  error: unknown,
  traceId: string,
) {
  if (
    error instanceof
    AuthenticationError
  ) {
    return NextResponse.json(
      {
        success: false,
        errorCode:
          "DONATION_EFFECT_AUTH_REQUIRED",
        error: error.message,
        traceId,
      },
      {
        status: 401,
      },
    );
  }

  if (
    error instanceof
    AuthorizationError
  ) {
    return NextResponse.json(
      {
        success: false,
        errorCode:
          "DONATION_EFFECT_FORBIDDEN",
        error: error.message,
        traceId,
      },
      {
        status: 403,
      },
    );
  }

  return null;
}

export async function GET() {
  const traceId =
    randomUUID();

  try {
    await requirePermission(
      "DONATION_READ",
    );

    const effects =
      await readEffects();

    return NextResponse.json({
      success: true,
      effects: effects.sort(
        (a, b) =>
          a.amount -
          b.amount,
      ),
      traceId,
    });
  } catch (error) {
    const authResponse =
      authErrorResponse(
        error,
        traceId,
      );

    if (authResponse) {
      return authResponse;
    }

    console.error(
      "DONATION EFFECT LIST FAILED",
      {
        traceId,
        error:
          error instanceof Error
            ? error.message
            : "unknown error",
      },
    );

    return NextResponse.json(
      {
        success: false,
        errorCode:
          "DONATION_EFFECT_LIST_FAILED",
        error:
          "후원 효과 목록을 불러오지 못했습니다.",
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
    randomUUID();

  let savedFilePath:
    | string
    | null = null;

  try {
    await requirePermission(
      "DONATION_READ",
    );

    const formData =
      await request.formData();

    const name =
      String(
        formData.get("name") ??
          "",
      ).trim();

    const amount =
      parsePositiveInteger(
        formData.get(
          "amount",
        ),
      );

    const effectTypeValue =
      String(
        formData.get(
          "effectType",
        ) ?? "",
      ).trim();

    const effectType:
      DonationEffectType | null =
      effectTypeValue ===
        "single_video" ||
      effectTypeValue ===
        "continuous_image"
        ? effectTypeValue
        : null;

    const enabled =
      String(
        formData.get("enabled") ??
          "true",
      ) !== "false";

    const file =
      formData.get("file");

    if (!name) {
      return NextResponse.json(
        {
          success: false,
          errorCode:
            "DONATION_EFFECT_NAME_REQUIRED",
          error:
            "이펙트명을 입력해주세요.",
          traceId,
        },
        {
          status: 400,
        },
      );
    }

    if (name.length > 80) {
      return NextResponse.json(
        {
          success: false,
          errorCode:
            "DONATION_EFFECT_NAME_TOO_LONG",
          error:
            "이펙트명은 80자 이하로 입력해주세요.",
          traceId,
        },
        {
          status: 400,
        },
      );
    }

    if (amount === null) {
      return NextResponse.json(
        {
          success: false,
          errorCode:
            "DONATION_EFFECT_AMOUNT_INVALID",
          error:
            "후원금액을 확인해주세요.",
          traceId,
        },
        {
          status: 400,
        },
      );
    }

    if (!effectType) {
      return NextResponse.json(
        {
          success: false,
          errorCode:
            "DONATION_EFFECT_TYPE_INVALID",
          error:
            "후원 효과 종류를 확인해주세요.",
          traceId,
        },
        {
          status: 400,
        },
      );
    }

    if (!(file instanceof File)) {
      return NextResponse.json(
        {
          success: false,
          errorCode:
            "DONATION_EFFECT_FILE_REQUIRED",
          error:
            "이미지 또는 영상 파일을 선택해주세요.",
          traceId,
        },
        {
          status: 400,
        },
      );
    }

    const mediaInfo =
      getMediaInfo(file);

    if (!mediaInfo) {
      return NextResponse.json(
        {
          success: false,
          errorCode:
            "DONATION_EFFECT_FILE_TYPE_INVALID",
          error:
            "JPG, PNG, WEBP, GIF, MP4, WEBM, MOV, M4V 파일만 사용할 수 있습니다.",
          traceId,
        },
        {
          status: 400,
        },
      );
    }

    if (
      effectType ===
        "single_video" &&
      mediaInfo.mediaType !== "video"
    ) {
      return NextResponse.json(
        {
          success: false,
          errorCode:
            "DONATION_EFFECT_SINGLE_VIDEO_REQUIRED",
          error:
            "1회 선물 효과에는 영상 파일만 등록할 수 있습니다.",
          traceId,
        },
        {
          status: 400,
        },
      );
    }

    if (
      effectType ===
        "continuous_image" &&
      mediaInfo.mediaType !== "image"
    ) {
      return NextResponse.json(
        {
          success: false,
          errorCode:
            "DONATION_EFFECT_CONTINUOUS_IMAGE_REQUIRED",
          error:
            "연속 선물 효과에는 이미지 파일만 등록할 수 있습니다.",
          traceId,
        },
        {
          status: 400,
        },
      );
    }

    if (
      file.size <= 0 ||
      file.size >
        mediaInfo.maxSize
    ) {
      return NextResponse.json(
        {
          success: false,
          errorCode:
            "DONATION_EFFECT_FILE_SIZE_INVALID",
          error:
            mediaInfo.mediaType ===
            "image"
              ? "이미지는 10MB 이하만 업로드할 수 있습니다."
              : "영상은 100MB 이하만 업로드할 수 있습니다.",
          traceId,
        },
        {
          status: 400,
        },
      );
    }

    const id =
      randomUUID();

    const fileName =
      `${id}${mediaInfo.extension}`;

    await fs.mkdir(
      UPLOAD_DIR,
      {
        recursive: true,
      },
    );

    savedFilePath =
      path.join(
        UPLOAD_DIR,
        fileName,
      );

    const bytes =
      Buffer.from(
        await file.arrayBuffer(),
      );

    await fs.writeFile(
      savedFilePath,
      bytes,
      {
        flag: "wx",
      },
    );

    const now =
      new Date().toISOString();

    const effect:
      DonationEffect = {
      id,
      name,

      amount,

      effectType,

      mediaType:
        mediaInfo.mediaType,

      mediaUrl:
        `/uploads/donation-effects/${fileName}`,

      originalFileName:
        file.name,

      enabled,

      createdAt: now,
      updatedAt: now,
    };

    const effects =
      await readEffects();

    effects.push(effect);

    await writeEffects(
      effects,
    );

    console.log(
      "DONATION EFFECT CREATED",
      {
        traceId,
        effectId:
          effect.id,
        amount:
          effect.amount,
        mediaType:
          effect.mediaType,
        effectType:
          effect.effectType,
      },
    );

    return NextResponse.json(
      {
        success: true,
        effect,
        traceId,
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    if (savedFilePath) {
      try {
        await fs.unlink(
          savedFilePath,
        );
      } catch {
        // 파일이 없으면 무시
      }
    }

    const authResponse =
      authErrorResponse(
        error,
        traceId,
      );

    if (authResponse) {
      return authResponse;
    }

    console.error(
      "DONATION EFFECT CREATE FAILED",
      {
        traceId,
        error:
          error instanceof Error
            ? error.message
            : "unknown error",
      },
    );

    return NextResponse.json(
      {
        success: false,
        errorCode:
          "DONATION_EFFECT_CREATE_FAILED",
        error:
          "후원 효과 등록에 실패했습니다.",
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
    randomUUID();

  try {
    await requirePermission(
      "DONATION_READ",
    );

    const body =
      await request.json();

    const effectId =
      String(
        body?.effectId ?? "",
      ).trim();

    if (!effectId) {
      return NextResponse.json(
        {
          success: false,
          errorCode:
            "DONATION_EFFECT_ID_REQUIRED",
          error:
            "삭제할 후원 효과 ID가 필요합니다.",
          traceId,
        },
        {
          status: 400,
        },
      );
    }

    const effects =
      await readEffects();

    const target =
      effects.find(
        (effect) =>
          effect.id === effectId,
      );

    if (!target) {
      return NextResponse.json(
        {
          success: false,
          errorCode:
            "DONATION_EFFECT_NOT_FOUND",
          error:
            "삭제할 후원 효과를 찾을 수 없습니다.",
          traceId,
        },
        {
          status: 404,
        },
      );
    }

    const nextEffects =
      effects.filter(
        (effect) =>
          effect.id !== effectId,
      );

    await writeEffects(
      nextEffects,
    );

    if (
      target.mediaUrl.startsWith(
        "/uploads/donation-effects/",
      )
    ) {
      const fileName =
        path.basename(
          target.mediaUrl,
        );

      const filePath =
        path.join(
          UPLOAD_DIR,
          fileName,
        );

      try {
        await fs.unlink(
          filePath,
        );
      } catch (error) {
        const code =
          (
            error as NodeJS.ErrnoException
          ).code;

        if (code !== "ENOENT") {
          console.error(
            "DONATION EFFECT FILE DELETE FAILED",
            {
              traceId,
              effectId,
              filePath,
              error:
                error instanceof Error
                  ? error.message
                  : "unknown error",
            },
          );
        }
      }
    }

    console.log(
      "DONATION EFFECT DELETED",
      {
        traceId,
        effectId,
        amount:
          target.amount,
      },
    );

    return NextResponse.json({
      success: true,
      effectId,
      traceId,
    });
  } catch (error) {
    const authResponse =
      authErrorResponse(
        error,
        traceId,
      );

    if (authResponse) {
      return authResponse;
    }

    console.error(
      "DONATION EFFECT DELETE FAILED",
      {
        traceId,
        error:
          error instanceof Error
            ? error.message
            : "unknown error",
      },
    );

    return NextResponse.json(
      {
        success: false,
        errorCode:
          "DONATION_EFFECT_DELETE_FAILED",
        error:
          "후원 효과 삭제에 실패했습니다.",
        traceId,
      },
      {
        status: 500,
      },
    );
  }
}
