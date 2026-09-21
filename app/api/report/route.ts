import {
  NextResponse,
} from "next/server";

import {
  randomUUID,
} from "node:crypto";

import {
  cookies,
} from "next/headers";

import {
  AuthService,
} from "@/lib/auth/auth-service";

import {
  SESSION_COOKIE_NAME,
} from "@/lib/auth/session";

import {
  createReport,
  type ReportReason,
  type ReportTargetType,
} from "@/lib/report/report-store";

export const runtime =
  "nodejs";

const TARGET_TYPES =
  new Set<ReportTargetType>([
    "LIVE",
    "FLIT",
    "VOD",
  ]);

const REASONS =
  new Set<ReportReason>([
    "SEXUAL",
    "VIOLENCE",
    "HARASSMENT",
    "ILLEGAL_FRAUD",
    "COPYRIGHT",
    "PORTRAIT_PRIVACY",
    "IMPERSONATION",
    "DEFAMATION",
    "TRADEMARK",
    "ILLEGAL_HARMFUL",
    "SPAM",
    "OTHER",
  ]);

function makeTraceId() {
  return `REPORT-${Date.now()}-${randomUUID()
    .slice(0, 8)
    .toUpperCase()}`;
}

export async function POST(
  request: Request,
) {
  const traceId =
    makeTraceId();

  try {
    const cookieStore =
      await cookies();

    const token =
      cookieStore.get(
        SESSION_COOKIE_NAME,
      )?.value;

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          errorCode:
            "REPORT_LOGIN_REQUIRED",
          error:
            "로그인이 필요합니다.",
          traceId,
        },
        {
          status: 401,
        },
      );
    }

    const authService =
      new AuthService();

    const snapshot =
      await authService.getCurrentUserSnapshot(
        token,
      );

    if (!snapshot) {
      return NextResponse.json(
        {
          success: false,
          errorCode:
            "REPORT_SESSION_INVALID",
          error:
            "로그인 세션이 유효하지 않습니다.",
          traceId,
        },
        {
          status: 401,
        },
      );
    }

    const body =
      await request.json();

    const targetType =
      typeof body?.targetType ===
      "string"
        ? body.targetType.trim()
        : "";

    const targetId =
      typeof body?.targetId ===
      "string"
        ? body.targetId.trim()
        : "";

    const targetOwnerUserId =
      typeof body?.targetOwnerUserId ===
      "string"
        ? body.targetOwnerUserId.trim()
        : "";

    const targetTitle =
      typeof body?.targetTitle ===
      "string"
        ? body.targetTitle.trim()
        : "";

    const reason =
      typeof body?.reason ===
      "string"
        ? body.reason.trim()
        : "";

    const detail =
      typeof body?.detail ===
      "string"
        ? body.detail.trim()
        : "";

    if (
      !TARGET_TYPES.has(
        targetType as ReportTargetType,
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          errorCode:
            "REPORT_TARGET_TYPE_INVALID",
          error:
            "신고 대상 유형이 올바르지 않습니다.",
          traceId,
        },
        {
          status: 400,
        },
      );
    }

    if (!targetId) {
      return NextResponse.json(
        {
          success: false,
          errorCode:
            "REPORT_TARGET_ID_REQUIRED",
          error:
            "신고 대상 ID가 필요합니다.",
          traceId,
        },
        {
          status: 400,
        },
      );
    }

    if (
      !REASONS.has(
        reason as ReportReason,
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          errorCode:
            "REPORT_REASON_INVALID",
          error:
            "신고 사유가 올바르지 않습니다.",
          traceId,
        },
        {
          status: 400,
        },
      );
    }

    if (
      reason === "OTHER" &&
      !detail
    ) {
      return NextResponse.json(
        {
          success: false,
          errorCode:
            "REPORT_DETAIL_REQUIRED",
          error:
            "기타 신고 사유를 입력해주세요.",
          traceId,
        },
        {
          status: 400,
        },
      );
    }

    if (
      detail.length > 1000
    ) {
      return NextResponse.json(
        {
          success: false,
          errorCode:
            "REPORT_DETAIL_TOO_LONG",
          error:
            "신고 내용은 1000자 이하로 입력해주세요.",
          traceId,
        },
        {
          status: 400,
        },
      );
    }

    if (
      targetOwnerUserId &&
      targetOwnerUserId ===
        snapshot.userId
    ) {
      return NextResponse.json(
        {
          success: false,
          errorCode:
            "REPORT_SELF_NOT_ALLOWED",
          error:
            "본인 콘텐츠는 신고할 수 없습니다.",
          traceId,
        },
        {
          status: 400,
        },
      );
    }

    const result =
      await createReport({
        reporterUserId:
          snapshot.userId,

        reporterUsername:
          snapshot.username ?? "",

        targetType:
          targetType as ReportTargetType,

        targetId,

        targetOwnerUserId,
        targetTitle,

        reason:
          reason as ReportReason,

        detail,

        traceId,
      });

    if (!result.created) {
      return NextResponse.json(
        {
          success: false,
          duplicate: true,
          reportId:
            result.report.id,
          errorCode:
            "REPORT_DUPLICATE",
          error:
            "이미 신고한 콘텐츠입니다.",
          traceId,
        },
        {
          status: 409,
        },
      );
    }

    return NextResponse.json(
      {
        success: true,
        reportId:
          result.report.id,
        status:
          result.report.status,
        traceId,
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    console.error(
      "REPORT CREATE ERROR",
      {
        traceId,
        error,
      },
    );

    return NextResponse.json(
      {
        success: false,
        errorCode:
          "REPORT_CREATE_FAILED",
        error:
          "신고 접수에 실패했습니다.",
        traceId,
      },
      {
        status: 500,
      },
    );
  }
}
