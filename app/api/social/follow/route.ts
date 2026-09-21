import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { parseSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { HybridUserRepository } from "@/lib/repositories/hybrid-user-repository";
import { SocialService } from "@/lib/social/social-service";
import { awardFitActivity } from "@/lib/fit";

async function currentUserId() {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  return token ? parseSessionToken(token)?.userId ?? null : null;
}

function targetFrom(request: Request, body?: unknown) {
  if (body && typeof body === "object" && typeof (body as { targetUserId?: unknown }).targetUserId === "string") {
    return (body as { targetUserId: string }).targetUserId.trim();
  }
  return new URL(request.url).searchParams.get("targetUserId")?.trim() ?? "";
}

export async function GET(request: Request) {
  const userId = await currentUserId();
  const targetUserId = targetFrom(request);
  if (!targetUserId) return NextResponse.json({ error: "대상 사용자가 필요합니다." }, { status: 400 });

  const service = new SocialService();
  const [stats, following] = await Promise.all([
    service.getStats(targetUserId),
    userId ? service.isFollowing(userId, targetUserId) : Promise.resolve(false),
  ]);
  return NextResponse.json({ ...stats, following });
}

export async function POST(request: Request) {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  try {
    const body = await request.json();
    const targetUserId = targetFrom(request, body);

    console.log("[FOLLOW_TRACE]", {
      action: "POST",
      followerUserId: userId,
      targetUserId,
      sameUser: userId === targetUserId,
    });

    if (!targetUserId) return NextResponse.json({ error: "대상 사용자가 필요합니다." }, { status: 400 });

    const target = await new HybridUserRepository().findById(targetUserId);
    if (!target) return NextResponse.json({ error: "사용자를 찾을 수 없습니다." }, { status: 404 });

    const service = new SocialService();
    await service.follow(userId, targetUserId);

    // FLATLIVE_FIT_ACTIVITY_LINK_V1: FOLLOW_USER
    let fitAwarded = 0;

    try {
      const fitResult =
        await awardFitActivity({
          userId,
          activityCode: "FOLLOW_USER",
          eventKey: targetUserId,
        });

      fitAwarded =
        fitResult.awarded
          ? fitResult.amount
          : 0;
    } catch (fitError) {
      console.error("[FIT_AWARD_FAILED]", {
        activityCode: "FOLLOW_USER",
        userId,
        targetUserId,
        fitError,
      });
    }

    const response =
      NextResponse.json({
        ...(await service.getStats(
          targetUserId,
        )),
        following: true,
      });

    if (fitAwarded > 0) {
      response.headers.set(
        "X-FIT-Awarded",
        String(fitAwarded),
      );
    }

    return response;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "팔로우 처리에 실패했습니다." },
      { status: 400 },
    );
  }
}

export async function DELETE(request: Request) {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  try {
    const body = await request.json();
    const targetUserId = targetFrom(request, body);

    console.log("[FOLLOW_TRACE]", {
      action: "DELETE",
      followerUserId: userId,
      targetUserId,
      sameUser: userId === targetUserId,
    });

    if (!targetUserId) return NextResponse.json({ error: "대상 사용자가 필요합니다." }, { status: 400 });

    const service = new SocialService();
    await service.unfollow(userId, targetUserId);
    return NextResponse.json({ ...(await service.getStats(targetUserId)), following: false });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "언팔로우 처리에 실패했습니다." },
      { status: 400 },
    );
  }
}
