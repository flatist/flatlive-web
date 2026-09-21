import { NextResponse } from "next/server";

import { AuthService } from "@/lib/auth/auth-service";
import { SESSION_COOKIE_NAME, getSessionCookieOptions } from "@/lib/auth/session";
import { awardFitActivity } from "@/lib/fit";
import { authCorsPreflight, withAuthCors } from "@/lib/auth/cors";

export function OPTIONS(request: Request) {
  return authCorsPreflight(request);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      username?: string;
      password?: string;
    };

    const result = await new AuthService().login({
      username: body.username ?? "",
      password: body.password ?? "",
    });

    if (!result.success) {
      return withAuthCors(
        request,
        NextResponse.json(
          {
            success: false,
            error: result.error,
          },
          { status: 401 },
        ),
      );
    }

    const response = NextResponse.json({
      success: true,
      user: result.user,
    });

    response.cookies.set(SESSION_COOKIE_NAME, result.sessionToken, getSessionCookieOptions());

    // FLATLIVE_FIT_ACTIVITY_LINK_V1: DAILY_LOGIN
    let fitAwarded = 0;

    try {
      const fitResult =
        await awardFitActivity({
          userId: result.user.id,
          activityCode: "DAILY_LOGIN",
          eventKey: new Date().toISOString().slice(0, 10),
        });

      fitAwarded =
        fitResult.awarded
          ? fitResult.amount
          : 0;
    } catch (fitError) {
      console.error("[FIT_AWARD_FAILED]", {
        activityCode: "DAILY_LOGIN",
        userId: result.user.id,
        fitError,
      });
    }

    if (fitAwarded > 0) {
      response.headers.set(
        "X-FIT-Awarded",
        String(fitAwarded),
      );
    }

    return withAuthCors(request, response);
  } catch {
    return withAuthCors(
      request,
      NextResponse.json(
        {
          success: false,
          error: "로그인 처리 중 오류가 발생했습니다.",
        },
        { status: 500 },
      ),
    );
  }
}
