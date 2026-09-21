import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

import { AuthService } from "@/lib/auth/auth-service";
import { SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { ProfileService } from "@/lib/profile/profile-service";
import {
  addChatMessage,
  listChatMessages,
} from "@/lib/live/chat-store";
import { getLiveRoom } from "@/lib/live/test-signaling-store";
import { getLiveChatMute } from "@/lib/live/moderation/live-chat-mute-store";
import { checkLiveChatMessage } from "@/lib/live/moderation/live-chat-filter-service";
import { FanMembershipService } from "@/lib/fan-card";
import { getCreatorLevelSummary, getViewerLevelSummary } from "@/lib/levels";
import { isLiveManager } from "@/lib/live/moderation/live-manager-service";

function createTraceId() {
  return `chat-${crypto.randomUUID()}`;
}

function writeLog(data: Record<string, unknown>) {
  console.log(
    "LIVE_CHAT_TRACE",
    JSON.stringify({
      timestamp: new Date().toISOString(),
      ...data,
    }),
  );
}

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

export async function GET(request: NextRequest) {
  const traceId = createTraceId();

  const roomId =
    request.nextUrl.searchParams.get("roomId")?.trim() || "";

  try {
    writeLog({
      traceId,
      event: "CHAT_GET_START",
      roomId,
    });

    if (!roomId) {
      return NextResponse.json(
        {
          success: false,
          error: "roomId가 필요합니다.",
          errorCode: "CHAT-ROOM-ID-400",
          traceId,
        },
        { status: 400 },
      );
    }

    const room = getLiveRoom(roomId);

    if (!room) {
      writeLog({
        traceId,
        event: "CHAT_GET_ROOM_NOT_FOUND",
        roomId,
        errorCode: "CHAT-ROOM-404",
      });

      return NextResponse.json(
        {
          success: false,
          error: "방송방을 찾을 수 없습니다.",
          errorCode: "CHAT-ROOM-404",
          traceId,
        },
        { status: 404 },
      );
    }

    const messages =
      listChatMessages(roomId);

    writeLog({
      traceId,
      event: "CHAT_GET_SUCCESS",
      roomId,
      messageCount: messages.length,
    });

    return NextResponse.json({
      success: true,
      traceId,
      messages,
    });
  } catch (error) {
    console.error(
      "LIVE_CHAT_GET_FAILED",
      {
        traceId,
        roomId,
        errorCode: "CHAT-GET-500",
        error,
      },
    );

    return NextResponse.json(
      {
        success: false,
        error: "채팅 조회 중 오류가 발생했습니다.",
        errorCode: "CHAT-GET-500",
        traceId,
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const traceId = createTraceId();

  let roomId = "";

  try {
    const body = await request.json();

    roomId =
      typeof body.roomId === "string"
        ? body.roomId.trim()
        : "";

    const message =
      typeof body.message === "string"
        ? body.message.trim()
        : "";

    const donationMode =
      body.donationMode === "single" ||
      body.donationMode === "repeat" ||
      body.donationMode === "sequence"
        ? body.donationMode
        : undefined;

    writeLog({
      traceId,
      event: "CHAT_SEND_START",
      roomId,
    });

    if (!roomId) {
      return NextResponse.json(
        {
          success: false,
          error: "roomId가 필요합니다.",
          errorCode: "CHAT-ROOM-ID-400",
          traceId,
        },
        { status: 400 },
      );
    }

    if (!message) {
      return NextResponse.json(
        {
          success: false,
          error: "메시지를 입력해주세요.",
          errorCode: "CHAT-MESSAGE-400",
          traceId,
        },
        { status: 400 },
      );
    }

    if (message.length > 300) {
      return NextResponse.json(
        {
          success: false,
          error: "채팅은 300자까지 입력할 수 있습니다.",
          errorCode: "CHAT-MESSAGE-LONG-400",
          traceId,
        },
        { status: 400 },
      );
    }

    const room = getLiveRoom(roomId);

    if (!room) {
      writeLog({
        traceId,
        event: "CHAT_SEND_ROOM_NOT_FOUND",
        roomId,
        errorCode: "CHAT-ROOM-404",
      });

      return NextResponse.json(
        {
          success: false,
          error: "방송방을 찾을 수 없습니다.",
          errorCode: "CHAT-ROOM-404",
          traceId,
        },
        { status: 404 },
      );
    }

    const cookieStore = await cookies();

    const sessionToken =
      cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (!sessionToken) {
      writeLog({
        traceId,
        event: "CHAT_SEND_AUTH_REQUIRED",
        roomId,
        errorCode: "CHAT-AUTH-401",
      });

      return NextResponse.json(
        {
          success: false,
          error: "로그인 후 채팅할 수 있습니다.",
          errorCode: "CHAT-AUTH-401",
          traceId,
        },
        { status: 401 },
      );
    }

    const snapshot =
      await new AuthService().getCurrentUserSnapshot(
        sessionToken,
      );

    if (!snapshot) {
      return NextResponse.json(
        {
          success: false,
          error: "로그인 정보가 유효하지 않습니다.",
          errorCode: "CHAT-AUTH-INVALID-401",
          traceId,
        },
        { status: 401 },
      );
    }

    // FLATLIVE_CHAT_MUTE_SERVER_GUARD_V1
    const activeChatMute =
      getLiveChatMute(
        roomId,
        snapshot.userId,
      );

    if (activeChatMute) {
      const remainingMs =
        activeChatMute.expiresAt === null
          ? null
          : Math.max(
              0,
              activeChatMute.expiresAt -
                Date.now(),
            );

      writeLog({
        traceId,
        event:
          "CHAT_SEND_BLOCKED_BY_MUTE",
        roomId,
        userId:
          snapshot.userId,
        duration:
          activeChatMute.duration,
        expiresAt:
          activeChatMute.expiresAt,
      });

      return NextResponse.json(
        {
          success: false,
          errorCode:
            "LIVE_CHAT_MUTED",
          // FLATLIVE_CHAT_MUTE_USER_MESSAGE_V3
          error:
            activeChatMute.duration ===
            "THIRTY_SECONDS"
              ? "30초간 채팅이 금지되었습니다. 잠시 후 다시 이용해 주세요."
              : activeChatMute.duration ===
                  "ONE_MINUTE"
                ? "1분간 채팅이 금지되었습니다. 잠시 후 다시 이용해 주세요."
                : "채팅이 금지되었습니다. 방송자가 해제할 때까지 채팅할 수 없습니다.",
          duration:
            activeChatMute.duration,
          expiresAt:
            activeChatMute.expiresAt,
          remainingMs,
          traceId,
        },
        {
          status: 403,
        },
      );
    }

    // FLATLIVE_CHAT_FILTER_SERVER_GUARD_V1
    const chatFilter =
      await checkLiveChatMessage(
        room.broadcasterUserId,
        message,
      );

    if (chatFilter.blocked) {
      writeLog({
        traceId,
        event:
          "CHAT_SEND_BLOCKED_BY_FILTER",
        roomId,
        userId:
          snapshot.userId,
        filterSource:
          chatFilter.source,
      });

      return NextResponse.json(
        {
          success: false,
          errorCode:
            "LIVE_CHAT_FORBIDDEN_WORD",
          error:
            "사용할 수 없는 표현이 포함되어 있습니다.",
          traceId,
        },
        {
          status: 403,
        },
      );
    }

    const profile =
      await new ProfileService().getByUserId(
        snapshot.userId,
      );

    
    // FLATLIVE_CHAT_MESSAGE_VIEWER_ID_V1
    const viewerId =
      typeof body.viewerId === "string"
        ? body.viewerId.trim()
        : "";

const nickname =
      profile?.nickname?.trim() ||
      snapshot.displayName?.trim() ||
      snapshot.username;

    const isBroadcaster =
      room.broadcasterUserId ===
      snapshot.userId;

    const isManager =
      !isBroadcaster &&
      !!room.broadcasterUserId &&
      (await isLiveManager(
        room.broadcasterUserId,
        snapshot.userId,
      ));

    // FLATLIVE_CHAT_IDENTITY_ATTACH_V1
    const [
      viewerLevelSummary,
      creatorLevelSummary,
      fanMembership,
    ] = await Promise.all([
      isBroadcaster
        ? Promise.resolve(null)
        : getViewerLevelSummary(snapshot.userId),
      isBroadcaster
        ? getCreatorLevelSummary(snapshot.userId)
        : Promise.resolve(null),
      isBroadcaster
        ? Promise.resolve(null)
        : fanMembershipService.getActiveMembership(
            room.broadcasterUserId,
            snapshot.userId,
          ),
    ]);

    const fanTier =
      fanMembership?.tier ?? null;

    const nicknameTone =
      isBroadcaster
        ? "BROADCASTER"
        : fanTier === "VIP"
          ? "VIP"
          : fanTier === "FAN"
            ? "FAN"
            : "DEFAULT";

    const levelLabel =
      isBroadcaster
        ? `FLATIST Lv.${getLevelNumber(creatorLevelSummary)}`
        : `Lv.${getLevelNumber(viewerLevelSummary)}`;

    const chatMessage =
      addChatMessage({
        roomId,
        viewerId,
        userId: snapshot.userId,
        username: snapshot.username,
        nickname,
        message,
        isBroadcaster,
        isManager,
        levelLabel,
        loungeBadge: null,
        fanTier,
        nicknameTone,
        donationMode,
      });

    writeLog({
      traceId,
      event: "CHAT_SEND_SUCCESS",
      roomId,
      userId: snapshot.userId,
      messageId: chatMessage.id,
      roleDebug: {
        isBroadcaster,
        isManager,
        broadcasterUserId:
          room.broadcasterUserId,
        senderUserId:
          snapshot.userId,
      },
    });

    return NextResponse.json({
      success: true,
      traceId,
      message: chatMessage,
    });
  } catch (error) {
    console.error(
      "LIVE_CHAT_POST_FAILED",
      {
        traceId,
        roomId,
        errorCode: "CHAT-SEND-500",
        error,
      },
    );

    return NextResponse.json(
      {
        success: false,
        error: "채팅 전송 중 오류가 발생했습니다.",
        errorCode: "CHAT-SEND-500",
        traceId,
      },
      { status: 500 },
    );
  }
}
