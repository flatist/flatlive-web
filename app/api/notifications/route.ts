import {
  NextResponse,
} from "next/server";

import {
  AuthenticationError,
  requireAuthenticatedUser,
} from "@/lib/auth/authorization";

import {
  countUnreadNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  readNotificationsByUser,
} from "@/lib/notification/notification-store";

export const runtime =
  "nodejs";

export async function GET() {
  try {
    const user =
      await requireAuthenticatedUser();

    const [
      notifications,
      unreadCount,
    ] =
      await Promise.all([
        readNotificationsByUser(
          user.userId,
        ),

        countUnreadNotifications(
          user.userId,
        ),
      ]);

    return NextResponse.json({
      success: true,

      count:
        notifications.length,

      unreadCount,

      notifications,
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
      "NOTIFICATION_LIST_FAILED",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "알림을 불러오지 못했습니다.",
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
    const user =
      await requireAuthenticatedUser();

    const body =
      await request.json();

    const action =
      typeof body?.action ===
      "string"
        ? body.action.trim()
        : "";

    if (
      action ===
      "READ_ALL"
    ) {
      const changed =
        await markAllNotificationsRead(
          user.userId,
        );

      const unreadCount =
        await countUnreadNotifications(
          user.userId,
        );

      return NextResponse.json({
        success: true,
        changed,
        unreadCount,
      });
    }

    if (
      action ===
      "READ"
    ) {
      const notificationId =
        typeof body?.notificationId ===
        "string"
          ? body.notificationId.trim()
          : "";

      if (!notificationId) {
        return NextResponse.json(
          {
            success: false,
            errorCode:
              "NOTIFICATION_ID_REQUIRED",
            error:
              "알림 ID가 필요합니다.",
          },
          {
            status: 400,
          },
        );
      }

      const updated =
        await markNotificationRead(
          notificationId,
          user.userId,
        );

      if (!updated) {
        return NextResponse.json(
          {
            success: false,
            errorCode:
              "NOTIFICATION_NOT_FOUND",
            error:
              "알림을 찾을 수 없습니다.",
          },
          {
            status: 404,
          },
        );
      }

      const unreadCount =
        await countUnreadNotifications(
          user.userId,
        );

      return NextResponse.json({
        success: true,
        notification:
          updated,
        unreadCount,
      });
    }

    return NextResponse.json(
      {
        success: false,
        errorCode:
          "NOTIFICATION_ACTION_INVALID",
        error:
          "알림 처리 방식이 올바르지 않습니다.",
      },
      {
        status: 400,
      },
    );
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
      "NOTIFICATION_UPDATE_FAILED",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "알림 처리 중 오류가 발생했습니다.",
      },
      {
        status: 500,
      },
    );
  }
}
