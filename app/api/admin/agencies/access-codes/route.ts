import { NextResponse } from "next/server";
import { AuthenticationError, AuthorizationError, requirePermission } from "@/lib/auth/authorization";
import { listAllSettlementAffiliations } from "@/lib/settlement/affiliation-store";
import {
  AGENCY_SCOPE_TYPES,
  disableAgencyAccessCode,
  listAgencyAccessCodes,
  setAgencyAccessCode,
  type AgencyScopeType,
} from "@/lib/agency/access-code-store";
import { LocalAuditLogRepository } from "@/lib/audit/local-audit-log-repository";

export const dynamic = "force-dynamic";

function errorResponse(error: unknown) {
  if (error instanceof AuthenticationError) return NextResponse.json({ success: false, error: error.message }, { status: 401 });
  if (error instanceof AuthorizationError) return NextResponse.json({ success: false, error: error.message }, { status: 403 });
  const message = error instanceof Error ? error.message : "접속코드 처리에 실패했습니다.";
  return NextResponse.json({ success: false, error: message }, { status: 400 });
}

export async function GET() {
  try {
    await requirePermission("ADMIN_PERMISSION_MANAGE");
    const [data, records] = await Promise.all([listAllSettlementAffiliations(), listAgencyAccessCodes()]);
    const targets = [
      ...data.headManagers.map((item) => ({ scopeType: "HEAD" as const, scopeId: item.headManagerUserId, label: item.headManagerUserId })),
      ...data.branches.map((item) => ({ scopeType: "BRANCH" as const, scopeId: item.branchId, label: item.name || item.branchId })),
      ...data.agencies.map((item) => ({ scopeType: "AGENCY" as const, scopeId: item.agencyId, label: item.name || item.agencyId })),
    ];
    return NextResponse.json({ success: true, targets, records });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requirePermission("ADMIN_PERMISSION_MANAGE");
    const body = await request.json().catch(() => ({}));
    const action = body.action === "DISABLE" ? "DISABLE" : "SET";

    if (action === "DISABLE") {
      const accessId = typeof body.accessId === "string" ? body.accessId.trim() : "";
      if (!accessId) return NextResponse.json({ success: false, error: "접속코드 대상을 선택해주세요." }, { status: 400 });
      const record = await disableAgencyAccessCode(accessId);
      if (!record) return NextResponse.json({ success: false, error: "접속코드 정보를 찾지 못했습니다." }, { status: 404 });
      await new LocalAuditLogRepository().append({
        adminUserId: admin.userId,
        adminRole: admin.role,
        action: "SYSTEM_ACTION",
        targetType: "AGENCY_ACCESS",
        targetId: accessId,
        reason: "조직 접속코드 비활성화",
        result: "SUCCESS",
        metadata: { event: "AGENCY_ACCESS_CODE_DISABLE" },
      });
      return NextResponse.json({ success: true, record });
    }

    const scopeType = typeof body.scopeType === "string" && AGENCY_SCOPE_TYPES.includes(body.scopeType as AgencyScopeType) ? (body.scopeType as AgencyScopeType) : null;
    const scopeId = typeof body.scopeId === "string" ? body.scopeId.trim() : "";
    const label = typeof body.label === "string" ? body.label.trim() : scopeId;
    const code = typeof body.code === "string" ? body.code : "";
    if (!scopeType || !scopeId) return NextResponse.json({ success: false, error: "조직을 선택해주세요." }, { status: 400 });

    const data = await listAllSettlementAffiliations();
    const exists =
      scopeType === "HEAD" ? data.headManagers.some((item) => item.headManagerUserId === scopeId) :
      scopeType === "BRANCH" ? data.branches.some((item) => item.branchId === scopeId) :
      data.agencies.some((item) => item.agencyId === scopeId);
    if (!exists) return NextResponse.json({ success: false, error: "등록된 조직을 찾지 못했습니다." }, { status: 404 });

    const record = await setAgencyAccessCode({ scopeType, scopeId, label, code });
    await new LocalAuditLogRepository().append({
      adminUserId: admin.userId,
      adminRole: admin.role,
      action: "SYSTEM_ACTION",
      targetType: "AGENCY_ACCESS",
      targetId: record.accessId,
      reason: "조직 접속코드 등록/변경",
      result: "SUCCESS",
      metadata: { event: "AGENCY_ACCESS_CODE_SET", scopeType, scopeId },
    });
    return NextResponse.json({ success: true, record });
  } catch (error) {
    return errorResponse(error);
  }
}
