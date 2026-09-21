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
  ProfileService,
} from "@/lib/profile/profile-service";

import {
  getLiveRoom,
} from "@/lib/live/test-signaling-store";

import {
  addChatMessage,
} from "@/lib/live/chat-store";

import {
  addLiveRecommendation,
  getLiveRecommendCount,
  hasLiveRecommended,
} from "@/lib/live/recommend-store";

export async function GET(
  request: NextRequest,
) {
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
          "방송방을 찾을 수 없습니다.",
      },
      {
        status: 404,
      },
    );
  }

  let recommended = false;

  try {
    const cookieStore =
      await cookies();

    const token =
      cookieStore.get(
        SESSION_COOKIE_NAME,
      )?.value;

    if (token) {
      const snapshot =
        await new AuthService()
          .getCurrentUserSnapshot(
            token,
          );

      if (snapshot) {
        recommended =
          hasLiveRecommended(
            roomId,
            snapshot.userId,
          );
      }
    }
  } catch {
    recommended = false;
  }

  return NextResponse.json({
    success: true,
    count:
      getLiveRecommendCount(
        roomId,
      ),
    recommended,
  });
}

export async function POST(
  request: NextRequest,
) {
  try {
    const body =
      await request.json();

    const roomId =
      typeof body.roomId ===
      "string"
        ? body.roomId.trim()
        : "";

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
            "방송방을 찾을 수 없습니다.",
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
      return NextResponse.json(
        {
          success: false,
          error:
            "로그인 후 추천할 수 있습니다.",
        },
        {
          status: 401,
        },
      );
    }

    const snapshot =
      await new AuthService()
        .getCurrentUserSnapshot(
          token,
        );

    if (!snapshot) {
      return NextResponse.json(
        {
          success: false,
          error:
            "로그인 정보가 유효하지 않습니다.",
        },
        {
          status: 401,
        },
      );
    }

    const result =
      addLiveRecommendation(
        roomId,
        snapshot.userId,
      );

    let message = null;

    if (result.added) {
      const profile =
        await new ProfileService()
          .getByUserId(
            snapshot.userId,
          );

      const nickname =
        profile?.nickname?.trim() ||
        snapshot.displayName?.trim() ||
        snapshot.username;

      message =
        addChatMessage({
          roomId,
          userId:
            snapshot.userId,
          username:
            snapshot.username,
          nickname,
          message:
            "추천하셨습니다.",
          messageType:
            "RECOMMEND",
        });
    }

    return NextResponse.json({
      success: true,
      added:
        result.added,
      count:
        result.count,
      recommended: true,
      message,
    });
  } catch (error) {
    console.error(
      "LIVE_RECOMMEND_FAILED",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "추천 처리 중 오류가 발생했습니다.",
      },
      {
        status: 500,
      },
    );
  }
}
