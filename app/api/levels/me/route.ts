import { NextResponse } from "next/server";

import { requireAuthenticatedUser } from "@/lib/auth/authorization";
import {
  getCreatorLevelSummary,
  getViewerLevelSummary,
} from "@/lib/levels";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireAuthenticatedUser();

    const [viewer, creator] = await Promise.all([
      getViewerLevelSummary(user.userId),
      getCreatorLevelSummary(user.userId),
    ]);

    return NextResponse.json({
      success: true,
      levels: {
        viewer,
        creator,
      },
      policy: {
        viewerLevelSource: "LIVE_DONATION_SPENT_ONLY",
        creatorLevelSource: "LIVE_CREATOR_ONLY",
        fanMembershipAffectsViewerLevel: false,
        vipMembershipAffectsViewerLevel: false,
        loungeMembershipAffectsViewerLevel: false,
        fanRankingEnabled: false,
        liveOnlySupportRankingEnabled: true,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "레벨 정보를 불러오지 못했습니다.";

    const isUnauthorized =
      message === "UNAUTHORIZED" ||
      message.includes("UNAUTHORIZED") ||
      message.includes("인증");

    return NextResponse.json(
      {
        success: false,
        error: isUnauthorized ? "UNAUTHORIZED" : "LEVELS_ME_FAILED",
        message,
      },
      {
        status: isUnauthorized ? 401 : 500,
      },
    );
  }
}
