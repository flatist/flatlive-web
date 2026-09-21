import {
  NextRequest,
  NextResponse,
} from "next/server";

import { cookies } from "next/headers";

import { AuthService } from "@/lib/auth/auth-service";
import { SESSION_COOKIE_NAME } from "@/lib/auth/session";

import {
  getLiveRoom,
  listLiveViewers,
} from "@/lib/live/test-signaling-store";

import {
  isLiveManager,
  listLiveManagers,
} from "@/lib/live/moderation/live-manager-service";

async function getCurrentUser() {
  const cookieStore =
    await cookies();

  const token =
    cookieStore.get(
      SESSION_COOKIE_NAME,
    )?.value;

  if (!token) {
    return null;
  }

  return new AuthService()
    .getCurrentUserSnapshot(
      token,
    );
}

export async function GET(
  request: NextRequest,
) {
  try {
    const snapshot =
      await getCurrentUser();

    if (!snapshot) {
      return NextResponse.json(
        {
          success: false,
          error:
            "로그인이 필요합니다.",
        },
        {
          status: 401,
        },
      );
    }

    const roomId =
      request.nextUrl.searchParams
        .get("roomId")
        ?.trim() || "";

    const room =
      getLiveRoom(roomId);

    if (!room) {
      return NextResponse.json(
        {
          success: false,
          error:
            "방송을 찾을 수 없습니다.",
        },
        {
          status: 404,
        },
      );
    }

    const isBroadcaster =
      room.broadcasterUserId ===
      snapshot.userId;

    const manager =
      isBroadcaster
        ? false
        : await isLiveManager(
            room.broadcasterUserId,
            snapshot.userId,
          );

    if (
      !isBroadcaster &&
      !manager
    ) {
      return NextResponse.json(
        {
          success: false,
          errorCode:
            "LIVE_MANAGER_VIEWERS_FORBIDDEN",
          error:
            "매니저 권한이 필요합니다.",
        },
        {
          status: 403,
        },
      );
    }

    const managers =
      await listLiveManagers(
        room.broadcasterUserId,
      );

    const managerUserIds =
      new Set(
        managers.map(
          (item) =>
            item.managerUserId,
        ),
      );

    const viewers =
      listLiveViewers(
        roomId,
      ).map((viewer) => ({
        ...viewer,
        isSelf:
          !!viewer.userId &&
          viewer.userId ===
            snapshot.userId,
        isManager:
          !!viewer.userId &&
          managerUserIds.has(
            viewer.userId,
          ),
      }));

    return NextResponse.json({
      success: true,
      viewers,
      viewerCount:
        viewers.length,
    });
  } catch (error) {
    console.error(
      "LIVE_MANAGER_VIEWERS_GET_FAILED",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "시청자 목록을 불러오지 못했습니다.",
      },
      {
        status: 500,
      },
    );
  }
}
