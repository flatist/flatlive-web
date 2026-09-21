import {
  NextRequest,
  NextResponse,
} from "next/server";

import { cookies } from "next/headers";

import { AuthService } from "@/lib/auth/auth-service";
import { SESSION_COOKIE_NAME } from "@/lib/auth/session";

import {
  addLiveChatForbiddenWord,
  deleteLiveChatForbiddenWord,
  getLiveChatFilterSettings,
  setLiveChatAutoBlock,
} from "@/lib/live/moderation/live-chat-filter-service";

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

export async function GET() {
  try {
    const snapshot =
      await getCurrentUser();

    if (!snapshot) {
      return NextResponse.json(
        {
          success: false,
          error: "로그인이 필요합니다.",
        },
        {
          status: 401,
        },
      );
    }

    const settings =
      await getLiveChatFilterSettings(
        snapshot.userId,
      );

    return NextResponse.json({
      success: true,
      ...settings,
    });
  } catch (error) {
    console.error(
      "LIVE_CHAT_FILTER_SETTINGS_GET_FAILED",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "채팅 관리 설정을 불러오지 못했습니다.",
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
          error: "로그인이 필요합니다.",
        },
        {
          status: 401,
        },
      );
    }

    const body =
      await request.json();

    const action =
      String(
        body.action || "",
      ).trim();

    if (
      action === "set-auto-block"
    ) {
      const settings =
        await setLiveChatAutoBlock(
          snapshot.userId,
          body.enabled === true,
        );

      return NextResponse.json({
        success: true,
        ...settings,
      });
    }

    if (
      action === "add-word"
    ) {
      const settings =
        await addLiveChatForbiddenWord(
          snapshot.userId,
          String(
            body.word || "",
          ),
        );

      return NextResponse.json({
        success: true,
        ...settings,
      });
    }

    if (
      action === "delete-word"
    ) {
      const id =
        String(
          body.id || "",
        ).trim();

      if (!id) {
        return NextResponse.json(
          {
            success: false,
            error:
              "삭제할 금지어 정보가 없습니다.",
          },
          {
            status: 400,
          },
        );
      }

      const settings =
        await deleteLiveChatForbiddenWord(
          snapshot.userId,
          id,
        );

      return NextResponse.json({
        success: true,
        ...settings,
      });
    }

    return NextResponse.json(
      {
        success: false,
        error:
          "지원하지 않는 요청입니다.",
      },
      {
        status: 400,
      },
    );
  } catch (error) {
    console.error(
      "LIVE_CHAT_FILTER_SETTINGS_POST_FAILED",
      error,
    );

    const knownError =
      error instanceof Error
        ? error.message
        : "";

    return NextResponse.json(
      {
        success: false,
        error:
          knownError ===
          "LIVE_CHAT_FILTER_WORD_REQUIRED"
            ? "금지어를 입력해주세요."
            : "채팅 관리 설정 저장 중 오류가 발생했습니다.",
      },
      {
        status:
          knownError ===
          "LIVE_CHAT_FILTER_WORD_REQUIRED"
            ? 400
            : 500,
      },
    );
  }
}
