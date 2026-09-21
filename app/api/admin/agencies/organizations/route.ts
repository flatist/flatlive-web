import { NextResponse } from "next/server";
import { AuthenticationError, AuthorizationError, requirePermission } from "@/lib/auth/authorization";
import {
  listAllSettlementAffiliations,
  setOrganizationStatus,
  upsertAgency,
  upsertBranch,
  upsertHeadManager,
  type AgencyStatus,
} from "@/lib/settlement/affiliation-store";
import { LocalAuditLogRepository } from "@/lib/audit/local-audit-log-repository";

export const dynamic = "force-dynamic";

function errorResponse(error: unknown) {
  if (error instanceof AuthenticationError) return NextResponse.json({ success: false, error: error.message }, { status: 401 });
  if (error instanceof AuthorizationError) return NextResponse.json({ success: false, error: error.message }, { status: 403 });
  return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "조직 처리에 실패했습니다." }, { status: 400 });
}

export async function GET() {
  try {
    await requirePermission("ADMIN_PERMISSION_MANAGE");
    const data = await listAllSettlementAffiliations();
    return NextResponse.json({ success: true, ...data });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requirePermission("ADMIN_PERMISSION_MANAGE");
    const body = await request.json().catch(() => ({}));
    const action = typeof body.action === "string" ? body.action : "";
    let record: unknown;
    let targetType = "AGENCY_ORGANIZATION";
    let targetId = "";

    if (action === "UPSERT_HEAD") {
      record = await upsertHeadManager({
        headManagerUserId: String(body.headManagerUserId || ""),
        name: String(body.name || ""),
        contact: String(body.contact || ""),
      });
      targetType = "AGENCY_HEAD";
      targetId = String(body.headManagerUserId || "");
    } else if (action === "UPSERT_BRANCH") {
      record = await upsertBranch({
        branchId: String(body.branchId || ""),
        name: String(body.name || ""),
        headManagerUserId: String(body.headManagerUserId || ""),
        contact: String(body.contact || ""),
      });
      targetType = "AGENCY_BRANCH";
      targetId = String(body.branchId || "");
    } else if (action === "UPSERT_AGENCY") {
      record = await upsertAgency({
        agencyId: String(body.agencyId || ""),
        name: String(body.name || ""),
        branchId: String(body.branchId || ""),
        contact: String(body.contact || ""),
      });
      targetType = "AGENCY";
      targetId = String(body.agencyId || "");
    } else if (action === "SET_STATUS") {
      const scopeType = body.scopeType === "HEAD" || body.scopeType === "BRANCH" || body.scopeType === "AGENCY" ? body.scopeType : null;
      const status: AgencyStatus | null = body.status === "ACTIVE" || body.status === "INACTIVE" ? body.status : null;
      if (!scopeType || !status) throw new Error("상태 변경 정보가 올바르지 않습니다.");
      targetId = String(body.scopeId || "").trim();
      if (!targetId) throw new Error("조직 ID가 필요합니다.");
      record = await setOrganizationStatus({ scopeType, scopeId: targetId, status });
      targetType = `AGENCY_${scopeType}`;
    } else {
      throw new Error("지원하지 않는 작업입니다.");
    }

    await new LocalAuditLogRepository().append({
      adminUserId: admin.userId,
      adminRole: admin.role,
      action: "SYSTEM_ACTION",
      targetType,
      targetId,
      reason: action === "SET_STATUS" ? "조직 상태 변경" : "조직 등록/수정",
      result: "SUCCESS",
      metadata: { event: action },
    });

    return NextResponse.json({ success: true, record });
  } catch (error) {
    return errorResponse(error);
  }
}
