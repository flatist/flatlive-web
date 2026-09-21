import { randomUUID } from "crypto";
import fs from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { parseSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth/session";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MIME_TO_EXTENSION: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

async function currentUserId() {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  return token ? parseSessionToken(token)?.userId ?? null : null;
}

function matchesImageSignature(bytes: Uint8Array, mime: string) {
  if (mime === "image/jpeg") {
    return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
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
      String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
      String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
    );
  }
  return false;
}

export async function POST(request: Request) {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  try {
    const formData = await request.formData();
    const file = formData.get("avatar");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "이미지 파일을 선택해주세요." }, { status: 400 });
    }

    const extension = MIME_TO_EXTENSION[file.type];
    if (!extension) {
      return NextResponse.json({ error: "JPG, PNG, WEBP 이미지만 사용할 수 있습니다." }, { status: 400 });
    }
    if (file.size <= 0 || file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "프로필 이미지는 5MB 이하만 업로드할 수 있습니다." }, { status: 400 });
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    if (!matchesImageSignature(bytes, file.type)) {
      return NextResponse.json({ error: "올바른 이미지 파일이 아닙니다." }, { status: 400 });
    }

    const safeUserId = userId.replace(/[^A-Za-z0-9_-]/g, "");
    const filename = `${safeUserId}-${Date.now()}-${randomUUID()}.${extension}`;
    const uploadDir = path.join(process.cwd(), "public", "uploads", "avatars");
    const outputPath = path.join(uploadDir, filename);

    await fs.mkdir(uploadDir, { recursive: true });
    await fs.writeFile(outputPath, bytes, { flag: "wx" });

    return NextResponse.json({ avatarUrl: `/uploads/avatars/${filename}` });
  } catch (error) {
    console.error("Profile avatar upload failed", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ error: "프로필 이미지 업로드에 실패했습니다." }, { status: 500 });
  }
}
