import { NextRequest, NextResponse } from "next/server";

import {
  AuthenticationError,
  AuthorizationError,
  requirePermission,
} from "@/lib/auth/authorization";

export const dynamic = "force-dynamic";

type Category =
  | "LOGIN"
  | "LIVE"
  | "CHAT"
  | "DONATION"
  | "WALLET"
  | "SETTLEMENT"
  | "FLIT"
  | "VOD"
  | "NOTIFICATION"
  | "GENERAL";

function has(
  value: string,
  words: string[],
) {
  return words.some((word) =>
    value.includes(word),
  );
}

function diagnose(symptom: string) {
  const value =
    symptom.toLowerCase();

  let category: Category =
    "GENERAL";

  if (
    has(value, [
      "로그인",
      "세션",
      "비밀번호",
      "인증",
      "login",
    ])
  ) {
    category = "LOGIN";
  } else if (
    has(value, [
      "후원",
      "선물",
      "donation",
      "수익 미반영",
    ])
  ) {
    category = "DONATION";
  } else if (
    has(value, [
      "채팅",
      "메시지",
      "chat",
    ])
  ) {
    category = "CHAT";
  } else if (
    has(value, [
      "라이브",
      "방송",
      "영상",
      "송출",
      "webrtc",
      "live",
    ])
  ) {
    category = "LIVE";
  } else if (
    has(value, [
      "지갑",
      "잔액",
      "플랫",
      "flat",
      "충전",
    ])
  ) {
    category = "WALLET";
  } else if (
    has(value, [
      "정산",
      "배분",
      "지급",
      "settlement",
    ])
  ) {
    category = "SETTLEMENT";
  } else if (
    has(value, [
      "flit",
      "플릿",
      "쇼츠",
      "업로드",
    ])
  ) {
    category = "FLIT";
  } else if (
    has(value, [
      "vod",
      "다시보기",
      "녹화",
    ])
  ) {
    category = "VOD";
  } else if (
    has(value, [
      "알림",
      "푸시",
      "notification",
    ])
  ) {
    category = "NOTIFICATION";
  }

  const plans = {
    LOGIN: {
      label: "로그인 · 인증",
      summary:
        "회원 상태와 로그인 세션을 우선 확인합니다.",
      checks: [
        "회원 상태 확인",
        "/api/auth/login 확인",
        "/api/auth/me 세션 확인",
        "최근 관리자 처리 확인",
      ],
      links: [
        {
          label: "회원 오류조회",
          href: "/admin/member-diagnostics",
        },
        {
          label: "회원 관리",
          href: "/admin/members",
        },
      ],
    },

    LIVE: {
      label: "LIVE 방송",
      summary:
        "방송방, 시그널링, 권한 상태를 확인합니다.",
      checks: [
        "LIVE room 존재 여부",
        "/api/live/rooms 상태",
        "/api/live/signal 상태",
        "방송자/시청자 권한",
      ],
      links: [
        {
          label: "LIVE 관리",
          href: "/admin/live",
        },
        {
          label: "감사 로그",
          href: "/admin/audit",
        },
      ],
    },

    CHAT: {
      label: "LIVE 채팅",
      summary:
        "채팅 API와 제재 상태를 확인합니다.",
      checks: [
        "/api/live/chat 상태",
        "채팅 moderation 상태",
        "회원 제재 여부",
        "roomId 확인",
      ],
      links: [
        {
          label: "LIVE 관리",
          href: "/admin/live",
        },
        {
          label: "회원 오류조회",
          href: "/admin/member-diagnostics",
        },
      ],
    },

    DONATION: {
      label: "후원 · FLAT",
      summary:
        "후원 Trace와 FLAT 거래를 확인하며 안전한 수동복구가 가능합니다.",
      checks: [
        "후원 Trace 확인",
        "발신자 FLAT 차감 확인",
        "수신자 수익 반영 확인",
        "자동 보상 여부",
        "수동검토 상태 여부",
      ],
      links: [
        {
          label: "후원 관리",
          href: "/admin/donations",
        },
        {
          label: "지갑 관리",
          href: "/admin/wallet",
        },
      ],
    },

    WALLET: {
      label: "지갑 · FLAT",
      summary:
        "지갑 잔액과 거래 원장을 비교합니다.",
      checks: [
        "현재 잔액 확인",
        "최근 debit/credit 확인",
        "transactionId 중복 확인",
        "원거래 비교",
      ],
      links: [
        {
          label: "지갑 관리",
          href: "/admin/wallet",
        },
        {
          label: "회원 오류조회",
          href: "/admin/member-diagnostics",
        },
      ],
    },

    SETTLEMENT: {
      label: "정산",
      summary:
        "발생 금액, 배분, 정산 상태를 확인합니다.",
      checks: [
        "원거래 확인",
        "총 발생금액 확인",
        "배분금액 확인",
        "정산 상태 확인",
      ],
      links: [
        {
          label: "정산 관리",
          href: "/admin/settlements",
        },
        {
          label: "감사 로그",
          href: "/admin/audit",
        },
      ],
    },

    FLIT: {
      label: "FLIT",
      summary:
        "FLIT 콘텐츠와 업로드 상태를 확인합니다.",
      checks: [
        "/api/flit 확인",
        "콘텐츠 존재 여부",
        "노출 상태 확인",
        "회원 권한 확인",
      ],
      links: [
        {
          label: "콘텐츠 관리",
          href: "/admin/content",
        },
      ],
    },

    VOD: {
      label: "VOD",
      summary:
        "VOD 저장 및 노출 상태를 확인합니다.",
      checks: [
        "/api/vod 확인",
        "VOD ID 확인",
        "소유자 확인",
        "노출 상태 확인",
      ],
      links: [
        {
          label: "콘텐츠 관리",
          href: "/admin/content",
        },
      ],
    },

    NOTIFICATION: {
      label: "알림",
      summary:
        "알림 생성 및 대상 상태를 확인합니다.",
      checks: [
        "/api/notifications 확인",
        "회원 알림 설정 확인",
        "LIVE 알림 설정 확인",
        "발송 대상 확인",
      ],
      links: [
        {
          label: "공지 관리",
          href: "/admin/notices",
        },
      ],
    },

    GENERAL: {
      label: "일반 시스템",
      summary:
        "영역을 확정하지 못했습니다. 발생 화면과 시간, ID를 함께 확인하세요.",
      checks: [
        "오류 발생 화면",
        "발생 시간",
        "회원 ID / roomId",
        "Trace ID",
        "감사 로그",
      ],
      links: [
        {
          label: "감사 로그",
          href: "/admin/audit",
        },
        {
          label: "회원 오류조회",
          href: "/admin/member-diagnostics",
        },
      ],
    },
  };

  return {
    category,
    ...plans[category],
  };
}

export async function POST(
  request: NextRequest,
) {
  try {
    await requirePermission(
      "MEMBER_READ",
    );

    const body =
      (await request.json()) as {
        symptom?: string;
      };

    const symptom =
      body.symptom?.trim() ?? "";

    if (!symptom) {
      return NextResponse.json(
        {
          success: false,
          error:
            "오류 증상을 입력해 주세요.",
        },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      result: {
        symptom,
        generatedAt:
          new Date().toISOString(),
        ...diagnose(symptom),
      },
    });
  } catch (error) {
    if (
      error instanceof
      AuthenticationError
    ) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        { status: 401 },
      );
    }

    if (
      error instanceof
      AuthorizationError
    ) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        { status: 403 },
      );
    }

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "시스템 진단 실패",
      },
      { status: 400 },
    );
  }
}
