import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { AuthService } from "@/lib/auth/auth-service";
import {
  SESSION_COOKIE_NAME,
  getSessionCookieOptions,
} from "@/lib/auth/session";

export async function POST(
  request: Request,
) {
  try {
    const body =
      (await request.json()) as {
        password?: string;
        confirmed?: boolean;
      };

    if (body.confirmed !== true) {
      return NextResponse.json(
        {
          success: false,
          error:
            "회원탈퇴 확인이 필요합니다.",
        },
        { status: 400 },
      );
    }

    const cookieStore =
      await cookies();

    const sessionToken =
      cookieStore.get(
        SESSION_COOKIE_NAME,
      )?.value ?? "";

    const result =
      await new AuthService()
        .withdrawAccount(
          sessionToken,
          body.password ?? "",
        );

    if (!result.success) {
      return NextResponse.json(
        result,
        { status: 400 },
      );
    }

    const response =
      NextResponse.json({
        success: true,
        message:
          "회원탈퇴가 완료되었습니다.",
      });

    response.cookies.set(
      SESSION_COOKIE_NAME,
      "",
      {
        ...getSessionCookieOptions(),
        maxAge: 0,
      },
    );

    return response;
  } catch (error) {
    console.error(
      "[AUTH_WITHDRAW_ERROR]",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "회원탈퇴 처리 중 오류가 발생했습니다.",
      },
      { status: 500 },
    );
  }
}
