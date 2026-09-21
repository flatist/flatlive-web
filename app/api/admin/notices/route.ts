import {
  NextResponse,
} from "next/server";

import {
  AuthenticationError,
  AuthorizationError,
  requirePermission,
} from "@/lib/auth/authorization";

import {
  createNotice,
  deleteNotice,
  readNotices,
  updateNotice,
  type NoticeAudience,
  type NoticeStatus,
} from "@/lib/notice/notice-store";

export const runtime =
  "nodejs";

const AUDIENCES =
  new Set<NoticeAudience>([
    "ALL",
    "MEMBER",
    "SELLER",
  ]);

const STATUSES =
  new Set<NoticeStatus>([
    "PUBLIC",
    "PRIVATE",
  ]);

function normalizeDate(
  value: unknown,
): string | null {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  if (
    typeof value !==
    "string"
  ) {
    return null;
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return null;
  }

  return date.toISOString();
}

export async function GET() {
  try {
    await requirePermission(
      "MEMBER_READ",
    );

    const notices =
      await readNotices();

    return NextResponse.json({
      success: true,
      count:
        notices.length,
      notices,
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
      "ADMIN_NOTICE_LIST_FAILED",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "공지 목록을 불러오지 못했습니다.",
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
    const admin =
      await requirePermission(
        "MEMBER_READ",
      );

    const body =
      await request.json();

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

    const audience =
      typeof body?.audience ===
      "string"
        ? body.audience.trim()
        : "";

    const status =
      typeof body?.status ===
      "string"
        ? body.status.trim()
        : "";

    if (!title) {
      return NextResponse.json(
        {
          success: false,
          error:
            "공지 제목을 입력해주세요.",
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
          error:
            "공지 내용을 입력해주세요.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      title.length > 200
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "공지 제목은 200자 이하로 입력해주세요.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      content.length >
      20000
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "공지 내용은 20000자 이하로 입력해주세요.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      !AUDIENCES.has(
        audience as NoticeAudience,
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "공지 대상을 확인해주세요.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      !STATUSES.has(
        status as NoticeStatus,
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "공지 공개 상태를 확인해주세요.",
        },
        {
          status: 400,
        },
      );
    }

    const publishStartAt =
      normalizeDate(
        body?.publishStartAt,
      );

    const publishEndAt =
      normalizeDate(
        body?.publishEndAt,
      );

    if (
      publishStartAt &&
      publishEndAt &&
      new Date(
        publishStartAt,
      ).getTime() >
        new Date(
          publishEndAt,
        ).getTime()
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "게시 종료일은 시작일보다 이후여야 합니다.",
        },
        {
          status: 400,
        },
      );
    }

    const notice =
      await createNotice({
        title,
        content,

        audience:
          audience as NoticeAudience,

        status:
          status as NoticeStatus,

        important:
          Boolean(
            body?.important,
          ),

        pinned:
          Boolean(
            body?.pinned,
          ),

        publishStartAt,
        publishEndAt,

        createdByUserId:
          admin.userId,
      });

    return NextResponse.json(
      {
        success: true,
        notice,
      },
      {
        status: 201,
      },
    );
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
      "ADMIN_NOTICE_CREATE_FAILED",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "공지 등록 중 오류가 발생했습니다.",
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

    const noticeId =
      typeof body?.noticeId ===
      "string"
        ? body.noticeId.trim()
        : "";

    if (!noticeId) {
      return NextResponse.json(
        {
          success: false,
          error:
            "공지 ID가 필요합니다.",
        },
        {
          status: 400,
        },
      );
    }

    const title =
      typeof body?.title ===
      "string"
        ? body.title.trim()
        : undefined;

    const content =
      typeof body?.content ===
      "string"
        ? body.content.trim()
        : undefined;

    const audience =
      typeof body?.audience ===
      "string"
        ? body.audience.trim()
        : undefined;

    const status =
      typeof body?.status ===
      "string"
        ? body.status.trim()
        : undefined;

    if (
      title !== undefined &&
      !title
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "공지 제목을 입력해주세요.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      content !== undefined &&
      !content
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "공지 내용을 입력해주세요.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      audience !== undefined &&
      !AUDIENCES.has(
        audience as NoticeAudience,
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "공지 대상을 확인해주세요.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      status !== undefined &&
      !STATUSES.has(
        status as NoticeStatus,
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "공지 공개 상태를 확인해주세요.",
        },
        {
          status: 400,
        },
      );
    }

    const publishStartAt =
      body?.publishStartAt ===
      undefined
        ? undefined
        : normalizeDate(
            body.publishStartAt,
          );

    const publishEndAt =
      body?.publishEndAt ===
      undefined
        ? undefined
        : normalizeDate(
            body.publishEndAt,
          );

    const updated =
      await updateNotice(
        noticeId,
        {
          title,
          content,

          audience:
            audience as
              | NoticeAudience
              | undefined,

          status:
            status as
              | NoticeStatus
              | undefined,

          important:
            typeof body?.important ===
            "boolean"
              ? body.important
              : undefined,

          pinned:
            typeof body?.pinned ===
            "boolean"
              ? body.pinned
              : undefined,

          publishStartAt,
          publishEndAt,

          updatedByUserId:
            admin.userId,
        },
      );

    if (!updated) {
      return NextResponse.json(
        {
          success: false,
          error:
            "공지사항을 찾을 수 없습니다.",
        },
        {
          status: 404,
        },
      );
    }

    return NextResponse.json({
      success: true,
      notice:
        updated,
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
      "ADMIN_NOTICE_UPDATE_FAILED",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "공지 수정 중 오류가 발생했습니다.",
      },
      {
        status: 500,
      },
    );
  }
}

export async function DELETE(
  request: Request,
) {
  try {
    await requirePermission(
      "MEMBER_READ",
    );

    const body =
      await request.json();

    const noticeId =
      typeof body?.noticeId ===
      "string"
        ? body.noticeId.trim()
        : "";

    if (!noticeId) {
      return NextResponse.json(
        {
          success: false,
          error:
            "공지 ID가 필요합니다.",
        },
        {
          status: 400,
        },
      );
    }

    const deleted =
      await deleteNotice(
        noticeId,
      );

    if (!deleted) {
      return NextResponse.json(
        {
          success: false,
          error:
            "공지사항을 찾을 수 없습니다.",
        },
        {
          status: 404,
        },
      );
    }

    return NextResponse.json({
      success: true,
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
      "ADMIN_NOTICE_DELETE_FAILED",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "공지 삭제 중 오류가 발생했습니다.",
      },
      {
        status: 500,
      },
    );
  }
}
