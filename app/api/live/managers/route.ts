import {
  NextRequest,
  NextResponse,
} from "next/server";

import { cookies } from "next/headers";

import { AuthService } from "@/lib/auth/auth-service";
import { SESSION_COOKIE_NAME } from "@/lib/auth/session";

import {
  getLiveRoom,
} from "@/lib/live/test-signaling-store";

import {
  assignLiveManager,
  isLiveManager,
  listLiveManagers,
  revokeLiveManager,
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

    const isManager =
      isBroadcaster
        ? false
        : await isLiveManager(
            room.broadcasterUserId,
            snapshot.userId,
          );

    const managers =
      isBroadcaster
        ? await listLiveManagers(
            room.broadcasterUserId,
          )
        : [];

    return NextResponse.json({
      success: true,
      broadcasterUserId:
        room.broadcasterUserId,
      isBroadcaster,
      isManager,
      canModerate:
        isBroadcaster ||
        isManager,
      managers,
    });
  } catch (error) {
    console.error(
      "LIVE_MANAGER_GET_FAILED",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "매니저 정보를 불러오지 못했습니다.",
      },
      {
        status: 500,
      },
    );
  }
}

export async function POST(
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

    const body =
      await request.json();

    const roomId =
      typeof body.roomId ===
      "string"
        ? body.roomId.trim()
        : "";

    const targetUserId =
      typeof body.targetUserId ===
      "string"
        ? body.targetUserId.trim()
        : "";

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

    if (
      room.broadcasterUserId !==
      snapshot.userId
    ) {
      return NextResponse.json(
        {
          success: false,
          errorCode:
            "LIVE_MANAGER_FORBIDDEN",
          error:
            "방송자만 매니저를 지정하거나 해제할 수 있습니다.",
        },
        {
          status: 403,
        },
      );
    }

    if (!targetUserId) {
      return NextResponse.json(
        {
          success: false,
          error:
            "대상 회원 정보가 없습니다.",
        },
        {
          status: 400,
        },
      );
    }

    let managers;

    if (body.action === "assign") {
      managers =
        await assignLiveManager({
          broadcasterUserId:
            room.broadcasterUserId,
          managerUserId:
            targetUserId,
          actorUserId:
            snapshot.userId,
        });
    } else if (
      body.action === "revoke"
    ) {
      managers =
        await revokeLiveManager({
          broadcasterUserId:
            room.broadcasterUserId,
          managerUserId:
            targetUserId,
          actorUserId:
            snapshot.userId,
        });
    } else {
      return NextResponse.json(
        {
          success: false,
          error:
            "지원하지 않는 action입니다.",
        },
        {
          status: 400,
        },
      );
    }

    return NextResponse.json({
      success: true,
      managers,
    });
  } catch (error) {
    console.error(
      "LIVE_MANAGER_POST_FAILED",
      error,
    );

    const code =
      error instanceof Error
        ? error.message
        : "";

    return NextResponse.json(
      {
        success: false,
        errorCode: code,
        error:
          code ===
          "LIVE_MANAGER_SELF_NOT_ALLOWED"
            ? "방송자 본인은 매니저로 지정할 수 없습니다."
            : "매니저 설정 중 오류가 발생했습니다.",
      },
      {
        status:
          code ===
          "LIVE_MANAGER_SELF_NOT_ALLOWED"
            ? 400
            : 500,
      },
    );
  }
}
