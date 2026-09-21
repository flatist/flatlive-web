import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { AuthService } from "@/lib/auth/auth-service";
import { SESSION_COOKIE_NAME } from "@/lib/auth/session";

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (!sessionToken) {
      return NextResponse.json(
        {
          success: false,
          error: "로그인이 필요합니다.",
        },
        { status: 401 },
      );
    }

    const body = (await request.json()) as {
      token?: string;
    };

    const token = body.token?.toString().trim();

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          error: "인증 토큰이 필요합니다.",
        },
        { status: 400 },
      );
    }

    // 현재 로그인된 사용자의 userId 추출
    const { parseSessionToken } = await import("@/lib/auth/session");
    const payload = parseSessionToken(sessionToken);
    if (!payload?.userId) {
      return NextResponse.json(
        {
          success: false,
          error: "잘못된 세션입니다.",
        },
        { status: 401 },
      );
    }

    const authService = new AuthService();
    const result = await authService.completeEmailVerification(payload.userId, token);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "이메일 인증이 완료되었습니다.",
      },
      { status: 200 },
    );
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: "이메일 인증 중 오류가 발생했습니다.",
      },
      { status: 500 },
    );
  }
}
