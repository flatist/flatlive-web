import { NextResponse } from "next/server";

import { requireAuthenticatedUser } from "@/lib/auth/authorization";
import { FanMembershipService } from "@/lib/fan-card";
import { getViewerLevelSummary, getCreatorLevelSummary } from "@/lib/levels";
import { getLiveRoom } from "@/lib/live/core/room-store";
import { isLiveManager } from "@/lib/live/moderation/live-manager-service";

export const dynamic = "force-dynamic";

const fanMembershipService = new FanMembershipService();

function getLevelNumber(summary: unknown, fallback = 1) {
  if (summary && typeof summary === "object" && "level" in summary) {
    const value = (summary as { level?: unknown }).level;

    if (typeof value === "number") {
      return value;
    }

    if (
      value &&
      typeof value === "object" &&
      "level" in value &&
      typeof (value as { level?: unknown }).level === "number"
    ) {
      return (value as { level: number }).level;
    }

    if (
      value &&
      typeof value === "object" &&
      "value" in value &&
      typeof (value as { value?: unknown }).value === "number"
    ) {
      return (value as { value: number }).value;
    }
  }

  return fallback;
}

async function getOptionalUser() {
  try {
    return await requireAuthenticatedUser();
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "";

    if (
      message.includes("UNAUTHORIZED") ||
      message.includes("인증")
    ) {
      return null;
    }

    throw error;
  }
}

function jsonError(
  error: string,
  message: string,
  status = 400,
) {
  return NextResponse.json(
    {
      success: false,
      error,
      message,
    },
    {
      status,
    },
  );
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const roomId = url.searchParams.get("roomId")?.trim() ?? "";

    if (!roomId) {
      return jsonError(
        "ROOM_ID_REQUIRED",
        "LIVE 방 ID가 필요합니다.",
        400,
      );
    }

    const room = getLiveRoom(roomId);

    if (!room) {
      return jsonError(
        "LIVE_ROOM_NOT_FOUND",
        "LIVE 방을 찾을 수 없습니다.",
        404,
      );
    }

    const user = await getOptionalUser();

    if (!user) {
      return NextResponse.json({
        success: true,
        roomId,
        broadcasterUserId: room.broadcasterUserId,
        viewerUserId: null,
        identity: {
          context: "GUEST",
          role: "GUEST",
          levelLabel: null,
          loungeBadge: null,
          fanTier: null,
          nicknameTone: "DEFAULT",
          showViewerLevel: false,
          showCreatorLevel: false,
          isBroadcaster: false,
          isManager: false,
        },
        policy: {
          roomScopedFanMembership: true,
          fanMembershipKey: "broadcasterUserId + viewerUserId",
          loungeBadgeRoomScoped: true,
          loungeBadgeConnected: false,
        },
      });
    }

    const isBroadcaster = room.broadcasterUserId === user.userId;

    if (isBroadcaster) {
      const creator = await getCreatorLevelSummary(user.userId);

      return NextResponse.json({
        success: true,
        roomId,
        broadcasterUserId: room.broadcasterUserId,
        viewerUserId: user.userId,
        identity: {
          context: "BROADCASTER_OWN_ROOM",
          role: "BROADCASTER",
          levelLabel: `FLATIST Lv.${getLevelNumber(creator)}`,
          loungeBadge: null,
          fanTier: null,
          nicknameTone: "BROADCASTER",
          showViewerLevel: false,
          showCreatorLevel: true,
          isBroadcaster: true,
          isManager: false,
          creator,
        },
        policy: {
          ownBroadcastHidesViewerLevel: true,
          roomScopedFanMembership: true,
          fanMembershipKey: "broadcasterUserId + viewerUserId",
          loungeBadgeRoomScoped: true,
          loungeBadgeConnected: false,
        },
      });
    }

    const [viewer, fanMembership, manager] = await Promise.all([
      getViewerLevelSummary(user.userId),
      fanMembershipService.getActiveMembership(
        room.broadcasterUserId,
        user.userId,
      ),
      isLiveManager(
        room.broadcasterUserId,
        user.userId,
      ),
    ]);

    const fanTier = fanMembership?.tier ?? null;
    const nicknameTone =
      fanTier === "VIP"
        ? "VIP"
        : fanTier === "FAN"
          ? "FAN"
          : "DEFAULT";

    return NextResponse.json({
      success: true,
      roomId,
      broadcasterUserId: room.broadcasterUserId,
      viewerUserId: user.userId,
      identity: {
        context: "VIEWER_IN_ROOM",
        role: manager ? "MANAGER" : "VIEWER",
        levelLabel: `Lv.${getLevelNumber(viewer)}`,
        loungeBadge: null,
        fanTier,
        nicknameTone,
        showViewerLevel: true,
        showCreatorLevel: false,
        isBroadcaster: false,
        isManager: manager,
        viewer,
        fanMembership,
      },
      policy: {
        viewerLevelSource: "LIVE_DONATION_SPENT_ONLY",
        fanMembershipAffectsViewerLevel: false,
        roomScopedFanMembership: true,
        fanMembershipKey: "broadcasterUserId + viewerUserId",
        managerDecorationSeparatedFromNicknameColor: true,
        loungeBadgeRoomScoped: true,
        loungeBadgeConnected: false,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "채팅 신분 정보를 불러오지 못했습니다.";

    return NextResponse.json(
      {
        success: false,
        error: "LIVE_CHAT_IDENTITY_FAILED",
        message,
      },
      {
        status: 500,
      },
    );
  }
}
