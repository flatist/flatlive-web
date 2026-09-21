import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  parseSessionToken,
  SESSION_COOKIE_NAME,
} from "@/lib/auth/session";

import { WalletService } from "@/lib/wallet/wallet-service";

export const dynamic = "force-dynamic";

export async function GET() {
  const token =
    (await cookies()).get(
      SESSION_COOKIE_NAME,
    )?.value;

  const userId = token
    ? parseSessionToken(
        token,
      )?.userId ?? null
    : null;

  if (!userId) {
    return NextResponse.json(
      {
        success: false,
        errorCode:
          "REVENUE_AUTH_REQUIRED",
        error:
          "로그인이 필요합니다.",
      },
      {
        status: 401,
        headers: {
          "Cache-Control":
            "no-store, no-cache, must-revalidate",
        },
      },
    );
  }

  const summary =
    await new WalletService()
      .getReceivedDonationSummary(
        userId,
      );

  return NextResponse.json(
    {
      success: true,
      totalReceived:
        summary.totalReceived,
      count:
        summary.count,
    },
    {
      headers: {
        "Cache-Control":
          "no-store, no-cache, must-revalidate",
      },
    },
  );
}
