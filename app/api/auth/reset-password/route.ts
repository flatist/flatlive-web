import { NextResponse } from "next/server";

import { AuthService } from "@/lib/auth/auth-service";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      userId?: string;
      token?: string;
      password?: string;
      confirmPassword?: string;
    };

    const userId = body.userId?.toString().trim();
    const token = body.token?.toString().trim();
    const password = body.password;
    const confirmPassword = body.confirmPassword;

    if (!userId || !token) {
      return NextResponse.json(
        {
          success: false,
          error: "잘못된 요청입니다.",
        },
        { status: 400 },
      );
    }

    if (!password || !confirmPassword) {
      return NextResponse.json(
        {
          success: false,
          error: "비밀번호를 입력해주세요.",
        },
        { status: 400 },
      );
    }

    const authService = new AuthService();
    const result = await authService.resetPassword(userId, token, password, confirmPassword);

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
        message: "비밀번호가 변경되었습니다.",
      },
      { status: 200 },
    );
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: "비밀번호 재설정 중 오류가 발생했습니다.",
      },
      { status: 500 },
    );
  }
}
