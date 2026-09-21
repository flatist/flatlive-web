import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { randomUUID } from "crypto";

import {
  parseSessionToken,
  SESSION_COOKIE_NAME,
} from "@/lib/auth/session";

import {
  WalletService,
} from "@/lib/wallet/wallet-service";

import {
  readFlits,
} from "@/lib/flit/flit-store";

import {
  readVods,
} from "@/lib/vod/vod-store";

import {
  getCreatorSettlementAffiliation,
} from "@/lib/settlement/affiliation-store";

import {
  createSettlementRecord,
  listSettlementRecordsByCreator,
  updateSettlementRecordStatus,
} from "@/lib/settlement/record-store";

export const dynamic = "force-dynamic";

const FLAT_TO_KRW = 100;
const MIN_SETTLEMENT_FLAT = 500;

async function getCurrentUserId() {
  const token =
    (await cookies()).get(
      SESSION_COOKIE_NAME,
    )?.value;

  return token
    ? parseSessionToken(token)
        ?.userId ?? null
    : null;
}

async function getSettlementSummary(
  userId: string,
) {
  const walletService =
    new WalletService();

  const [
    revenue,
    allFlits,
    allVods,
    affiliation,
    records,
  ] = await Promise.all([
    walletService
      .getReceivedDonationSummary(
        userId,
      ),

    readFlits(),
    readVods(),

    getCreatorSettlementAffiliation(
      userId,
    ),

    listSettlementRecordsByCreator(
      userId,
    ),
  ]);

  /*
   * LIVE 후원은 현재 CREATOR 원장의
   * DONATION 총액을 사용한다.
   */
  const liveGross =
    revenue.liveReceived;

  /*
   * 영상 후원은 멋져요 10 FLAT,
   * 최고예요 50 FLAT 기준 총 발생액.
   */
  const myFlits =
    allFlits.filter(
      (item) =>
        item.userId === userId,
    );

  const myVods =
    allVods.filter(
      (item) =>
        item.userId === userId,
    );

  const contentGross = [
    ...myFlits,
    ...myVods,
  ].reduce(
    (sum, item) =>
      sum +
      item.greats * 10 +
      item.bests * 50,
    0,
  );

  const totalGross =
    liveGross +
    contentGross;

  const creatorRate =
    affiliation.affiliation ===
    "AGENCY"
      ? 60
      : 55;

  const creatorTotal =
    Math.floor(
      totalGross *
        creatorRate /
        100,
    );

  /*
   * 취소되지 않은 정산 신청의
   * 크리에이터 몫은 이미 사용된 수익으로 본다.
   */
  const reservedCreatorAmount =
    records
      .filter(
        (record) =>
          record.status !==
          "CANCELLED",
      )
      .reduce(
        (sum, record) =>
          sum +
          record.creatorAmount,
        0,
      );

  const availableCreatorAmount =
    Math.max(
      0,
      creatorTotal -
        reservedCreatorAmount,
    );

  return {
    affiliation:
      affiliation.affiliation,

    creatorRate,

    liveGross,
    contentGross,
    totalGross,

    creatorTotal,
    reservedCreatorAmount,
    availableCreatorAmount,

    availableKrw:
      availableCreatorAmount *
      FLAT_TO_KRW,

    flatToKrw:
      FLAT_TO_KRW,

    minSettlementFlat:
      MIN_SETTLEMENT_FLAT,

    minSettlementKrw:
      MIN_SETTLEMENT_FLAT *
      FLAT_TO_KRW,

    records,
  };
}

export async function GET() {
  const userId =
    await getCurrentUserId();

  if (!userId) {
    return NextResponse.json(
      {
        success: false,
        errorCode:
          "SETTLEMENT_AUTH_REQUIRED",
        error:
          "로그인이 필요합니다.",
      },
      {
        status: 401,
        headers: {
          "Cache-Control":
            "no-store, no-cache, must-revalidate",
        },
      },
    );
  }

  const summary =
    await getSettlementSummary(
      userId,
    );

  return NextResponse.json(
    {
      success: true,
      ...summary,
    },
    {
      headers: {
        "Cache-Control":
          "no-store, no-cache, must-revalidate",
      },
    },
  );
}

export async function POST() {
  const userId =
    await getCurrentUserId();

  if (!userId) {
    return NextResponse.json(
      {
        success: false,
        errorCode:
          "SETTLEMENT_AUTH_REQUIRED",
        error:
          "로그인이 필요합니다.",
      },
      {
        status: 401,
      },
    );
  }

  const summary =
    await getSettlementSummary(
      userId,
    );

  if (
    summary.availableCreatorAmount <
    MIN_SETTLEMENT_FLAT
  ) {
    return NextResponse.json(
      {
        success: false,
        errorCode:
          "SETTLEMENT_MINIMUM_NOT_MET",
        error:
          `정산 가능 수익이 ${MIN_SETTLEMENT_FLAT.toLocaleString("ko-KR")} FLAT 이상이어야 합니다.`,
      },
      {
        status: 400,
      },
    );
  }

  /*
   * record-store는 총 발생액을 받아
   * 60/10/5/5/20 또는 55/45로
   * 다시 배분한다.
   *
   * 현재 남은 크리에이터 수익에 대응하는
   * 총 발생액만 계산한다.
   */
  const requestGross =
    Math.floor(
      summary.availableCreatorAmount *
        100 /
        summary.creatorRate,
    );

  if (
    !Number.isSafeInteger(
      requestGross,
    ) ||
    requestGross <= 0
  ) {
    return NextResponse.json(
      {
        success: false,
        errorCode:
          "SETTLEMENT_INVALID_AMOUNT",
        error:
          "정산 금액을 계산할 수 없습니다.",
      },
      {
        status: 400,
      },
    );
  }

  const requestId =
    `settlement_request_${randomUUID()}`;

  const record =
    await createSettlementRecord({
      creatorUserId:
        userId,

      grossAmount:
        requestGross,

      sourceType:
        "CREATOR_SETTLEMENT_REQUEST",

      sourceId:
        requestId,
    });

  const pending =
    await updateSettlementRecordStatus({
      settlementId:
        record.settlementId,

      status:
        "PENDING",
    });

  return NextResponse.json(
    {
      success: true,
      settlement:
        pending,

      flatToKrw:
        FLAT_TO_KRW,
    },
    {
      status: 201,
      headers: {
        "Cache-Control":
          "no-store, no-cache, must-revalidate",
      },
    },
  );
}
