import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { parseSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { SocialService } from "@/lib/social/social-service";

export async function GET(request: Request) {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  const currentUserId = token ? parseSessionToken(token)?.userId ?? null : null;
  const requestedUserId = new URL(request.url).searchParams.get("userId")?.trim() ?? "";
  const userId = requestedUserId || currentUserId;

  if (!userId) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  return NextResponse.json(await new SocialService().getStats(userId));
}
