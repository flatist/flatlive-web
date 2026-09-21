import fs from "fs/promises";
import path from "path";

import { NextResponse } from "next/server";

import { requireAuthenticatedUser } from "@/lib/auth/authorization";

export const dynamic = "force-dynamic";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["image/gif", "gif"],
]);

function safeFileNamePart(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80);
}

export async function POST(request: Request) {
  try {
    const user = await requireAuthenticatedUser();
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        {
          success: false,
          error: "VIP_IMAGE_REQUIRED",
          message: "업로드할 VIP 이미지를 선택해주세요.",
        },
        { status: 400 },
      );
    }

    if (file.size <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: "VIP_IMAGE_EMPTY",
          message: "빈 이미지는 업로드할 수 없습니다.",
        },
        { status: 400 },
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          success: false,
          error: "VIP_IMAGE_TOO_LARGE",
          message: "VIP 이미지는 5MB 이하만 업로드할 수 있습니다.",
        },
        { status: 400 },
      );
    }

    const extension = ALLOWED_TYPES.get(file.type);

    if (!extension) {
      return NextResponse.json(
        {
          success: false,
          error: "VIP_IMAGE_TYPE_NOT_ALLOWED",
          message: "jpg, png, webp, gif 이미지만 업로드할 수 있습니다.",
        },
        { status: 400 },
      );
    }

    const uploadDir = path.join(
      process.cwd(),
      "public",
      "uploads",
      "fan-card",
    );

    await fs.mkdir(uploadDir, { recursive: true });

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const userIdPart = safeFileNamePart(user.userId);
    const fileName = `vip-${userIdPart}-${Date.now()}.${extension}`;
    const filePath = path.join(uploadDir, fileName);

    await fs.writeFile(filePath, buffer);

    const imageUrl = `/uploads/fan-card/${fileName}`;

    return NextResponse.json({
      success: true,
      imageUrl,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "VIP 이미지를 업로드하지 못했습니다.";

    return NextResponse.json(
      {
        success: false,
        error: message.includes("UNAUTHORIZED")
          ? "UNAUTHORIZED"
          : "VIP_IMAGE_UPLOAD_FAILED",
        message,
      },
      {
        status: message.includes("UNAUTHORIZED") ? 401 : 500,
      },
    );
  }
}
