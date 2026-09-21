import {
  NextResponse,
} from "next/server";

import {
  cookies,
} from "next/headers";

import {
  AuthService,
} from "@/lib/auth/auth-service";

import {
  SESSION_COOKIE_NAME,
} from "@/lib/auth/session";

import {
  readBlockedUserIds,
  setUserBlocked,
} from "@/lib/social/block-store";

async function getUser() {
  const token =
    (
      await cookies()
    ).get(
      SESSION_COOKIE_NAME,
    )?.value;

  if (!token) {
    return null;
  }

  return new AuthService()
    .getCurrentUserSnapshot(
      token,
    );
}

export async function GET() {
  const user =
    await getUser();

  if (!user) {
    return NextResponse.json(
      {
        success: false,
        error:
          "로그인이 필요합니다.",
      },
      {
        status: 401,
      },
    );
  }

  return NextResponse.json({
    success: true,
    blockedUserIds:
      await readBlockedUserIds(
        user.userId,
      ),
  });
}

export async function POST(
  request: Request,
) {
  const user =
    await getUser();

  if (!user) {
    return NextResponse.json(
      {
        success: false,
        error:
          "로그인이 필요합니다.",
      },
      {
        status: 401,
      },
    );
  }

  const body =
    await request.json();

  const targetUserId =
    typeof body?.targetUserId ===
      "string"
      ? body.targetUserId.trim()
      : "";

  const blocked =
    body?.blocked !== false;

  if (!targetUserId) {
    return NextResponse.json(
      {
        success: false,
        error:
          "차단할 사용자 정보가 필요합니다.",
      },
      {
        status: 400,
      },
    );
  }

  if (
    targetUserId ===
    user.userId
  ) {
    return NextResponse.json(
      {
        success: false,
        error:
          "본인은 차단할 수 없습니다.",
      },
      {
        status: 400,
      },
    );
  }

  const result =
    await setUserBlocked({
      userId:
        user.userId,
      targetUserId,
      blocked,
    });

  return NextResponse.json({
    success: true,
    ...result,
  });
}
