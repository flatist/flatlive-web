import { NextResponse } from "next/server";

import {
  AuthenticationError,
  AuthorizationError,
  requirePermission,
} from "@/lib/auth/authorization";

import { LocalAuditLogRepository } from "@/lib/audit/local-audit-log-repository";

export async function GET() {
  try {
    const admin = await requirePermission("AUDIT_LOG_READ");

    const repository = new LocalAuditLogRepository();
    const logs = await repository.list(200);

    return NextResponse.json({
      success: true,
      viewer: {
        userId: admin.userId,
        role: admin.role,
      },
      count: logs.length,
      logs,
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

    console.error("AUDIT_LOG_READ_FAILED", error);

    return NextResponse.json(
      { error: "감사 로그 조회 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
