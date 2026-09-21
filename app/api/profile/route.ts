import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { parseSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { ProfileService } from "@/lib/profile/profile-service";

async function currentUserId() {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  return token ? parseSessionToken(token)?.userId ?? null : null;
}

export async function GET() {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const profile = await new ProfileService().getByUserId(userId);
  return NextResponse.json({ profile });
}

export async function PUT(request: Request) {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  try {
    const body = await request.json();
    const profile = await new ProfileService().update(userId, {
      nickname: typeof body.nickname === "string" ? body.nickname : "",
      bio: typeof body.bio === "string" ? body.bio : "",
      avatarUrl: typeof body.avatarUrl === "string" ? body.avatarUrl : "",
      isPublic: body.isPublic !== false,
    });
    return NextResponse.json({ profile });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "프로필 저장에 실패했습니다." },
      { status: 400 },
    );
  }
}
