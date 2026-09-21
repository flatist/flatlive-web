import { randomUUID } from "node:crypto";

import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { AuthService } from "@/lib/auth/auth-service";
import {
  SESSION_COOKIE_NAME,
} from "@/lib/auth/session";

import {
  CREATOR_POLICY_VERSION,
  MUSIC_IP_POLICY_VERSION,
} from "@/lib/creator/creator-consent-policy";

import {
  LocalIdentityRepository,
  createConsentId,
} from "@/lib/repositories/local-identity-repository";

function makeTraceId() {
  return `CREATOR-CONSENT-${Date.now()}-${randomUUID()
    .slice(0, 8)
    .toUpperCase()}`;
}

async function getCurrentUser() {
  const cookieStore =
    await cookies();

  const sessionToken =
    cookieStore.get(
      SESSION_COOKIE_NAME,
    )?.value;

  if (!sessionToken) {
    return null;
  }

  return new AuthService()
    .getCurrentUserSnapshot(
      sessionToken,
    );
}

export async function GET() {
  const traceId =
    makeTraceId();

  try {
    const snapshot =
      await getCurrentUser();

    if (!snapshot) {
      return NextResponse.json({
        success: true,
        loggedIn: false,
        accepted: false,
        creatorAccepted: false,
        musicAccepted: false,
        traceId,
      });
    }

    const repository =
      new LocalIdentityRepository();

    const client =
      await repository.findClientByCode(
        "FLATLIVE",
      );

    if (!client) {
      return NextResponse.json(
        {
          success: false,
          errorCode:
            "FLATLIVE_CLIENT_NOT_FOUND",
          error:
            "FLAT LIVE 서비스 정보를 찾지 못했습니다.",
          traceId,
        },
        {
          status: 500,
        },
      );
    }

    const creatorConsent =
      await repository.findConsent(
        snapshot.userId,
        client.id,
        "CREATOR_POLICY",
      );

    const musicConsent =
      await repository.findConsent(
        snapshot.userId,
        client.id,
        "MUSIC_IP_POLICY",
      );

    const creatorAccepted =
      creatorConsent?.status ===
        "GRANTED" &&
      creatorConsent.version ===
        CREATOR_POLICY_VERSION;

    const musicAccepted =
      musicConsent?.status ===
        "GRANTED" &&
      musicConsent.version ===
        MUSIC_IP_POLICY_VERSION;

    return NextResponse.json({
      success: true,
      loggedIn: true,
      creatorAccepted,
      musicAccepted,
      accepted:
        creatorAccepted &&
        musicAccepted,
      traceId,
    });
  } catch (error) {
    console.error(
      "CREATOR CONSENT STATUS ERROR",
      {
        traceId,
        error,
      },
    );

    return NextResponse.json(
      {
        success: false,
        errorCode:
          "CREATOR_CONSENT_STATUS_FAILED",
        error:
          "크리에이터 동의 상태를 확인하지 못했습니다.",
        traceId,
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
  const traceId =
    makeTraceId();

  try {
    const snapshot =
      await getCurrentUser();

    if (!snapshot) {
      return NextResponse.json(
        {
          success: false,
          errorCode:
            "LOGIN_REQUIRED",
          error:
            "로그인이 필요합니다.",
          traceId,
        },
        {
          status: 401,
        },
      );
    }

    const body =
      (await request.json()) as {
        creatorAccepted?: boolean;
        musicAccepted?: boolean;
      };

    if (
      body.creatorAccepted !== true ||
      body.musicAccepted !== true
    ) {
      return NextResponse.json(
        {
          success: false,
          errorCode:
            "REQUIRED_CONSENT_MISSING",
          error:
            "필수 크리에이터 정책에 모두 동의해주세요.",
          traceId,
        },
        {
          status: 400,
        },
      );
    }

    const repository =
      new LocalIdentityRepository();

    const client =
      await repository.findClientByCode(
        "FLATLIVE",
      );

    if (!client) {
      return NextResponse.json(
        {
          success: false,
          errorCode:
            "FLATLIVE_CLIENT_NOT_FOUND",
          error:
            "FLAT LIVE 서비스 정보를 찾지 못했습니다.",
          traceId,
        },
        {
          status: 500,
        },
      );
    }

    const grantedAt =
      new Date().toISOString();

    const existingCreator =
      await repository.findConsent(
        snapshot.userId,
        client.id,
        "CREATOR_POLICY",
      );

    if (
      existingCreator?.status !==
        "GRANTED" ||
      existingCreator.version !==
        CREATOR_POLICY_VERSION
    ) {
      await repository.createConsent({
        id: createConsentId(),
        userId: snapshot.userId,
        clientId: client.id,
        consentType:
          "CREATOR_POLICY",
        version:
          CREATOR_POLICY_VERSION,
        status: "GRANTED",
        grantedAt,
        revokedAt: null,
      });
    }

    const existingMusic =
      await repository.findConsent(
        snapshot.userId,
        client.id,
        "MUSIC_IP_POLICY",
      );

    if (
      existingMusic?.status !==
        "GRANTED" ||
      existingMusic.version !==
        MUSIC_IP_POLICY_VERSION
    ) {
      await repository.createConsent({
        id: createConsentId(),
        userId: snapshot.userId,
        clientId: client.id,
        consentType:
          "MUSIC_IP_POLICY",
        version:
          MUSIC_IP_POLICY_VERSION,
        status: "GRANTED",
        grantedAt,
        revokedAt: null,
      });
    }

    return NextResponse.json({
      success: true,
      accepted: true,
      traceId,
    });
  } catch (error) {
    console.error(
      "CREATOR CONSENT SAVE ERROR",
      {
        traceId,
        error,
      },
    );

    return NextResponse.json(
      {
        success: false,
        errorCode:
          "CREATOR_CONSENT_SAVE_FAILED",
        error:
          "크리에이터 정책 동의를 저장하지 못했습니다.",
        traceId,
      },
      {
        status: 500,
      },
    );
  }
}
