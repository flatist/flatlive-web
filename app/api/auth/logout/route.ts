import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { AuthService } from "@/lib/auth/auth-service";
import { authCorsPreflight, withAuthCors } from "@/lib/auth/cors";
import {
  SESSION_COOKIE_NAME,
  getSessionCookieOptions,
} from "@/lib/auth/session";

import {
  deleteLiveRoom,
  listLiveRooms,
} from "@/lib/live/test-signaling-store";

import { ClutchService } from "@/lib/live/match/clutch-service";

import {
  finishLiveAnalytics,
} from "@/lib/analytics/live-analytics-store";

export function OPTIONS(request: Request) {
  return authCorsPreflight(request);
}

export async function POST(request: Request) {
  const cookieStore =
    await cookies();

  const sessionToken =
    cookieStore.get(
      SESSION_COOKIE_NAME,
    )?.value;

  let endedLiveRooms = 0;

  /*
   * FLATLIVE_LOGOUT_CLOSE_LIVE_V1
   *
   * 방송자가 LIVE 중 로그아웃하면
   * 세션을 지우기 전에 자신의 활성 방송을 모두 종료한다.
   */
  if (sessionToken) {
    try {
      const snapshot =
        await new AuthService()
          .getCurrentUserSnapshot(
            sessionToken,
          );

      if (snapshot?.userId) {
        const ownedRooms =
          listLiveRooms().filter(
            (room) =>
              room.broadcasterUserId ===
              snapshot.userId,
          );

        for (const room of ownedRooms) {
          /*
           * 정상 방송종료와 동일하게
           * LIVE 분석 종료 처리
           */
          try {
            await finishLiveAnalytics(
              room.roomId,
              Date.now(),
            );
          } catch (analyticsError) {
            console.error(
              "LOGOUT_LIVE_ANALYTICS_FINISH_FAILED",
              {
                roomId: room.roomId,
                broadcasterUserId:
                  snapshot.userId,
                error: analyticsError,
              },
            );
          }

          /*
           * CLUTCH 진행 중이었다면
           * 로그아웃과 함께 정리
           */
          try {
            const clutchService =
              new ClutchService();

            await clutchService.leaveByRoomId(
              room.roomId,
              snapshot.userId,
            );
          } catch (clutchError) {
            console.warn(
              "LOGOUT_CLUTCH_CLOSE_FAILED",
              {
                roomId: room.roomId,
                broadcasterUserId:
                  snapshot.userId,
                error: clutchError,
              },
            );
          }

          /*
           * 시청자 GET/poll에서 즉시 404가 발생하도록
           * LIVE 방 자체를 제거한다.
           */
          if (
            deleteLiveRoom(
              room.roomId,
            )
          ) {
            endedLiveRooms += 1;
          }
        }
      }
    } catch (error) {
      /*
       * LIVE 정리 중 문제가 생겨도
       * 사용자의 로그아웃 자체는 막지 않는다.
       */
      console.error(
        "LOGOUT_LIVE_CLOSE_FAILED",
        error,
      );
    }
  }

  const response =
    NextResponse.json({
      success: true,
      endedLiveRooms,
    });

  response.cookies.set(
    SESSION_COOKIE_NAME,
    "",
    {
      ...getSessionCookieOptions(),
      maxAge: 0,
    },
  );

  return withAuthCors(request, response);
}
