import { NextResponse } from "next/server";

import { AuthService } from "@/lib/auth/auth-service";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      email?: string;
    };

    const email = body.email?.toString().trim();

    if (!email) {
      return NextResponse.json(
        {
          success: false,
          error: "이메일을 입력해주세요.",
        },
        { status: 400 },
      );
    }

    const authService = new AuthService();
    const result = await authService.sendPasswordResetEmail(email);

    // 계정 존재 여부를 외부에 노출하지 않기 위해 항상 동일한 응답
    return NextResponse.json(
      {
        success: result.success,
        message: result.message,
      },
      { status: 200 },
    );
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: "이메일 발송 중 오류가 발생했습니다.",
      },
      { status: 500 },
    );
  }
}
