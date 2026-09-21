import { NextResponse } from "next/server";
import {
  AuthenticationError,
  AuthorizationError,
  requirePermission,
} from "@/lib/auth/authorization";
import {
  listAllSettlementRecords,
  updateSettlementRecordStatus,
  type SettlementRecordStatus,
} from "@/lib/settlement/record-store";
import { LocalAuditLogRepository } from "@/lib/audit/local-audit-log-repository";

export const dynamic = "force-dynamic";

const ALLOWED: SettlementRecordStatus[] = [
  "PENDING",
  "APPROVED",
  "PAID",
  "HOLD",
  "CANCELLED",
];

export async function GET() {
  try {
    await requirePermission("SETTLEMENT_READ");
    const records = await listAllSettlementRecords();
    return NextResponse.json({ success: true, records });
  } catch (error) {
    if (error instanceof AuthenticationError) return NextResponse.json({ success: false, error: error.message }, { status: 401 });
    if (error instanceof AuthorizationError) return NextResponse.json({ success: false, error: error.message }, { status: 403 });
    console.error("ADMIN_SETTLEMENT_GET_FAILED", error);
    return NextResponse.json({ success: false, error: "정산 내역을 불러오지 못했습니다." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requirePermission("SETTLEMENT_APPROVE");
    const body = await request.json().catch(() => ({}));
    const settlementId = typeof body.settlementId === "string" ? body.settlementId.trim() : "";
    const status = typeof body.status === "string" ? body.status as SettlementRecordStatus : null;

    if (!settlementId || !status || !ALLOWED.includes(status)) {
      return NextResponse.json({ success: false, error: "잘못된 정산 처리 요청입니다." }, { status: 400 });
    }

    try {
      const updated = await updateSettlementRecordStatus({ settlementId, status });
      await new LocalAuditLogRepository().append({
        adminUserId: admin.userId,
        adminRole: admin.role,
        action: "SETTLEMENT_ACTION",
        targetType: "SETTLEMENT",
        targetId: settlementId,
        reason: `${updated.status} 상태로 변경`,
        result: "SUCCESS",
        metadata: { amount: updated.creatorAmount, grossAmount: updated.grossAmount, status: updated.status },
      });
      return NextResponse.json({ success: true, record: updated });
    } catch (error) {
      await new LocalAuditLogRepository().append({
        adminUserId: admin.userId,
        adminRole: admin.role,
        action: "SETTLEMENT_ACTION",
        targetType: "SETTLEMENT",
        targetId: settlementId,
        reason: error instanceof Error ? error.message : "정산 상태 변경 실패",
        result: "FAILED",
      });
      throw error;
    }
  } catch (error) {
    if (error instanceof AuthenticationError) return NextResponse.json({ success: false, error: error.message }, { status: 401 });
    if (error instanceof AuthorizationError) return NextResponse.json({ success: false, error: error.message }, { status: 403 });
    console.error("ADMIN_SETTLEMENT_POST_FAILED", error);
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "정산 처리에 실패했습니다." }, { status: 400 });
  }
}
