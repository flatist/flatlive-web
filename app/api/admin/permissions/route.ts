import { NextResponse } from "next/server";
import {
  AuthenticationError,
  AuthorizationError,
  requirePermission,
} from "@/lib/auth/authorization";
import { MemberAdminService } from "@/lib/admin/member-admin-service";
import { ROLES, roleHasPermission, type Role } from "@/lib/auth/permissions";
import { setUserRole } from "@/lib/auth/role-store";
import { LocalAuditLogRepository } from "@/lib/audit/local-audit-log-repository";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const admin = await requirePermission("ADMIN_PERMISSION_READ");
    const members = await new MemberAdminService().listMembers();
    const admins = members.filter((member) => member.role !== "USER");
    return NextResponse.json({
      success: true,
      admins,
      availableRoles: ROLES,
      canManage: roleHasPermission(admin.role, "ADMIN_PERMISSION_MANAGE"),
    });
  } catch (error) {
    if (error instanceof AuthenticationError) return NextResponse.json({ success: false, error: error.message }, { status: 401 });
    if (error instanceof AuthorizationError) return NextResponse.json({ success: false, error: error.message }, { status: 403 });
    console.error("ADMIN_PERMISSION_GET_FAILED", error);
    return NextResponse.json({ success: false, error: "관리자 권한 정보를 불러오지 못했습니다." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requirePermission("ADMIN_PERMISSION_MANAGE");
    const body = await request.json().catch(() => ({}));
    const userId = typeof body.userId === "string" ? body.userId.trim() : "";
    const role = typeof body.role === "string" && ROLES.includes(body.role as Role) ? body.role as Role : null;

    if (!userId || !role) {
      return NextResponse.json({ success: false, error: "회원과 역할을 확인해주세요." }, { status: 400 });
    }

    if (userId === admin.userId && role === "USER") {
      return NextResponse.json({ success: false, error: "현재 로그인한 본인의 관리자 권한은 이 화면에서 제거할 수 없습니다." }, { status: 400 });
    }

    const record = await setUserRole({ userId, role, grantedByUserId: admin.userId });
    await new LocalAuditLogRepository().append({
      adminUserId: admin.userId,
      adminRole: admin.role,
      action: "ADMIN_PERMISSION_CHANGE",
      targetType: "USER_ROLE",
      targetId: userId,
      reason: `${role} 역할 부여`,
      result: "SUCCESS",
      metadata: { role },
    });

    return NextResponse.json({ success: true, record });
  } catch (error) {
    if (error instanceof AuthenticationError) return NextResponse.json({ success: false, error: error.message }, { status: 401 });
    if (error instanceof AuthorizationError) return NextResponse.json({ success: false, error: error.message }, { status: 403 });
    console.error("ADMIN_PERMISSION_POST_FAILED", error);
    return NextResponse.json({ success: false, error: "관리자 권한 변경에 실패했습니다." }, { status: 500 });
  }
}
