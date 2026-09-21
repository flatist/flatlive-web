import crypto from "crypto";
import {
  NextRequest,
  NextResponse } from "next/server";
import { cookies } from "next/headers";

import { AuthService } from "@/lib/auth/auth-service";
import { SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { ClutchService } from "@/lib/live/match/clutch-service";
import { ProfileService } from "@/lib/profile/profile-service";
import { LiveModerationService } from "@/lib/live/moderation/live-moderation-service";
import { getViewerKickNotice } from "@/lib/live/moderation/live-kick-notice-store";
import { LIVE_GUEST_COOKIE_NAME } from "@/lib/live/moderation/live-moderation-types";
import {
  getCreatorConsentServerStatus,
  } from "@/lib/creator/creator-consent-server";

import {
  finishLiveAnalytics,
  recordLiveViewer,
  startLiveAnalytics,
  } from "@/lib/analytics/live-analytics-store";


import {
  createLiveRoom,
  createViewer,
  deleteLiveRoom,
  deleteLiveRoomsByBroadcasterUserId,
  deleteViewer,
  getLiveRoom,
  getViewer,
  saveAnswer,
  saveOffer,
  setBroadcasterBackgrounded,
  touchBroadcasterHeartbeat,
  touchViewerHeartbeat,
  updateLiveRoomTitle,
  updateLiveRoomChatOverlay,
  type SignalDescription,
  listLiveRooms,
} from "@/lib/live/test-signaling-store";

// FLATLIVE_VIEWER_BAN_RESPONSE_V1
async function getViewerBanResponse(
  roomId: string,
) {
  const room =
    getLiveRoom(roomId);

  if (!room) {
    return null;
  }

  const cookieStore =
    await cookies();

  const sessionToken =
    cookieStore.get(
      SESSION_COOKIE_NAME,
    )?.value;

  let targetUserId = "";

  if (sessionToken) {
    const snapshot =
      await new AuthService()
        .getCurrentUserSnapshot(
          sessionToken,
        );

    targetUserId =
      snapshot?.userId?.trim() || "";
  }

  const targetGuestId =
    cookieStore.get(
      LIVE_GUEST_COOKIE_NAME,
    )?.value?.trim() || "";

  if (
    !targetUserId &&
    !targetGuestId
  ) {
    return null;
  }

  const check =
    await new LiveModerationService()
      .checkJoinAllowed({
        broadcasterUserId:
          room.broadcasterUserId,
        roomId,
        targetUserId,
        targetGuestId,
      });

  if (check.allowed) {
    return null;
  }

  const ban = check.ban;

  const error =
    ban?.durationType === "PERMANENT"
      ? "이 방송자의 LIVE에서 영구 강퇴되었습니다."
      : ban?.durationType === "ONE_DAY"
        ? "이 방송자의 LIVE에서 24시간 동안 입장이 제한되었습니다."
        : "현재 LIVE에서 강퇴되었습니다.";

  return NextResponse.json(
    {
      success: false,
      errorCode:
        "LIVE_VIEWER_BANNED",
      error,
      duration:
        ban?.durationType ||
        "ROOM",
      expiresAt:
        ban?.expiresAt
          ? ban.expiresAt.toISOString()
          : null,
    },
    {
      status: 403,
    },
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // FLATLIVE_SIGNAL_POST_404_TRACE_V1
    // Diagnostic only: never log raw SDP or ICE candidate contents.
    const signalPostTraceId =
      `signal-post-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}`;

    console.info(
      "[LIVE_SIGNAL_POST_TRACE]",
      {
        traceId: signalPostTraceId,
        action:
          typeof body?.action === "string"
            ? body.action
            : "",
        roomId:
          typeof body?.roomId === "string"
            ? body.roomId
            : "",
        viewerId:
          typeof body?.viewerId === "string"
            ? body.viewerId
            : "",
        hasOffer: !!body?.offer,
        hasAnswer: !!body?.answer,
        hasCandidate: !!body?.candidate,
      },
    );

    if (body.action === "create") {
      const title =
        typeof body.title === "string"
          ? body.title.trim()
          : "";

      const category =
        typeof body.category === "string"
          ? body.category.trim()
          : "";

      const isAdult =
        body.isAdult === true;

      // FLATLIVE_LIVE_DEVICE_DETECT_V1
      const userAgent =
        request.headers.get("user-agent") ?? "";

      const clientHintMobile =
        request.headers.get(
          "sec-ch-ua-mobile",
        ) === "?1";

      const deviceType: "mobile" | "pc" =
        clientHintMobile ||
        /Android|iPhone|iPad|iPod|Mobile/i.test(
          userAgent,
        )
          ? "mobile"
          : "pc";

      if (!title) {
        return NextResponse.json(
          { error: "방송 제목이 필요합니다." },
          { status: 400 },
        );
      }

      const cookieStore = await cookies();
      const sessionToken =
        cookieStore.get(SESSION_COOKIE_NAME)?.value;

      if (!sessionToken) {
        return NextResponse.json(
          { error: "로그인 후 방송할 수 있습니다." },
          { status: 401 },
        );
      }

      const authService = new AuthService();

      const snapshot =
        await authService.getCurrentUserSnapshot(
          sessionToken,
        );

      if (!snapshot) {
        return NextResponse.json(
          { error: "로그인 정보가 유효하지 않습니다." },
          { status: 401 },
        );
      }

      const creatorConsent =
        await getCreatorConsentServerStatus(
          snapshot.userId,
        );

      if (!creatorConsent.accepted) {
        console.warn(
          "LIVE CREATOR CONSENT REQUIRED",
          {
            userId: snapshot.userId,
            creatorAccepted:
              creatorConsent.creatorAccepted,
            musicAccepted:
              creatorConsent.musicAccepted,
          },
        );

        return NextResponse.json(
          {
            success: false,
            errorCode:
              "LIVE_CREATOR_CONSENT_REQUIRED",
            error:
              "크리에이터 필수 정책 동의가 필요합니다.",
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

      const broadcasterName =
        profile?.nickname?.trim() ||
        snapshot.displayName?.trim() ||
        snapshot.username;

      // FLATLIVE_LIVE_CREATE_IDEMPOTENT_V1
      // 이미 같은 방송자의 LIVE room이 살아 있으면
      // 기존 roomId를 유지한다.
      // 중복 create 요청 때문에 CLUTCH/채팅/WebRTC가
      // 기존 roomId를 잃는 현상을 방지한다.
      const existingRoomSummary =
        listLiveRooms().find(
          (item) =>
            item.broadcasterUserId ===
            snapshot.userId,
        );

      const existingRoom =
        existingRoomSummary
          ? getLiveRoom(
              existingRoomSummary.roomId,
            )
          : null;

      if (existingRoom) {
        existingRoom.deviceType =
          deviceType;

        console.log(
          "LIVE_CREATE_REUSE_EXISTING_ROOM",
          {
            roomId:
              existingRoom.roomId,
            broadcasterUserId:
              snapshot.userId,
          },
        );

        return NextResponse.json({
          success: true,
          roomId:
            existingRoom.roomId,
          reused: true,
        });
      }

      deleteLiveRoomsByBroadcasterUserId(
        snapshot.userId,
      );

      const room = createLiveRoom({
        title,
        category,
        isAdult,
        broadcasterName,
        broadcasterUserId: snapshot.userId,
        broadcasterUsername: snapshot.username,
        broadcasterAvatarUrl:
          profile?.avatarUrl?.trim() || "",
        deviceType,
      });

      try {
        await startLiveAnalytics({
          roomId: room.roomId,
          broadcasterUserId:
            snapshot.userId,
          title: room.title,
          category: room.category,
          startedAt: room.createdAt,
        });
      } catch (analyticsError) {
        console.error(
          "LIVE_ANALYTICS_START_FAILED",
          {
            roomId:
              room.roomId,
            broadcasterUserId:
              snapshot.userId,
            error:
              analyticsError,
          },
        );
      }

      return NextResponse.json({
        success: true,
        roomId: room.roomId,
      });
    }

    if (
      typeof body.roomId !== "string" ||
      !body.roomId.trim()
    ) {
      return NextResponse.json(
        { error: "roomId가 필요합니다." },
        { status: 400 },
      );
    }

    const roomId = body.roomId.trim();

    if (body.action === "update-title") {
      const nextTitle =
        typeof body.title === "string"
          ? body.title.trim()
          : "";

      if (!nextTitle) {
        return NextResponse.json(
          {
            error:
              "방송 제목을 입력해주세요.",
          },
          { status: 400 },
        );
      }

      if (nextTitle.length > 100) {
        return NextResponse.json(
          {
            error:
              "방송 제목은 100자 이하로 입력해주세요.",
          },
          { status: 400 },
        );
      }

      const cookieStore =
        await cookies();

      const sessionToken =
        cookieStore.get(
          SESSION_COOKIE_NAME,
        )?.value;

      if (!sessionToken) {
        return NextResponse.json(
          {
            error:
              "로그인이 필요합니다.",
          },
          { status: 401 },
        );
      }

      const authService =
        new AuthService();

      const snapshot =
        await authService.getCurrentUserSnapshot(
          sessionToken,
        );

      if (!snapshot) {
        return NextResponse.json(
          {
            error:
              "로그인 정보가 유효하지 않습니다.",
          },
          { status: 401 },
        );
      }

      const updatedRoom =
        updateLiveRoomTitle(
          roomId,
          snapshot.userId,
          nextTitle,
        );

      if (!updatedRoom) {
        return NextResponse.json(
          {
            error:
              "방송 제목을 수정할 권한이 없거나 방송을 찾을 수 없습니다.",
          },
          { status: 403 },
        );
      }

      return NextResponse.json({
        success: true,
        title: updatedRoom.title,
      });
    }

    if (body.action === "update-chat-overlay") {
      const allowedPositions = [
        "top-left",
        "top-right",
        "bottom-left",
        "bottom-right",
      ] as const;

      const allowedSizes = [
        "small",
        "medium",
        "large",
      ] as const;

      const allowedCounts = [
        3,
        5,
        10,
      ] as const;

      const allowedOpacities = [
        50,
        70,
        90,
      ] as const;

      const position =
        allowedPositions.includes(
          body.position,
        )
          ? body.position
          : "bottom-left";

      const size =
        allowedSizes.includes(
          body.size,
        )
          ? body.size
          : "medium";

      const count =
        allowedCounts.includes(
          body.count,
        )
          ? body.count
          : 5;

      const opacity =
        allowedOpacities.includes(
          body.opacity,
        )
          ? body.opacity
          : 70;

      const overlayX =
        typeof body.x === "number" &&
        Number.isFinite(body.x)
          ? Math.max(
              0,
              Math.min(100, body.x),
            )
          : undefined;

      const overlayY =
        typeof body.y === "number" &&
        Number.isFinite(body.y)
          ? Math.max(
              0,
              Math.min(100, body.y),
            )
          : undefined;

      const cookieStore =
        await cookies();

      const sessionToken =
        cookieStore.get(
          SESSION_COOKIE_NAME,
        )?.value;

      if (!sessionToken) {
        return NextResponse.json(
          {
            success: false,
            errorCode:
              "LIVE_CHAT_OVERLAY_AUTH_REQUIRED",
            error:
              "로그인이 필요합니다.",
          },
          {
            status: 401,
          },
        );
      }

      const snapshot =
        await new AuthService()
          .getCurrentUserSnapshot(
            sessionToken,
          );

      if (!snapshot) {
        return NextResponse.json(
          {
            success: false,
            errorCode:
              "LIVE_CHAT_OVERLAY_SESSION_INVALID",
            error:
              "로그인 정보가 유효하지 않습니다.",
          },
          {
            status: 401,
          },
        );
      }

      const updatedRoom =
        updateLiveRoomChatOverlay(
          roomId,
          snapshot.userId,
          {
            enabled:
              body.enabled !== false,
            position,
            size,
            count,
            opacity,
            x: overlayX,
            y: overlayY,
          },
        );

      if (!updatedRoom) {
        return NextResponse.json(
          {
            success: false,
            errorCode:
              "LIVE_CHAT_OVERLAY_FORBIDDEN",
            error:
              "댓글 설정을 변경할 권한이 없거나 방송을 찾을 수 없습니다.",
          },
          {
            status: 403,
          },
        );
      }

      return NextResponse.json({
        success: true,
        chatOverlayEnabled:
          updatedRoom.chatOverlayEnabled,
        chatOverlayPosition:
          updatedRoom.chatOverlayPosition,
        chatOverlaySize:
          updatedRoom.chatOverlaySize,
        chatOverlayCount:
          updatedRoom.chatOverlayCount,
        chatOverlayOpacity:
          updatedRoom.chatOverlayOpacity,
        chatOverlayX:
          updatedRoom.chatOverlayX,
        chatOverlayY:
          updatedRoom.chatOverlayY,
      });
    }


    if (body.action === "create-viewer") {
      // FLATLIVE_CREATE_VIEWER_STAGE_DEBUG_V1
      let createViewerStage = "start";

      try {
      let viewerUserId = "";
      let viewerUsername = "";
      let viewerNickname = "";
      let viewerAvatarUrl = "";

      const cookieStore = await cookies();

      const sessionToken =
        cookieStore.get(
          SESSION_COOKIE_NAME,
        )?.value;

      if (sessionToken) {
        const authService =
          new AuthService();

        createViewerStage = "auth-snapshot";

        const snapshot =
          await authService.getCurrentUserSnapshot(
            sessionToken,
          );

        if (snapshot) {
          createViewerStage = "profile";

          const profile =
            await new ProfileService().getByUserId(
              snapshot.userId,
            );

          viewerUserId =
            snapshot.userId;

          viewerUsername =
            snapshot.username;

          viewerNickname =
            profile?.nickname?.trim() ||
            snapshot.displayName?.trim() ||
            snapshot.username;

          viewerAvatarUrl =
            profile?.avatarUrl?.trim() ||
            "";
        }
      }

      // FLATLIVE_LIVE_MODERATION_JOIN_GUARD_V1
      let viewerGuestId = "";

      const existingGuestId =
        cookieStore.get(
          LIVE_GUEST_COOKIE_NAME,
        )?.value?.trim() || "";

      if (!viewerUserId) {
        viewerGuestId =
          existingGuestId ||
          crypto.randomUUID();
      }

      const currentRoom =
        getLiveRoom(roomId);

      if (!currentRoom) {
        return roomNotFound();
      }

      createViewerStage = "moderation-check";

      const moderationCheck =
        await new LiveModerationService()
          .checkJoinAllowed({
            broadcasterUserId:
              currentRoom.broadcasterUserId,
            roomId,
            targetUserId:
              viewerUserId,
            targetGuestId:
              viewerGuestId,
          });

      if (!moderationCheck.allowed) {
        const ban =
          moderationCheck.ban;

        return NextResponse.json(
          {
            success: false,
            errorCode:
              "LIVE_VIEWER_BANNED",
            error:
              ban?.durationType ===
              "PERMANENT"
                ? "이 방송자의 LIVE에서 영구 강퇴되었습니다."
                : ban?.durationType ===
                  "ONE_DAY"
                  ? "이 방송자의 LIVE에서 24시간 동안 입장이 제한되었습니다."
                  : "현재 LIVE에서 강퇴되었습니다.",
            duration:
              ban?.durationType ||
              "ROOM",
            expiresAt:
              ban?.expiresAt
                ? ban.expiresAt.toISOString()
                : null,
          },
          { status: 403 },
        );
      }

      createViewerStage = "create-viewer-store";

      const viewer = createViewer(
        roomId,
        {
          userId: viewerUserId,
          guestId: viewerGuestId,
          username: viewerUsername,
          nickname: viewerNickname,
          avatarUrl: viewerAvatarUrl,
        },
      );

      if (!viewer) {
        return roomNotFound();
      }

      try {
        const currentRoom =
          getLiveRoom(roomId);

        if (currentRoom) {
          const analyticsViewerId =
            viewer.userId?.trim() ||
            viewer.viewerId;

          await recordLiveViewer(
            roomId,
            analyticsViewerId,
            currentRoom.viewers.size,
          );
        }
      } catch (analyticsError) {
        console.error(
          "LIVE_ANALYTICS_VIEWER_FAILED",
          {
            roomId,
            viewerId:
              viewer.viewerId,
            error:
              analyticsError,
          },
        );
      }

      createViewerStage = "response";

      const response =
        NextResponse.json({
          success: true,
          viewerId: viewer.viewerId,
        });

      if (
        !viewerUserId &&
        viewerGuestId &&
        !existingGuestId
      ) {
        response.cookies.set(
          LIVE_GUEST_COOKIE_NAME,
          viewerGuestId,
          {
            httpOnly: true,
            sameSite: "lax",
            secure:
              process.env.NODE_ENV ===
              "production",
            path: "/",
            maxAge:
              60 * 60 * 24 * 365,
          },
        );
      }

      return response;
      } catch (createViewerError) {
        console.error(
          "LIVE_CREATE_VIEWER_STAGE_FAILED",
          {
            stage: createViewerStage,
            roomId,
            error: createViewerError,
          },
        );

        throw createViewerError;
      }
    }

    if (
      body.action === "broadcaster-background" ||
      body.action === "broadcaster-foreground"
    ) {
      const cookieStore = await cookies();

      const sessionToken =
        cookieStore.get(SESSION_COOKIE_NAME)?.value;

      if (!sessionToken) {
        return NextResponse.json(
          { error: "로그인이 필요합니다." },
          { status: 401 },
        );
      }

      const authService =
        new AuthService();

      const snapshot =
        await authService.getCurrentUserSnapshot(
          sessionToken,
        );

      if (!snapshot) {
        return NextResponse.json(
          {
            error:
              "로그인 정보가 유효하지 않습니다.",
          },
          { status: 401 },
        );
      }

      const room =
        setBroadcasterBackgrounded(
          roomId,
          snapshot.userId,
          body.action ===
            "broadcaster-background",
        );

      if (!room) {
        return NextResponse.json(
          {
            error:
              "방송방이 없거나 방송자 권한이 없습니다.",
          },
          { status: 404 },
        );
      }

      return NextResponse.json({
        success: true,
        broadcasterBackgrounded:
          room.broadcasterBackgrounded,
      });
    }

    if (body.action === "heartbeat") {
      const cookieStore = await cookies();
      const sessionToken =
        cookieStore.get(SESSION_COOKIE_NAME)?.value;

      if (!sessionToken) {
        return NextResponse.json(
          { error: "로그인이 필요합니다." },
          { status: 401 },
        );
      }

      const authService = new AuthService();

      const snapshot =
        await authService.getCurrentUserSnapshot(
          sessionToken,
        );

      if (!snapshot) {
        return NextResponse.json(
          { error: "로그인 정보가 유효하지 않습니다." },
          { status: 401 },
        );
      }

      const room = touchBroadcasterHeartbeat(
        roomId,
        snapshot.userId,
      );

      if (!room) {
        return NextResponse.json(
          {
            error:
              "방송방이 없거나 방송자 권한이 없습니다.",
          },
          { status: 404 },
        );
      }

      return NextResponse.json({
        success: true,
      });
    }

    if (body.action === "close") {
      const cookieStore = await cookies();

      const sessionToken =
        cookieStore.get(SESSION_COOKIE_NAME)?.value;

      if (!sessionToken) {
        return NextResponse.json(
          { error: "로그인이 필요합니다." },
          { status: 401 },
        );
      }

      const authService = new AuthService();

      const snapshot =
        await authService.getCurrentUserSnapshot(
          sessionToken,
        );

      if (!snapshot) {
        return NextResponse.json(
          { error: "로그인 정보가 유효하지 않습니다." },
          { status: 401 },
        );
      }

      const room = getLiveRoom(roomId);

      if (
        !room ||
        room.broadcasterUserId !== snapshot.userId
      ) {
        return NextResponse.json(
          {
            error:
              "방송방이 없거나 방송자 권한이 없습니다.",
          },
          { status: 403 },
        );
      }

      try {
        await finishLiveAnalytics(
          roomId,
          Date.now(),
        );
      } catch (analyticsError) {
        console.error(
          "LIVE_ANALYTICS_FINISH_FAILED",
          {
            roomId,
            broadcasterUserId:
              snapshot.userId,
            error:
              analyticsError,
          },
        );
      }

      // FLATLIVE_CLUTCH_CLOSE_LIFECYCLE_FINAL_V1
      try {
        const clutchService =
          new ClutchService();

        await clutchService.leaveByRoomId(
          roomId,
          snapshot.userId,
        );
      } catch (clutchError) {
        console.warn(
          "CLUTCH_CLOSE_LIFECYCLE_FAILED",
          {
            roomId,
            broadcasterUserId:
              snapshot.userId,
            error:
              clutchError,
          },
        );
      }

      deleteLiveRoom(roomId);

      return NextResponse.json({
        success: true,
      });
    }

    if (
      typeof body.viewerId !== "string" ||
      !body.viewerId.trim()
    ) {
      return NextResponse.json(
        { error: "viewerId가 필요합니다." },
        { status: 400 },
      );
    }

    const viewerId = body.viewerId.trim();

    if (body.action === "offer") {
      if (!isDescription(body.description, "offer")) {
        return NextResponse.json(
          { error: "올바른 offer가 아닙니다." },
          { status: 400 },
        );
      }

      const viewer = saveOffer(
        roomId,
        viewerId,
        body.description,
      );

      if (!viewer) {
        return viewerNotFound();
      }

      return NextResponse.json({ success: true });
    }

    if (body.action === "answer") {
      if (!isDescription(body.description, "answer")) {
        return NextResponse.json(
          { error: "올바른 answer가 아닙니다." },
          { status: 400 },
        );
      }

      const viewer = saveAnswer(
        roomId,
        viewerId,
        body.description,
      );

      if (!viewer) {
        return viewerNotFound();
      }

      return NextResponse.json({ success: true });
    }

    if (body.action === "viewer-heartbeat") {
      const viewer = touchViewerHeartbeat(
        roomId,
        viewerId,
      );

      if (!viewer) {
        // FLATLIVE_VIEWER_KICK_NOTICE_V2
        const kickNotice =
          getViewerKickNotice(
            roomId,
            viewerId,
          );

        if (kickNotice) {
          return NextResponse.json(
            {
              success: false,
              errorCode:
                "LIVE_VIEWER_KICKED",
              error:
                kickNotice.message,
              duration:
                kickNotice.duration,
            },
            {
              status: 403,
            },
          );
        }

        const banResponse =
          await getViewerBanResponse(
            roomId,
          );

        if (banResponse) {
          return banResponse;
        }

        return viewerNotFound();
      }

      return NextResponse.json({
        success: true,
      });
    }

    if (body.action === "close-viewer") {
      deleteViewer(roomId, viewerId);

      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { error: "지원하지 않는 action입니다." },
      { status: 400 },
    );
  } catch (error) {
    console.error("LIVE_SIGNAL_POST_FAILED", error);

    return NextResponse.json(
      { error: "라이브 연결 처리 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {

  // FLATLIVE_LIVE_ROOM_LIST_FOR_MATCH
  const listMode =
    request.nextUrl.searchParams.get(
      "list",
    ) === "1";

  if (listMode) {
    return NextResponse.json({
      success: true,
      rooms: listLiveRooms(),
    });
  }

  try {
    const roomId =
      request.nextUrl.searchParams.get("roomId")?.trim();

    const viewerId =
      request.nextUrl.searchParams.get("viewerId")?.trim();

    if (!roomId) {
      return NextResponse.json(
        { error: "roomId가 필요합니다." },
        { status: 400 },
      );
    }

    const room = getLiveRoom(roomId);

    if (!room) {
      return roomNotFound();
    }

    if (!viewerId) {
      return NextResponse.json({
        success: true,
        roomId: room.roomId,

        title:
          room.title,

        category:
          room.category,

        isAdult:
          room.isAdult === true,

        broadcasterUserId:
          room.broadcasterUserId,

        broadcasterName:
          room.broadcasterName,

        broadcasterUsername:
          room.broadcasterUsername,

        broadcasterAvatarUrl:
          room.broadcasterAvatarUrl,

        broadcasterHeartbeatAt:
          room.broadcasterHeartbeatAt,

        broadcasterBackgrounded:
          room.broadcasterBackgrounded,

        chatOverlayEnabled:
          room.chatOverlayEnabled !== false,

        chatOverlayPosition:
          room.chatOverlayPosition ||
          "bottom-left",

        chatOverlaySize:
          room.chatOverlaySize ||
          "medium",

        chatOverlayCount:
          room.chatOverlayCount ||
          5,

        chatOverlayOpacity:
          room.chatOverlayOpacity ||
          70,

        viewerIds:
          Array.from(
            room.viewers.keys(),
          ),

        viewers:
          Array.from(
            room.viewers.values(),
          ).map((viewer) => ({
            viewerId:
              viewer.viewerId,
            userId:
              viewer.userId,
            username:
              viewer.username,
            nickname:
              viewer.nickname,
            avatarUrl:
              viewer.avatarUrl,
            isGuest:
              !viewer.userId,
          })),

        chatOverlayX:
          room.chatOverlayX,
        chatOverlayY:
          room.chatOverlayY,

        createdAt: room.createdAt,
        updatedAt: room.updatedAt,
      });
    }

    const viewer = getViewer(roomId, viewerId);

    if (!viewer) {
      // FLATLIVE_VIEWER_KICK_NOTICE_GET_V2
      const kickNotice =
        getViewerKickNotice(
          roomId,
          viewerId,
        );

      if (kickNotice) {
        return NextResponse.json(
          {
            success: false,
            errorCode:
              "LIVE_VIEWER_KICKED",
            error:
              kickNotice.message,
            duration:
              kickNotice.duration,
          },
          {
            status: 403,
          },
        );
      }

      const banResponse =
        await getViewerBanResponse(
          roomId,
        );

      if (banResponse) {
        return banResponse;
      }

      return viewerNotFound();
    }

    return NextResponse.json({
      success: true,
      roomId,
      viewerId: viewer.viewerId,
      offer: viewer.offer,
      answer: viewer.answer,
      createdAt: viewer.createdAt,
      updatedAt: viewer.updatedAt,
    });
  } catch (error) {
    console.error("LIVE_SIGNAL_GET_FAILED", error);

    return NextResponse.json(
      { error: "라이브 연결 조회 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}

function isDescription(
  value: unknown,
  expectedType: "offer" | "answer",
): value is SignalDescription {
  if (
    typeof value !== "object" ||
    value === null
  ) {
    return false;
  }

  const description =
    value as Partial<SignalDescription>;

  return (
    description.type === expectedType &&
    typeof description.sdp === "string" &&
    description.sdp.length > 0
  );
}

function roomNotFound() {
  return NextResponse.json(
    {
      error:
        "방송방을 찾을 수 없거나 테스트 시간이 만료되었습니다.",
    },
    { status: 404 },
  );
}

function viewerNotFound() {
  return NextResponse.json(
    {
      error:
        "시청자 연결정보를 찾을 수 없거나 만료되었습니다.",
    },
    { status: 404 },
  );
}
