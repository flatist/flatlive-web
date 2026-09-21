import {
  NextResponse,
} from "next/server";

import {
  AuthenticationError,
  AuthorizationError,
  requirePermission,
} from "@/lib/auth/authorization";

import {
  createNotification,
} from "@/lib/notification/notification-store";

import {
  readSupportInquiries,
  updateSupportInquiry,
  type SupportStatus,
} from "@/lib/support/support-store";

export const runtime =
  "nodejs";

const SUPPORT_STATUSES:
  SupportStatus[] = [
    "RECEIVED",
    "IN_PROGRESS",
    "ANSWERED",
  ];

function isSupportStatus(
  value: unknown,
): value is SupportStatus {
  return (
    typeof value ===
      "string" &&
    SUPPORT_STATUSES.includes(
      value as SupportStatus,
    )
  );
}

export async function GET() {
  try {
    await requirePermission(
      "MEMBER_READ",
    );

    const inquiries =
      await readSupportInquiries();

    return NextResponse.json({
      success: true,
      count:
        inquiries.length,
      inquiries,
    });
  } catch (error) {
    if (
      error instanceof
        AuthenticationError ||
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
          status:
            error.status,
        },
      );
    }

    console.error(
      "ADMIN_SUPPORT_LIST_FAILED",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "고객 문의 목록을 불러오지 못했습니다.",
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
        "MEMBER_READ",
      );

    const body =
      await request.json();

    const inquiryId =
      typeof body?.inquiryId ===
      "string"
        ? body.inquiryId.trim()
        : "";

    const status =
      body?.status;

    const adminAnswer =
      typeof body?.adminAnswer ===
      "string"
        ? body.adminAnswer.trim()
        : "";

    if (!inquiryId) {
      return NextResponse.json(
        {
          success: false,
          errorCode:
            "SUPPORT_INQUIRY_ID_REQUIRED",
          error:
            "문의 ID가 필요합니다.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      !isSupportStatus(
        status,
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          errorCode:
            "SUPPORT_STATUS_INVALID",
          error:
            "문의 처리 상태가 올바르지 않습니다.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      adminAnswer.length >
      5000
    ) {
      return NextResponse.json(
        {
          success: false,
          errorCode:
            "SUPPORT_ANSWER_TOO_LONG",
          error:
            "답변은 5000자 이하로 입력해주세요.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      status ===
        "ANSWERED" &&
      !adminAnswer
    ) {
      return NextResponse.json(
        {
          success: false,
          errorCode:
            "SUPPORT_ANSWER_REQUIRED",
          error:
            "답변 완료 처리 시 답변 내용을 입력해주세요.",
        },
        {
          status: 400,
        },
      );
    }

    const result =
      await updateSupportInquiry(
        inquiryId,
        {
          status,
          adminAnswer,
          answeredByUserId:
            admin.userId,
        },
      );

    if (!result) {
      return NextResponse.json(
        {
          success: false,
          errorCode:
            "SUPPORT_INQUIRY_NOT_FOUND",
          error:
            "문의 내역을 찾을 수 없습니다.",
        },
        {
          status: 404,
        },
      );
    }

    const {
      previous,
      updated,
    } = result;

    let notificationSent =
      false;

    const becameAnswered =
      updated.status ===
        "ANSWERED" &&
      previous.status !==
        "ANSWERED";

    if (
      becameAnswered &&
      updated.userId
    ) {
      try {
        await createNotification({
          userId:
            updated.userId,

          type:
            "SYSTEM",

          title:
            "1:1 문의 답변이 등록되었습니다.",

          message:
            `문의 "${updated.title}"에 답변이 등록되었습니다.`,

          href:
            "/support",
        });

        notificationSent =
          true;
      } catch (
        notificationError
      ) {
        console.error(
          "SUPPORT_ANSWER_NOTIFICATION_FAILED",
          {
            inquiryId:
              updated.id,

            userId:
              updated.userId,

            error:
              notificationError,
          },
        );
      }
    }

    return NextResponse.json({
      success: true,
      inquiry:
        updated,
      notificationSent,
    });
  } catch (error) {
    if (
      error instanceof
        AuthenticationError ||
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
          status:
            error.status,
        },
      );
    }

    console.error(
      "ADMIN_SUPPORT_UPDATE_FAILED",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "문의 처리 중 오류가 발생했습니다.",
      },
      {
        status: 500,
      },
    );
  }
}
