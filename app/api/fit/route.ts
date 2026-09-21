import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  parseSessionToken,
  SESSION_COOKIE_NAME,
} from "@/lib/auth/session";
import { FitService } from "@/lib/fit/fit-service";

export async function GET() {
  const token =
    (await cookies()).get(
      SESSION_COOKIE_NAME,
    )?.value;

  const userId =
    token
      ? parseSessionToken(token)
          ?.userId ?? null
      : null;

  if (!userId) {
    return NextResponse.json(
      { error: "UNAUTHORIZED" },
      { status: 401 },
    );
  }

  const summary =
    await new FitService().getSummary(
      userId,
    );

  return NextResponse.json(
    summary,
  );
}
