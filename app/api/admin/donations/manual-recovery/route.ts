import { NextRequest, NextResponse } from "next/server";

import {
  AuthenticationError,
  AuthorizationError,
  requirePermission,
} from "@/lib/auth/authorization";

import { ManualRecoveryService } from "@/lib/donation/manual-recovery-service";

export async function POST(request: NextRequest) {
  try {
    const admin = await requirePermission(
      "DONATION_MANUAL_RECOVERY",
    );

    const body = await request.json();

    const donationId =
      typeof body.donationId === "string"
        ? body.donationId.trim()
        : "";

    const reason =
      typeof body.reason === "string"
        ? body.reason.trim()
        : "";

    if (!donationId) {
      return NextResponse.json(
        { error: "donationId가 필요합니다." },
        { status: 400 },
      );
    }

    if (!reason) {
      return NextResponse.json(
        { error: "수동복구 사유가 필요합니다." },
        { status: 400 },
      );
    }

    const result =
      await new ManualRecoveryService().recover({
        donationId,
        adminUserId: admin.userId,
        adminRole: admin.role,
        reason,
      });

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return NextResponse.json(
        { error: error.message },
        { status: 401 },
      );
    }

    if (error instanceof AuthorizationError) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 },
      );
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "수동복구 처리 중 오류가 발생했습니다.",
      },
      { status: 400 },
    );
  }
}
