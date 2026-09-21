import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  cookies,
} from "next/headers";

import {
  AuthService,
} from "@/lib/auth/auth-service";

import {
  SESSION_COOKIE_NAME,
} from "@/lib/auth/session";

import {
  getLiveRoom,
} from "@/lib/live/test-signaling-store";

import {
  getLiveChatMute,
} from "@/lib/live/moderation/live-chat-mute-store";

/*
 * FLATLIVE_VIEWER_CHAT_MUTE_STATUS_V1
 *
 * 시청자는 자기 자신의 현재 LIVE 채팅금지 상태만 조회한다.
 * 다른 사용자의 금지 상태는 조회할 수 없다.
 */
export async function GET(
  request: NextRequest,
) {
  try {
    const roomId =
      request.nextUrl.searchParams
        .get("roomId")
        ?.trim() ?? "";

    if (!roomId) {
      return NextResponse.json(
        {
          success: false,
          error:
            "roomId가 필요합니다.",
        },
        {
          status: 400,
        },
      );
    }

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

    const cookieStore =
      await cookies();

    const token =
      cookieStore.get(
        SESSION_COOKIE_NAME,
      )?.value;

    if (!token) {
      return NextResponse.json({
        success: true,
        muted: false,
        mute: null,
      });
    }

    const snapshot =
      await new AuthService()
        .getCurrentUserSnapshot(
          token,
        );

    if (!snapshot) {
      return NextResponse.json({
        success: true,
        muted: false,
        mute: null,
      });
    }

    const mute =
      getLiveChatMute(
        roomId,
        snapshot.userId,
      );

    if (!mute) {
      return NextResponse.json({
        success: true,
        muted: false,
        mute: null,
      });
    }

    return NextResponse.json({
      success: true,
      muted: true,
      mute: {
        duration:
          mute.duration,
        expiresAt:
          mute.expiresAt,
        createdAt:
          mute.createdAt,
      },
    });
  } catch (error) {
    console.error(
      "VIEWER_CHAT_MUTE_STATUS_FAILED",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "채팅금지 상태 확인 중 오류가 발생했습니다.",
      },
      {
        status: 500,
      },
    );
  }
}
