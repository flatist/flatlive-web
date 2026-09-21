import {
  NextResponse,
} from "next/server";

import {
  AuthenticationError,
  AuthorizationError,
  requirePermission,
} from "@/lib/auth/authorization";

import {
  findReportById,
  readReports,
  updateReport,
  type ReportStatus,
} from "@/lib/report/report-store";

import {
  createNotification,
} from "@/lib/notification/notification-store";

export const runtime =
  "nodejs";

const REPORT_STATUSES =
  new Set<ReportStatus>([
    "RECEIVED",
    "REVIEWING",
    "RESOLVED",
    "REJECTED",
  ]);

export async function GET() {
  try {
    const admin =
      await requirePermission(
        "REPORT_READ",
      );

    const reports =
      await readReports();

    return NextResponse.json({
      success: true,
      viewer: {
        userId:
          admin.userId,
        role:
          admin.role,
      },
      canAction:
        admin.role === "ADMIN" ||
        admin.role === "SUPER_ADMIN",
      count:
        reports.length,
      reports,
    });
  } catch (error) {
    if (
      error instanceof
      AuthenticationError
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            error.message,
        },
        {
          status: 401,
        },
      );
    }

    if (
      error instanceof
      AuthorizationError
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            error.message,
        },
        {
          status: 403,
        },
      );
    }

    console.error(
      "ADMIN_REPORT_LIST_FAILED",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "신고 목록을 불러오지 못했습니다.",
      },
      {
        status: 500,
      },
    );
  }
}

export async function PATCH(
  request: Request,
) {
  try {
    const admin =
      await requirePermission(
        "REPORT_ACTION",
      );

    const body =
      await request.json();

    const reportId =
      typeof body?.reportId ===
      "string"
        ? body.reportId.trim()
        : "";

    const status =
      typeof body?.status ===
      "string"
        ? body.status.trim()
        : "";

    const adminMemo =
      typeof body?.adminMemo ===
      "string"
        ? body.adminMemo.trim()
        : "";

    if (!reportId) {
      return NextResponse.json(
        {
          success: false,
          errorCode:
            "REPORT_ID_REQUIRED",
          error:
            "신고 ID가 필요합니다.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      !REPORT_STATUSES.has(
        status as ReportStatus,
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          errorCode:
            "REPORT_STATUS_INVALID",
          error:
            "신고 처리 상태가 올바르지 않습니다.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      adminMemo.length > 1000
    ) {
      return NextResponse.json(
        {
          success: false,
          errorCode:
            "REPORT_ADMIN_MEMO_TOO_LONG",
          error:
            "관리자 메모는 1000자 이하로 입력해주세요.",
        },
        {
          status: 400,
        },
      );
    }

    const previous =
      await findReportById(
        reportId,
      );

    const updated =
      await updateReport(
        reportId,
        {
          status:
            status as ReportStatus,
          adminMemo,
          actionedByUserId:
            admin.userId,
        },
      );

    if (!updated) {
      return NextResponse.json(
        {
          success: false,
          errorCode:
            "REPORT_NOT_FOUND",
          error:
            "신고 내역을 찾을 수 없습니다.",
        },
        {
          status: 404,
        },
      );
    }

    let notificationSent =
      false;

    const becameFinalStatus =
      (
        updated.status ===
          "RESOLVED" ||
        updated.status ===
          "REJECTED"
      ) &&
      previous?.status !==
        updated.status;

    if (
      becameFinalStatus &&
      updated.reporterUserId
    ) {
      try {
        const resultText =
          updated.status ===
          "RESOLVED"
            ? "처리 완료"
            : "기각";

        const memoText =
          updated.adminMemo
            ? `\n\n관리자 안내: ${updated.adminMemo}`
            : "";

        await createNotification({
          userId:
            updated.reporterUserId,

          type:
            "REPORT",

          title:
            "신고 처리 결과 안내",

          message:
            `접수하신 신고가 ${resultText}되었습니다.${memoText}`,

          href:
            "",
        });

        notificationSent =
          true;
      } catch (
        notificationError
      ) {
        console.error(
          "REPORT_RESULT_NOTIFICATION_FAILED",
          {
            reportId:
              updated.id,

            reporterUserId:
              updated.reporterUserId,

            error:
              notificationError,
          },
        );
      }
    }

    return NextResponse.json({
      success: true,
      report:
        updated,
      notificationSent,
    });
  } catch (error) {
    if (
      error instanceof
      AuthenticationError
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            error.message,
        },
        {
          status: 401,
        },
      );
    }

    if (
      error instanceof
      AuthorizationError
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            error.message,
        },
        {
          status: 403,
        },
      );
    }

    console.error(
      "ADMIN_REPORT_ACTION_FAILED",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "신고 처리 중 오류가 발생했습니다.",
      },
      {
        status: 500,
      },
    );
  }
}
