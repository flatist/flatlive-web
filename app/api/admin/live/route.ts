import { NextResponse } from "next/server";
import { requirePermission, AuthenticationError, AuthorizationError } from "@/lib/auth/authorization";
import { listLiveRooms, deleteLiveRoom } from "@/lib/live/test-signaling-store";
import { LocalAuditLogRepository } from "@/lib/audit/local-audit-log-repository";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requirePermission("LIVE_READ");
    return NextResponse.json({ success: true, rooms: listLiveRooms() });
  } catch (error) {
    if (error instanceof AuthenticationError) return NextResponse.json({ success: false, error: error.message }, { status: 401 });
    if (error instanceof AuthorizationError) return NextResponse.json({ success: false, error: error.message }, { status: 403 });
    console.error("ADMIN_LIVE_GET_FAILED", error);
    return NextResponse.json({ success: false, error: "LIVE 목록을 불러오지 못했습니다." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requirePermission("LIVE_MODERATE");
    const body = await request.json().catch(() => ({}));
    const roomId = typeof body.roomId === "string" ? body.roomId.trim() : "";
    const reason = typeof body.reason === "string" ? body.reason.trim() : "";

    if (body.action !== "force-end" || !roomId) {
      return NextResponse.json({ success: false, error: "잘못된 요청입니다." }, { status: 400 });
    }

    const removed = deleteLiveRoom(roomId);
    await new LocalAuditLogRepository().append({
      adminUserId: admin.userId,
      adminRole: admin.role,
      action: "LIVE_FORCE_END",
      targetType: "LIVE_ROOM",
      targetId: roomId,
      reason: reason || "관리자 강제 종료",
      result: removed ? "SUCCESS" : "FAILED",
    });

    if (!removed) {
      return NextResponse.json({ success: false, error: "이미 종료됐거나 존재하지 않는 방송입니다." }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof AuthenticationError) return NextResponse.json({ success: false, error: error.message }, { status: 401 });
    if (error instanceof AuthorizationError) return NextResponse.json({ success: false, error: error.message }, { status: 403 });
    console.error("ADMIN_LIVE_POST_FAILED", error);
    return NextResponse.json({ success: false, error: "LIVE 관리 처리 중 오류가 발생했습니다." }, { status: 500 });
  }
}
