import {
  NextResponse,
} from "next/server";

import {
  AuthenticationError,
  requireAuthenticatedUser,
} from "@/lib/auth/authorization";

import {
  createSupportInquiry,
  readSupportInquiriesByUser,
  type SupportCategory,
} from "@/lib/support/support-store";

export const runtime =
  "nodejs";

const SUPPORT_CATEGORIES:
  SupportCategory[] = [
    "ACCOUNT",
    "LIVE",
    "FLIT",
    "VOD",
    "FLAT",
    "PAYMENT",
    "REPORT",
    "OTHER",
  ];

function isSupportCategory(
  value: unknown,
): value is SupportCategory {
  return (
    typeof value === "string" &&
    SUPPORT_CATEGORIES.includes(
      value as SupportCategory,
    )
  );
}

export async function GET() {
  try {
    const user =
      await requireAuthenticatedUser();

    const inquiries =
      await readSupportInquiriesByUser(
        user.userId,
      );

    return NextResponse.json({
      success: true,
      count:
        inquiries.length,
      inquiries,
    });
  } catch (error) {
    if (
      error instanceof
      AuthenticationError
    ) {
      return NextResponse.json(
        {
          success: false,
          errorCode:
            "SUPPORT_LOGIN_REQUIRED",
          error:
            error.message,
        },
        {
          status: 401,
        },
      );
    }

    console.error(
      "SUPPORT_LIST_FAILED",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "문의 내역을 불러오지 못했습니다.",
      },
      {
        status: 500,
      },
    );
  }
}

export async function POST(
  request: Request,
) {
  try {
    const user =
      await requireAuthenticatedUser();

    const body =
      await request.json();

    const category =
      body?.category;

    const title =
      typeof body?.title ===
      "string"
        ? body.title.trim()
        : "";

    const content =
      typeof body?.content ===
      "string"
        ? body.content.trim()
        : "";

    if (
      !isSupportCategory(
        category,
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          errorCode:
            "SUPPORT_CATEGORY_INVALID",
          error:
            "문의 유형을 선택해주세요.",
        },
        {
          status: 400,
        },
      );
    }

    if (!title) {
      return NextResponse.json(
        {
          success: false,
          errorCode:
            "SUPPORT_TITLE_REQUIRED",
          error:
            "문의 제목을 입력해주세요.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      title.length > 100
    ) {
      return NextResponse.json(
        {
          success: false,
          errorCode:
            "SUPPORT_TITLE_TOO_LONG",
          error:
            "문의 제목은 100자 이하로 입력해주세요.",
        },
        {
          status: 400,
        },
      );
    }

    if (!content) {
      return NextResponse.json(
        {
          success: false,
          errorCode:
            "SUPPORT_CONTENT_REQUIRED",
          error:
            "문의 내용을 입력해주세요.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      content.length > 3000
    ) {
      return NextResponse.json(
        {
          success: false,
          errorCode:
            "SUPPORT_CONTENT_TOO_LONG",
          error:
            "문의 내용은 3000자 이하로 입력해주세요.",
        },
        {
          status: 400,
        },
      );
    }

    const inquiry =
      await createSupportInquiry({
        userId:
          user.userId,

        userEmail:
          user.email,

        category,

        title,

        content,
      });

    return NextResponse.json(
      {
        success: true,
        inquiry,
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    if (
      error instanceof
      AuthenticationError
    ) {
      return NextResponse.json(
        {
          success: false,
          errorCode:
            "SUPPORT_LOGIN_REQUIRED",
          error:
            error.message,
        },
        {
          status: 401,
        },
      );
    }

    console.error(
      "SUPPORT_CREATE_FAILED",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "문의 접수 중 오류가 발생했습니다.",
      },
      {
        status: 500,
      },
    );
  }
}
