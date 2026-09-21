import { NextResponse } from "next/server";

import { requireAuthenticatedUser } from "@/lib/auth/authorization";
import { FanCardSettingsService } from "@/lib/fan-card";

export const dynamic = "force-dynamic";

const service = new FanCardSettingsService();

export async function GET() {
  try {
    const user = await requireAuthenticatedUser();
    const settings = await service.getSettings(user.userId);

    return NextResponse.json({
      success: true,
      settings,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "팬카드 설정을 불러오지 못했습니다.";

    return NextResponse.json(
      {
        success: false,
        error: message.includes("UNAUTHORIZED")
          ? "UNAUTHORIZED"
          : "FAN_CARD_SETTINGS_GET_FAILED",
        message,
      },
      {
        status: message.includes("UNAUTHORIZED") ? 401 : 500,
      },
    );
  }
}

export async function PUT(request: Request) {
  try {
    const user = await requireAuthenticatedUser();
    const body = await request.json();

    const settings = await service.updateSettings(user.userId, {
      fanEnabled: body.fanEnabled,
      fanMessage: body.fanMessage,
      fanPriceFlat: body.fanPriceFlat,
      fanDurationType: body.fanDurationType,
      fanNicknameColor: body.fanNicknameColor,

      vipEnabled: body.vipEnabled,
      vipMessage: body.vipMessage,
      vipImageUrl: body.vipImageUrl,
      vipPriceFlat: body.vipPriceFlat,
      vipDurationType: body.vipDurationType,
      vipNicknameColor: body.vipNicknameColor,
    });

    return NextResponse.json({
      success: true,
      settings,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "팬카드 설정을 저장하지 못했습니다.";

    return NextResponse.json(
      {
        success: false,
        error: message.includes("UNAUTHORIZED")
          ? "UNAUTHORIZED"
          : "FAN_CARD_SETTINGS_SAVE_FAILED",
        message,
      },
      {
        status: message.includes("UNAUTHORIZED") ? 401 : 400,
      },
    );
  }
}
