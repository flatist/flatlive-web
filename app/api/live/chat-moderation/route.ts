import {
  NextRequest,
  NextResponse,
} from "next/server";

import { cookies } from "next/headers";

import {
  AuthService,
} from "@/lib/auth/auth-service";

import {
  SESSION_COOKIE_NAME,
} from "@/lib/auth/session";

import {
  getLiveRoom,
  getViewer,
  listLiveViewers,
} from "@/lib/live/test-signaling-store";
import { canModerateLive } from "@/lib/live/moderation/live-manager-service";

import {
  clearLiveChatMute,
  getLiveChatMute,
  listLiveChatMutes,
  setLiveChatMute,
  type LiveChatMuteDuration,
} from "@/lib/live/moderation/live-chat-mute-store";

const DURATIONS:
  LiveChatMuteDuration[] = [
    "THIRTY_SECONDS",
    "ONE_MINUTE",
    "UNTIL_UNMUTED",
  ];

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

function serializeMute(
  mute:
    | ReturnType<
        typeof getLiveChatMute
      >
    | null,
) {
  if (!mute) {
    return null;
  }

  return {
    ...mute,
    expiresAt:
      mute.expiresAt === null
        ? null
        : mute.expiresAt,
  };
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
        ?.trim() ?? "";

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

    // FLATLIVE_MANAGER_CHAT_PERMISSION_V2
    if (
      !(await canModerateLive(
        room.broadcasterUserId,
        snapshot.userId,
      ))
    ) {
      return NextResponse.json(
        {
          success: false,
          errorCode:
            "LIVE_CHAT_MUTE_FORBIDDEN",
          error:
            "방송자 또는 지정된 매니저만 조회할 수 있습니다.",
        },
        {
          status: 403,
        },
      );
    }

    return NextResponse.json({
      success: true,
      mutes:
        listLiveChatMutes(
          roomId,
        ),
    });
  } catch (error) {
    console.error(
      "LIVE_CHAT_MUTE_GET_FAILED",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "채팅금지 상태 조회 중 오류가 발생했습니다.",
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

    // FLATLIVE_MANAGER_CHAT_PERMISSION_V2
    if (
      !(await canModerateLive(
        room.broadcasterUserId,
        snapshot.userId,
      ))
    ) {
      return NextResponse.json(
        {
          success: false,
          errorCode:
            "LIVE_CHAT_MUTE_FORBIDDEN",
          error:
            "방송자 또는 지정된 매니저만 처리할 수 있습니다.",
        },
        {
          status: 403,
        },
      );
    }

    const viewerId =
      typeof body.viewerId ===
      "string"
        ? body.viewerId.trim()
        : "";

    const requestedTargetUserId =
      typeof body.targetUserId ===
      "string"
        ? body.targetUserId.trim()
        : "";

    // FLATLIVE_CHAT_MODERATION_TARGET_FALLBACK_V4
    // viewerId가 채팅 메시지에 누락된 경우에도 userId로 현재 시청자를 찾는다.
    const viewerById = viewerId
      ? getViewer(roomId, viewerId)
      : null;

    const viewerByUserId =
      !viewerById && requestedTargetUserId
        ? listLiveViewers(roomId).find(
            (item) => item.userId === requestedTargetUserId,
          ) ?? null
        : null;

    const viewer = viewerById ?? viewerByUserId;
    const targetUserId =
      viewer?.userId || requestedTargetUserId;

    if (!targetUserId) {
      return NextResponse.json(
        {
          success: false,
          errorCode:
            "LIVE_CHAT_MUTE_TARGET_REQUIRED",
          error:
            "채팅금지할 로그인 사용자를 찾을 수 없습니다.",
        },
        {
          status: 404,
        },
      );
    }

    if (
      targetUserId ===
      room.broadcasterUserId
    ) {
      return NextResponse.json(
        {
          success: false,
          errorCode:
            "LIVE_CHAT_MUTE_SELF",
          error:
            "방송자 본인은 채팅금지할 수 없습니다.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      body.action ===
      "unmute"
    ) {
      clearLiveChatMute(
        roomId,
        targetUserId,
      );

      console.info(
        "LIVE_CHAT_UNMUTE",
        {
          roomId,
          broadcasterUserId:
            snapshot.userId,
          targetUserId,
        },
      );

      return NextResponse.json({
        success: true,
        muted: false,
      });
    }

    if (
      body.action !==
      "mute"
    ) {
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

    const duration:
      LiveChatMuteDuration =
      DURATIONS.includes(
        body.duration,
      )
        ? body.duration
        : "THIRTY_SECONDS";

    const mute =
      setLiveChatMute({
        roomId,
        broadcasterUserId:
          room.broadcasterUserId,
        targetUserId,
        duration,
      });

    console.info(
      "LIVE_CHAT_MUTE",
      {
        roomId,
        broadcasterUserId:
          snapshot.userId,
        targetUserId,
        duration,
        expiresAt:
          mute.expiresAt,
      },
    );

    return NextResponse.json({
      success: true,
      muted: true,
      mute:
        serializeMute(mute),
    });
  } catch (error) {
    console.error(
      "LIVE_CHAT_MUTE_POST_FAILED",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "채팅금지 처리 중 오류가 발생했습니다.",
      },
      {
        status: 500,
      },
    );
  }
}
