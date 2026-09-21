import {
  NextResponse,
} from "next/server";
import {
  cookies,
} from "next/headers";
import {
  randomUUID,
} from "node:crypto";

import {
  AuthService,
} from "@/lib/auth/auth-service";

import {
  SESSION_COOKIE_NAME,
} from "@/lib/auth/session";

function makeTraceId() {
  return `ADULT-START-${Date.now()}-${randomUUID()
    .slice(0, 8)
    .toUpperCase()}`;
}

export async function POST() {
  const traceId =
    makeTraceId();

  try {
    const cookieStore =
      await cookies();

    const sessionToken =
      cookieStore.get(
        SESSION_COOKIE_NAME,
      )?.value;

    if (!sessionToken) {
      return NextResponse.json(
        {
          success: false,
          errorCode:
            "ADULT_AUTH_REQUIRED",
          error:
            "로그인 후 성인인증을 진행해주세요.",
          traceId,
        },
        {
          status: 401,
        },
      );
    }

    const snapshot =
      await new AuthService()
        .getCurrentUserSnapshot(
          sessionToken,
        );

    if (!snapshot) {
      return NextResponse.json(
        {
          success: false,
          errorCode:
            "ADULT_AUTH_REQUIRED",
          error:
            "로그인 정보가 유효하지 않습니다.",
          traceId,
        },
        {
          status: 401,
        },
      );
    }

    /*
     * 실제 NICE / KCB / PASS 계약 후
     * 이 위치에서 인증 요청을 생성합니다.
     *
     * 현재는 가짜 성공 처리를 하지 않습니다.
     */
    const provider =
      process.env
        .ADULT_VERIFICATION_PROVIDER
        ?.trim() || "";

    if (!provider) {
      return NextResponse.json(
        {
          success: false,
          configured: false,
          errorCode:
            "ADULT_PROVIDER_NOT_CONFIGURED",
          error:
            "휴대폰 본인인증 서비스가 아직 연결되지 않았습니다.",
          traceId,
        },
        {
          status: 503,
        },
      );
    }

    return NextResponse.json(
      {
        success: false,
        configured: true,
        provider,
        errorCode:
          "ADULT_PROVIDER_IMPLEMENTATION_PENDING",
        error:
          "본인인증 공급자 연동 구현이 필요합니다.",
        traceId,
      },
      {
        status: 501,
      },
    );
  } catch (error) {
    console.error(
      "ADULT VERIFICATION START ERROR",
      {
        traceId,
        error,
      },
    );

    return NextResponse.json(
      {
        success: false,
        errorCode:
          "ADULT_START_FAILED",
        error:
          "성인인증을 시작하지 못했습니다.",
        traceId,
      },
      {
        status: 500,
      },
    );
  }
}
