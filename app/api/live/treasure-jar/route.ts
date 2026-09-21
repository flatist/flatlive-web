import { randomUUID } from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  parseSessionToken,
  SESSION_COOKIE_NAME,
} from "@/lib/auth/session";
import {
  beginTreasureSettlement,
  cancelTreasureSettlement,
  createTreasureJarEvent,
  finishTreasureSettlement,
  continueTreasureSettlement,
  extendTreasureJarEvent,
  joinTreasureJarEvent,
  listTreasureJarEvents,
  type TreasureJarEvent,
  type TreasureJarWinner,
} from "@/lib/live/treasure-jar-store";
import {
  getLiveRoom,
  listLiveRooms,
} from "@/lib/live/test-signaling-store";
import { WalletService } from "@/lib/wallet/wallet-service";

const PORTAL_DEFAULT_PRICE_FLAT = 100;
const PORTAL_ALLOWED_PRICES = [20, 100, 500] as const;
const PORTAL_ALLOWED_DURATIONS = [60, 180, 300] as const;
const TREASURE_REWARD_RATE = 0.8;
const TREASURE_COMPANY_RATE = 0.2;
const TREASURE_EMPTY_RETRY_SECONDS = 60;
const TREASURE_MIN_FLAT_PER_WINNER = 1;
const TREASURE_MAX_FLAT_PER_WINNER = 20;
const TREASURE_AUTO_TARGET_FLAT_PER_WINNER = 3;
const TREASURE_MAX_PURCHASE_FLAT = 500;
const TREASURE_ALLOWED_PURCHASE_FLAT = [20, 100, 500] as const;
const TREASURE_MIN_WINNERS = 10;
const TREASURE_MAX_WINNERS = 500;
const TREASURE_CLAIM_WINDOW_MS = 10_000;

function shuffle<T>(
  values: T[],
) {
  const copy = [...values];

  for (
    let index =
      copy.length - 1;
    index > 0;
    index -= 1
  ) {
    const randomIndex =
      Math.floor(
        Math.random() *
          (index + 1),
      );

    [
      copy[index],
      copy[randomIndex],
    ] = [
      copy[randomIndex],
      copy[index],
    ];
  }

  return copy;
}

async function authenticatedUserId() {
  const token =
    (await cookies()).get(
      SESSION_COOKIE_NAME,
    )?.value;

  return token
    ? parseSessionToken(
        token,
      )?.userId ?? null
    : null;
}

async function settleIfNeeded(
  event: TreasureJarEvent,
) {
  if (
    (event.kind !== "TREASURE" && event.kind !== "PORTAL") ||
    event.status !==
      "ACTIVE" ||
    Date.now() <
      event.expiresAt +
        TREASURE_CLAIM_WINDOW_MS
  ) {
    return event;
  }

  const settling =
    beginTreasureSettlement(
      event.id,
    );

  if (!settling) {
    return event;
  }

  const wallet =
    new WalletService();

  try {
    if (
      settling.participants
        .length === 0
    ) {
      // FLATLIVE_TREASURE_JAR_PERSIST_UNTIL_PAYOUT_V2_6
      // 참여자가 없으면 보물항아리을 종료/환불하지 않고
      // 다음 참여 기회를 위해 카운트다운을 다시 연장한다.
      return (
        extendTreasureJarEvent(
          settling.id,
          TREASURE_EMPTY_RETRY_SECONDS,
        ) ??
        settling
      );
    }

    // 한 명의 최대 지급액은 평균의 2배, 절대 최대 20 FLAT이다.
    // 이미 당첨된 사람은 다음 라운드에서 제외한다.
    const previousWinnerIds =
      new Set(
        settling.winners.map(
          (winner) =>
            winner.userId,
        ),
      );

    const eligibleParticipants =
      settling.participants.filter(
        (participant) =>
          !previousWinnerIds.has(
            participant.userId,
          ),
      );

    if (
      eligibleParticipants.length ===
      0
    ) {
      return (
        extendTreasureJarEvent(
          settling.id,
          TREASURE_EMPTY_RETRY_SECONDS,
        ) ??
        settling
      );
    }

    const roundWinnerCount =
      Math.min(
        settling.winnerCount,
        eligibleParticipants.length,
        settling.rewardFlat,
      );

    if (
      roundWinnerCount <= 0
    ) {
      return (
        extendTreasureJarEvent(
          settling.id,
          TREASURE_EMPTY_RETRY_SECONDS,
        ) ??
        settling
      );
    }

    const selected =
      shuffle(
        eligibleParticipants,
      ).slice(
        0,
        roundWinnerCount,
      );

    const roundPayoutTotal =
      Math.min(
        settling.rewardFlat,
        roundWinnerCount *
          TREASURE_MAX_FLAT_PER_WINNER,
      );

    // FLATLIVE_TREASURE_DYNAMIC_RANDOM_V7
    // 모든 당첨자에게 먼저 1 FLAT을 배정한 뒤 남은 금액을
    // 무작위 당첨자에게 1 FLAT씩 추가한다. 개인 최대는 평균의 2배,
    // 절대 최대는 20 FLAT이며 이번 라운드 지급 합계와 정확히 일치한다.
    const dynamicMaxFlatPerWinner =
      Math.min(
        TREASURE_MAX_FLAT_PER_WINNER,
        Math.max(
          TREASURE_MIN_FLAT_PER_WINNER,
          Math.ceil(
            (roundPayoutTotal /
              roundWinnerCount) *
              2,
          ),
        ),
      );

    const payoutAmounts =
      Array.from(
        {
          length:
            roundWinnerCount,
        },
        () =>
          TREASURE_MIN_FLAT_PER_WINNER,
      );

    let unallocatedFlat =
      roundPayoutTotal -
      roundWinnerCount *
        TREASURE_MIN_FLAT_PER_WINNER;

    while (unallocatedFlat > 0) {
      const availableIndexes =
        payoutAmounts
          .map((amount, index) => ({
            amount,
            index,
          }))
          .filter(
            (item) =>
              item.amount <
              dynamicMaxFlatPerWinner,
          );

      if (
        availableIndexes.length ===
        0
      ) {
        break;
      }

      const selectedIndex =
        availableIndexes[
          Math.floor(
            Math.random() *
              availableIndexes.length,
          )
        ].index;

      payoutAmounts[selectedIndex] += 1;
      unallocatedFlat -= 1;
    }

    let remainingRewardFlat =
      settling.rewardFlat;

    const winners:
      TreasureJarWinner[] = [];

    for (
      let index = 0;
      index <
      selected.length;
      index += 1
    ) {
      const participant =
        selected[index];

      const amount =
        payoutAmounts[index];

      const creditKey =
        `treasure:${settling.id}:winner:${participant.userId}`;

      const existing =
        await wallet.findTransactionByIdempotencyKey(
          participant.userId,
          "FLAT",
          creditKey,
        );

      if (!existing) {
        await wallet.createTransaction({
          userId:
            participant.userId,
          assetType:
            "FLAT",
          amount,
          direction:
            "CREDIT",
          transactionId:
            `TREASURE-WIN-${randomUUID()}`,
          idempotencyKey:
            creditKey,
          sourceType:
            "TREASURE_JAR_WIN",
          sourceId:
            settling.id,
        });
      }

      winners.push({
        userId:
          participant.userId,
        amount,
      });

      remainingRewardFlat -=
        amount;
    }

    return (
      continueTreasureSettlement(
        settling.id,
        {
          winners,
          remainingRewardFlat,
          durationSeconds:
            TREASURE_EMPTY_RETRY_SECONDS,
        },
      ) ??
      settling
    );
  } catch (error) {
    cancelTreasureSettlement(
      settling.id,
    );

    console.error(
      "TREASURE_JAR_SETTLEMENT_FAILED",
      {
        eventId:
          settling.id,
        error,
      },
    );

    return settling;
  }
}

export async function GET(
  request: Request,
) {
  const url =
    new URL(request.url);

  const roomId =
    url.searchParams
      .get("roomId")
      ?.trim() ?? "";

  if (!roomId) {
    return NextResponse.json(
      {
        success: false,
        error:
          "roomId가 필요합니다.",
      },
      {
        status: 400,
      },
    );
  }

  const userId =
    await authenticatedUserId();

  const rawEvents =
    listTreasureJarEvents(
      roomId,
    );

  const events =
    await Promise.all(
      rawEvents.map(
        settleIfNeeded,
      ),
    );

  return NextResponse.json({
    success: true,
    userId,
    serverNow:
      Date.now(),
    events:
      events.map(
        (event) => ({
          ...event,
          joined:
            !!userId &&
            event.participants.some(
              (participant) =>
                participant.userId ===
                userId,
            ),
          isPortalPlacement:
            event.kind === "PORTAL" && event.roomId !== roomId,
          claimOpen:
            (event.kind === "TREASURE" || event.kind === "PORTAL") &&
            event.roomId === roomId &&
            event.status ===
              "ACTIVE" &&
            Date.now() >=
              event.expiresAt &&
            Date.now() <
              event.expiresAt +
                TREASURE_CLAIM_WINDOW_MS,
          claimClosesAt:
            (event.kind === "TREASURE" || event.kind === "PORTAL") && event.roomId === roomId
              ? event.expiresAt +
                TREASURE_CLAIM_WINDOW_MS
              : null,
          wonAmount:
            userId
              ? event.winners.find(
                  (winner) =>
                    winner.userId ===
                    userId,
                )?.amount ?? 0
              : 0,
          participants:
            undefined,
          winners:
            undefined,
          participantCount:
            event.participants.length,
        }),
      ),
  });
}

export async function POST(
  request: Request,
) {
  const userId =
    await authenticatedUserId();

  if (!userId) {
    return NextResponse.json(
      {
        success: false,
        errorCode:
          "AUTH_REQUIRED",
        error:
          "로그인이 필요합니다.",
      },
      {
        status: 401,
      },
    );
  }

  try {
    const body =
      await request.json();

    const action =
      typeof body.action ===
      "string"
        ? body.action
        : "";

    if (
      action === "JOIN"
    ) {
      const eventId =
        typeof body.eventId ===
        "string"
          ? body.eventId.trim()
          : "";

      const event =
        joinTreasureJarEvent(
          eventId,
          userId,
        );

      if (!event) {
        return NextResponse.json(
          {
            success: false,
            errorCode:
              "TREASURE_JOIN_CLOSED",
            error:
              "카운트 종료 후 열린 장독대만 받을 수 있습니다.",
          },
          {
            status: 400,
          },
        );
      }

      return NextResponse.json({
        success: true,
        eventId:
          event.id,
        participantCount:
          event.participants
            .length,
      });
    }

    if (
      action !== "CREATE"
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "지원하지 않는 요청입니다.",
        },
        {
          status: 400,
        },
      );
    }

    const roomId =
      typeof body.roomId ===
      "string"
        ? body.roomId.trim()
        : "";

    const kind =
      body.kind === "PORTAL"
        ? "PORTAL"
        : "TREASURE";

    const room =
      getLiveRoom(roomId);

    if (!room) {
      return NextResponse.json(
        {
          success: false,
          errorCode:
            "LIVE_ROOM_NOT_FOUND",
          error:
            "LIVE 방송을 찾을 수 없습니다.",
        },
        {
          status: 404,
        },
      );
    }

    if (
      kind === "PORTAL"
    ) {
      const requestedPrice =
        body.portalPriceFlat == null
          ? PORTAL_DEFAULT_PRICE_FLAT
          : Number(
              body.portalPriceFlat,
            );

      const requestedDuration =
        body.portalDurationSeconds == null
          ? 180
          : Number(
              body.portalDurationSeconds,
            );

      if (
        !PORTAL_ALLOWED_PRICES.includes(
          requestedPrice as
            (typeof PORTAL_ALLOWED_PRICES)[number],
        )
      ) {
        return NextResponse.json(
          {
            success: false,
            errorCode:
              "PORTAL_INVALID_PRICE",
            error:
              "포털항아리 가격을 확인해주세요.",
          },
          {
            status: 400,
          },
        );
      }

      if (
        !PORTAL_ALLOWED_DURATIONS.includes(
          requestedDuration as
            (typeof PORTAL_ALLOWED_DURATIONS)[number],
        )
      ) {
        return NextResponse.json(
          {
            success: false,
            errorCode:
              "PORTAL_INVALID_DURATION",
            error:
              "포털항아리 노출 시간을 확인해주세요.",
          },
          {
            status: 400,
          },
        );
      }

      const rewardPoolFlat =
        Math.max(1, Math.floor(requestedPrice * TREASURE_REWARD_RATE));

      const otherRoomCount =
        listLiveRooms().filter((candidate) => candidate.roomId !== roomId).length;

      const exposureRule =
        requestedPrice === 20
          ? { rate: 0.1, minimum: 1, maximum: 10 }
          : requestedPrice === 100
            ? { rate: 0.25, minimum: 3, maximum: 30 }
            : { rate: 0.5, minimum: 5, maximum: 100 };

      const targetRoomCount =
        Math.min(
          otherRoomCount,
          exposureRule.maximum,
          Math.max(exposureRule.minimum, Math.ceil(otherRoomCount * exposureRule.rate)),
        );

      if (targetRoomCount <= 0) {
        return NextResponse.json(
          {
            success: false,
            errorCode: "PORTAL_TARGET_NOT_FOUND",
            error: "포털항아리을 노출할 다른 LIVE 방송이 없습니다.",
          },
          { status: 400 },
        );
      }

      const winnerCount =
        Math.min(
          rewardPoolFlat,
          TREASURE_MAX_WINNERS,
          Math.max(
            Math.min(TREASURE_MIN_WINNERS, rewardPoolFlat),
            Math.ceil(rewardPoolFlat / TREASURE_AUTO_TARGET_FLAT_PER_WINNER),
          ),
        );

      // FLATLIVE_PORTAL_SPREAD_REWARD_V10
      const event =
        createTreasureJarEvent({
          roomId,
          kind,
          creatorUserId:
            userId,
          rewardFlat: rewardPoolFlat,
          winnerCount,
          durationSeconds:
            requestedDuration,
          targetRoomCount,
        });

      const wallet =
        new WalletService();

      try {
        await wallet.createTransaction({
          userId,
          assetType:
            "FLAT",
          amount:
            requestedPrice,
          direction:
            "DEBIT",
          transactionId:
            `PORTAL-JAR-${randomUUID()}`,
          idempotencyKey:
            `portal-jar:${event.id}:purchase`,
          sourceType:
            "PORTAL_JAR_PURCHASE_CONFIG",
          sourceId:
            event.id,
        });
      } catch (error) {
        finishTreasureSettlement(
          event.id,
          [],
        );

        const message =
          error instanceof Error
            ? error.message
            : "포털항아리 구매에 실패했습니다.";

        return NextResponse.json(
          {
            success: false,
            errorCode:
              message.includes(
                "잔액이 부족",
              )
                ? "PORTAL_INSUFFICIENT_FLAT"
                : "PORTAL_PURCHASE_FAILED",
            error:
              message,
          },
          {
            status: 400,
          },
        );
      }

      return NextResponse.json({
        success: true,
        event,
        chargedFlat:
          requestedPrice,
        durationSeconds:
          requestedDuration,
        rewardPoolFlat,
        companyFlat: requestedPrice - rewardPoolFlat,
        winnerCount,
        targetRoomCount,
      });
    }

    const rewardFlat =
      Number(
        body.rewardFlat,
      );

    const requestedWinnerCount =
      body.winnerCount == null
        ? 0
        : Number(
            body.winnerCount,
          );

    if (
      !Number.isSafeInteger(
        rewardFlat,
      ) ||
      rewardFlat <= 0 ||
      rewardFlat >
        TREASURE_MAX_PURCHASE_FLAT ||
      !TREASURE_ALLOWED_PURCHASE_FLAT.includes(
        rewardFlat as
          (typeof TREASURE_ALLOWED_PURCHASE_FLAT)[number],
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          errorCode:
            "TREASURE_INVALID_REWARD",
          error:
            `보물항아리은 최대 ${TREASURE_MAX_PURCHASE_FLAT.toLocaleString()} FLAT까지 사용할 수 있습니다.`,
        },
        {
          status: 400,
        },
      );
    }

    if (
      !Number.isSafeInteger(
        requestedWinnerCount,
      ) ||
      requestedWinnerCount < 0 ||
      requestedWinnerCount >
        TREASURE_MAX_WINNERS ||
      (
        requestedWinnerCount > 0 &&
        requestedWinnerCount <
          TREASURE_MIN_WINNERS
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          errorCode:
            "TREASURE_INVALID_WINNER_COUNT",
          error:
            "당첨 인원은 자동 또는 10~500명으로 설정해주세요.",
        },
        {
          status: 400,
        },
      );
    }

    const wallet =
      new WalletService();

    // 구매금액의 80%만 랜덤 보상 풀로 사용하고,
    // 나머지 20%는 본사 수익으로 남긴다.
    const rewardPoolFlat =
      Math.max(
        1,
        Math.floor(
          rewardFlat *
            TREASURE_REWARD_RATE,
        ),
      );

    const companyFlat =
      rewardFlat -
      rewardPoolFlat;

    // FLATLIVE_TREASURE_AMOUNT_WINNERS_V8
    // FLATLIVE_TREASURE_PAYOUT_DISPLAY_V9: 20→16, 100→80, 500→400
    const allowedWinnerCounts =
      rewardFlat === 20
        ? [10]
        : rewardFlat === 100
          ? [10, 20, 40]
          : [40, 80, 100, 200];

    if (
      requestedWinnerCount > 0 &&
      !allowedWinnerCounts.includes(
        requestedWinnerCount,
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          errorCode:
            "TREASURE_WINNER_COUNT_NOT_ALLOWED_FOR_AMOUNT",
          error:
            `${rewardFlat.toLocaleString()} FLAT 보물항아리에서 선택할 수 없는 당첨 인원입니다.`,
        },
        {
          status: 400,
        },
      );
    }

    const maxPossibleWinnersByPool =
      Math.min(
        TREASURE_MAX_WINNERS,
        Math.floor(
          rewardPoolFlat /
            TREASURE_MIN_FLAT_PER_WINNER,
        ),
      );

    if (
      requestedWinnerCount > 0 &&
      requestedWinnerCount >
        maxPossibleWinnersByPool
    ) {
      return NextResponse.json(
        {
          success: false,
          errorCode:
            "TREASURE_WINNER_COUNT_EXCEEDS_POOL",
          error:
            `현재 보상 풀 ${rewardPoolFlat.toLocaleString()} FLAT으로는 최대 ${maxPossibleWinnersByPool.toLocaleString()}명까지 설정할 수 있습니다.`,
        },
        {
          status: 400,
        },
      );
    }

    // 선택하지 않으면 보상 풀 기준으로 자동 계산한다.
    // 한 라운드 당 최소 10명, 최대 80명으로 자동 설정한다.
    const autoWinnerCount =
      Math.min(
        maxPossibleWinnersByPool,
        Math.min(
          TREASURE_MAX_WINNERS,
          Math.max(
            Math.min(
              TREASURE_MIN_WINNERS,
              maxPossibleWinnersByPool,
            ),
            Math.ceil(
              rewardPoolFlat /
                TREASURE_AUTO_TARGET_FLAT_PER_WINNER,
            ),
          ),
        ),
      );

    const winnerCount =
      requestedWinnerCount > 0
        ? requestedWinnerCount
        : autoWinnerCount;

    const event =
      createTreasureJarEvent({
        roomId,
        kind:
          "TREASURE",
        creatorUserId:
          userId,
        rewardFlat:
          rewardPoolFlat,
        winnerCount,
        durationSeconds:
          180,
      });

    try {
      await wallet.createTransaction({
        userId,
        assetType:
          "FLAT",
        amount:
          rewardFlat,
        direction:
          "DEBIT",
        transactionId:
          `TREASURE-CREATE-${randomUUID()}`,
        idempotencyKey:
          `treasure:${event.id}:create`,
        sourceType:
          "TREASURE_JAR_PURCHASE_80_20",
        sourceId:
          event.id,
      });
    } catch (error) {
      finishTreasureSettlement(
        event.id,
        [],
      );

      const message =
        error instanceof Error
          ? error.message
          : "보물항아리 생성에 실패했습니다.";

      return NextResponse.json(
        {
          success: false,
          errorCode:
            message.includes(
              "잔액이 부족",
            )
              ? "TREASURE_INSUFFICIENT_FLAT"
              : "TREASURE_CREATE_FAILED",
          error:
            message,
        },
        {
          status: 400,
        },
      );
    }

    return NextResponse.json({
      success: true,
      event,
      chargedFlat:
        rewardFlat,
      rewardPoolFlat,
      companyFlat,
      rewardRate:
        TREASURE_REWARD_RATE,
      companyRate:
        TREASURE_COMPANY_RATE,
      winnerCount,
      winnerCountMode:
        requestedWinnerCount > 0
          ? "MANUAL"
          : "AUTO",
      minFlatPerWinner:
        TREASURE_MIN_FLAT_PER_WINNER,
      maxFlatPerWinner:
        TREASURE_MAX_FLAT_PER_WINNER,
      maxPossibleWinnersByPool,
    });
  } catch (error) {
    console.error(
      "TREASURE_JAR_POST_FAILED",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        errorCode:
          "TREASURE_JAR_FAILED",
        error:
          "보물항아리 처리 중 오류가 발생했습니다.",
      },
      {
        status: 500,
      },
    );
  }
}
