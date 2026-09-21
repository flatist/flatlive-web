import {
  NextResponse,
} from "next/server";

import {
  AuthenticationError,
  requireAuthenticatedUser,
} from "@/lib/auth/authorization";

import {
  HybridUserRepository,
} from "@/lib/repositories/hybrid-user-repository";

import {
  SocialService,
} from "@/lib/social/social-service";

import {
  isLiveNotificationEnabled,
  setLiveNotificationPreference,
} from "@/lib/notification/live-notification-preference-store";

export const runtime =
  "nodejs";

export async function GET() {
  try {
    const currentUser =
      await requireAuthenticatedUser();

    const socialService =
      new SocialService();

    const followingIds =
      await socialService
        .listFollowingUserIds(
          currentUser.userId,
        );

    const userRepository =
      new HybridUserRepository();

    const streamers =
      await Promise.all(
        followingIds.map(
          async (
            streamerUserId,
          ) => {
            const streamer =
              await userRepository
                .findById(
                  streamerUserId,
                );

            if (!streamer) {
              return null;
            }

            const enabled =
              await isLiveNotificationEnabled(
                currentUser.userId,
                streamerUserId,
              );

            return {
              userId:
                streamer.id,

              username:
                streamer.username,

              displayName:
                streamer.displayName,

              enabled,
            };
          },
        ),
      );

    return NextResponse.json({
      success: true,

      streamers:
        streamers.filter(
          (
            streamer,
          ): streamer is NonNullable<
            typeof streamer
          > =>
            streamer !== null,
        ),
    });
  } catch (error) {
    if (
      error instanceof
      AuthenticationError
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            error.message,
        },
        {
          status: 401,
        },
      );
    }

    console.error(
      "LIVE_NOTIFICATION_SETTINGS_LIST_FAILED",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "방송 알림 설정을 불러오지 못했습니다.",
      },
      {
        status: 500,
      },
    );
  }
}

export async function PATCH(
  request: Request,
) {
  try {
    const currentUser =
      await requireAuthenticatedUser();

    const body =
      await request.json();

    const streamerUserId =
      typeof body?.streamerUserId ===
      "string"
        ? body.streamerUserId.trim()
        : "";

    const enabled =
      body?.enabled;

    if (
      !streamerUserId ||
      typeof enabled !==
        "boolean"
    ) {
      return NextResponse.json(
        {
          success: false,
          errorCode:
            "LIVE_NOTIFICATION_SETTING_INVALID",
          error:
            "방송 알림 설정값이 올바르지 않습니다.",
        },
        {
          status: 400,
        },
      );
    }

    const socialService =
      new SocialService();

    const followingIds =
      await socialService
        .listFollowingUserIds(
          currentUser.userId,
        );

    if (
      !followingIds.includes(
        streamerUserId,
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          errorCode:
            "STREAMER_NOT_FOLLOWED",
          error:
            "팔로우한 사용자만 방송 알림을 설정할 수 있습니다.",
        },
        {
          status: 403,
        },
      );
    }

    const preference =
      await setLiveNotificationPreference(
        currentUser.userId,
        streamerUserId,
        enabled,
      );

    return NextResponse.json({
      success: true,
      preference,
    });
  } catch (error) {
    if (
      error instanceof
      AuthenticationError
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            error.message,
        },
        {
          status: 401,
        },
      );
    }

    console.error(
      "LIVE_NOTIFICATION_SETTING_UPDATE_FAILED",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "방송 알림 설정 중 오류가 발생했습니다.",
      },
      {
        status: 500,
      },
    );
  }
}
