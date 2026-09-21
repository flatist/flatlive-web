import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { AuthService } from "@/lib/auth/auth-service";
import { SESSION_COOKIE_NAME, getSessionCookieOptions } from "@/lib/auth/session";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      username?: string;
      email?: string;
      displayName?: string;
      password?: string;
      confirmPassword?: string;
      birthDate?: string;
      termsAccepted?: boolean;
      privacyAccepted?: boolean;
      operationPolicyAccepted?: boolean;
      ageConfirmed?: boolean;
      marketingAccepted?: boolean;
    };

    const result = await new AuthService().register({
      username: body.username ?? "",
      email: body.email ?? "",
      displayName: body.displayName ?? "",
      password: body.password ?? "",
      confirmPassword: body.confirmPassword ?? "",
      birthDate: body.birthDate ?? "",
      termsAccepted: body.termsAccepted === true,
      privacyAccepted: body.privacyAccepted === true,
      operationPolicyAccepted:
        body.operationPolicyAccepted === true,
      ageConfirmed:
        body.ageConfirmed === true,
      marketingAccepted:
        body.marketingAccepted === true,
    });

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
        },
        { status: 400 },
      );
    }

    const response = NextResponse.json(
      {
        success: true,
        user: result.user,
      },
      { status: 201 },
    );

    response.cookies.set(SESSION_COOKIE_NAME, result.sessionToken, getSessionCookieOptions());

    return response;
  } catch (error) {
    const detail =
      error instanceof Error
        ? error.message
        : String(error);

    console.error(
      "[AUTH_REGISTER_ERROR]",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        error:
          process.env.NODE_ENV === "production"
            ? "회원가입 처리 중 오류가 발생했습니다."
            : `회원가입 실패: ${detail}`,
      },
      { status: 500 },
    );
  }
}
