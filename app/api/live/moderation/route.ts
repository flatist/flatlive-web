import {
  NextRequest,
  NextResponse,
} from "next/server";

import { cookies } from "next/headers";

import { AuthService } from "@/lib/auth/auth-service";
import { SESSION_COOKIE_NAME } from "@/lib/auth/session";

import {
  deleteViewer,
  getLiveRoom,
  getViewer,
  listLiveViewers,
} from "@/lib/live/test-signaling-store";

import { LiveModerationService } from "@/lib/live/moderation/live-moderation-service";
import { HybridUserRepository } from "@/lib/repositories/hybrid-user-repository";
import { ProfileService } from "@/lib/profile/profile-service";
import { canModerateLive } from "@/lib/live/moderation/live-manager-service";
import { markViewerKicked } from "@/lib/live/moderation/live-kick-notice-store";

import type {
  LiveBanDuration,
  LiveBanReason,
} from "@/lib/live/moderation/live-moderation-types";

const DURATIONS:
  LiveBanDuration[] = [
    "ROOM",
    "ONE_DAY",
    "PERMANENT",
  ];

const REASONS:
  LiveBanReason[] = [
    "SPAM",
    "ABUSE",
    "SEXUAL_HARASSMENT",
    "DISRUPTION",
    "OTHER",
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

/*
 * FLATLIVE_LIVE_MODERATION_POLICY_V2
 *
 * ROOM:
 * - 현재 viewer만 즉시 내보냄
 * - DB 차단 안 함
 * - 즉시 재입장 가능
 *
 * ONE_DAY / PERMANENT:
 * - DB 차단
 * - 현재 viewer 즉시 내보냄
 */
export async function GET() {
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

    const moderation =
      new LiveModerationService();

    const bans =
      await moderation.listActive(
        snapshot.userId,
      );

    // FLATLIVE_BAN_NICKNAME_DISPLAY_V1
    const users =
      new HybridUserRepository();

    const profiles =
      new ProfileService();

    const bansWithDisplayName =
      await Promise.all(
        bans.map(async (ban) => {
          if (!ban.targetUserId) {
            return {
              ...ban,
              targetDisplayName: null,
            };
          }

          try {
            const user =
              await users.findById(
                ban.targetUserId as Parameters<
                  typeof users.findById
                >[0],
              );

            const profile =
              user
                ? await profiles.getByUserId(
                    user.id,
                  )
                : null;

            return {
              ...ban,
              targetDisplayName:
                profile?.nickname?.trim() ||
                user?.displayName?.trim() ||
                user?.username?.trim() ||
                null,
            };
          } catch (userError) {
            console.warn(
              "LIVE_BAN_USER_LOOKUP_FAILED",
              {
                targetUserId:
                  ban.targetUserId,
                userError,
              },
            );

            return {
              ...ban,
              targetDisplayName: null,
            };
          }
        }),
      );

    return NextResponse.json({
      success: true,
      bans: bansWithDisplayName,
    });
  } catch (error) {
    console.error(
      "LIVE_MODERATION_GET_FAILED",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "강퇴 목록 조회 중 오류가 발생했습니다.",
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

    const moderation =
      new LiveModerationService();

    /*
     * 강퇴 해제는 현재 LIVE 존재 여부와 무관하다.
     */
    if (body.action === "unban") {
      const banId =
        typeof body.banId ===
        "string"
          ? body.banId.trim()
          : "";

      if (!banId) {
        return NextResponse.json(
          {
            success: false,
            error:
              "강퇴 기록 ID가 필요합니다.",
          },
          {
            status: 400,
          },
        );
      }

      const revoked =
        await moderation.revoke({
          banId,
          broadcasterUserId:
            snapshot.userId,
          actorUserId:
            snapshot.userId,
        });

      if (!revoked) {
        return NextResponse.json(
          {
            success: false,
            error:
              "강퇴 기록을 찾을 수 없습니다.",
          },
          {
            status: 404,
          },
        );
      }

      console.info(
        "LIVE_MODERATION_UNBAN",
        {
          banId,
          broadcasterUserId:
            snapshot.userId,
          actorUserId:
            snapshot.userId,
        },
      );

      return NextResponse.json({
        success: true,
      });
    }

    if (body.action !== "kick") {
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

    // FLATLIVE_MANAGER_KICK_PERMISSION_V2
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
            "LIVE_MODERATION_FORBIDDEN",
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
    // 채팅에 viewerId가 없어도 로그인 userId로 현재 viewer를 복구한다.
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
    const resolvedViewerId = viewer?.viewerId || viewerId;
    const targetUserId =
      viewer?.userId || requestedTargetUserId;

    /*
     * 방송자 자신은 제재할 수 없다.
     */
    if (
      targetUserId &&
      targetUserId ===
        room.broadcasterUserId
    ) {
      return NextResponse.json(
        {
          success: false,
          errorCode:
            "LIVE_MODERATION_SELF_TARGET",
          error:
            "방송자 본인은 강퇴할 수 없습니다.",
        },
        {
          status: 400,
        },
      );
    }

    const duration:
      LiveBanDuration =
      DURATIONS.includes(
        body.duration,
      )
        ? body.duration
        : "ROOM";

    const reason:
      LiveBanReason =
      REASONS.includes(
        body.reason,
      )
        ? body.reason
        : "OTHER";

    if (
      !targetUserId &&
      duration !== "ROOM"
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "게스트는 현재 방송에서만 내보낼 수 있습니다.",
        },
        {
          status: 400,
        },
      );
    }

    if (duration === "ROOM" && !viewer) {
      return NextResponse.json(
        {
          success: false,
          errorCode: "LIVE_MODERATION_VIEWER_NOT_CONNECTED",
          error: "현재 접속 중인 시청자를 찾을 수 없습니다.",
        },
        { status: 404 },
      );
    }

    let banId:
      | string
      | null = null;

    /*
     * ROOM은 DB에 차단을 만들지 않는다.
     */
    if (duration !== "ROOM") {
      const ban =
        await moderation.kick({
          broadcasterUserId:
            room.broadcasterUserId,
          roomId,
          targetUserId,
          targetGuestId:
            viewer?.guestId || "",
          duration,
          reason,
          reasonDetail:
            typeof body.reasonDetail ===
            "string"
              ? body.reasonDetail
              : "",
          actorUserId:
            snapshot.userId,
        });

      banId = ban.banId;
    }

    const kickMessage =
      duration === "ROOM"
        ? "방송에서 내보내졌습니다. 다시 입장할 수 있습니다."
        : duration === "ONE_DAY"
          ? "24시간 동안 이 방송자의 LIVE에 입장할 수 없습니다."
          : "강퇴가 해제될 때까지 이 방송자의 LIVE에 입장할 수 없습니다.";

    /*
     * 현재 접속 중인 viewer가 즉시
     * 강퇴 사실을 감지하도록 임시 신호 저장.
     */
    if (viewer && resolvedViewerId) {
      markViewerKicked({
        roomId,
        viewerId: resolvedViewerId,
        duration,
        message: kickMessage,
      });

      deleteViewer(
        roomId,
        resolvedViewerId,
      );
    }

    console.info(
      "LIVE_MODERATION_KICK",
      {
        banId,
        roomId,
        targetUserId:
          targetUserId || null,
        targetGuestId:
          viewer?.guestId || null,
        duration,
        reason,
        actorUserId:
          snapshot.userId,
      },
    );

    return NextResponse.json({
      success: true,
      banId,
      duration,
      rejoinAllowed:
        duration === "ROOM",
    });
  } catch (error) {
    console.error(
      "LIVE_MODERATION_POST_FAILED",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "LIVE 제재 처리 중 오류가 발생했습니다.",
      },
      {
        status: 500,
      },
    );
  }
}
