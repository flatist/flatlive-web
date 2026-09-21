import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomUUID } from "node:crypto";

import { AuthService } from "@/lib/auth/auth-service";
import {
  SESSION_COOKIE_NAME,
} from "@/lib/auth/session";

import {
  getAdultVerification,
} from "@/lib/adult/adult-verification-store";

function makeTraceId() {
  return `ADULT-${Date.now()}-${randomUUID()
    .slice(0, 8)
    .toUpperCase()}`;
}

export async function GET() {
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
      return NextResponse.json({
        success: true,
        loggedIn: false,
        verified: false,
        traceId,
      });
    }

    const snapshot =
      await new AuthService()
        .getCurrentUserSnapshot(
          sessionToken,
        );

    if (!snapshot) {
      return NextResponse.json({
        success: true,
        loggedIn: false,
        verified: false,
        traceId,
      });
    }

    const record =
      await getAdultVerification(
        snapshot.userId,
      );

    return NextResponse.json({
      success: true,
      loggedIn: true,
      verified:
        record?.verified === true,
      verifiedAt:
        record?.verifiedAt ??
        null,
      provider:
        record?.provider ?? "",
      traceId,
    });
  } catch (error) {
    console.error(
      "ADULT VERIFICATION STATUS ERROR",
      {
        traceId,
        error,
      },
    );

    return NextResponse.json(
      {
        success: false,
        errorCode:
          "ADULT_STATUS_FAILED",
        error:
          "성인인증 상태를 확인하지 못했습니다.",
        traceId,
      },
      {
        status: 500,
      },
    );
  }
}
