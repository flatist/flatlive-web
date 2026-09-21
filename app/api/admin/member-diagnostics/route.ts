import { NextRequest, NextResponse } from "next/server";

import {
  AuthenticationError,
  AuthorizationError,
  requirePermission,
} from "@/lib/auth/authorization";
import { diagnoseMember } from "@/lib/admin/member-diagnostics-service";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const admin = await requirePermission("MEMBER_READ");
    const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";

    if (!query) {
      return NextResponse.json(
        { success: false, error: "회원 아이디를 입력해 주세요." },
        { status: 400 },
      );
    }

    const result = await diagnoseMember({
      query,
      adminRole: admin.role,
    });

    return NextResponse.json({ success: true, result });
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 401 });
    }
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 403 });
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "회원 오류 진단에 실패했습니다.",
      },
      { status: 400 },
    );
  }
}
