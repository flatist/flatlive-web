import { randomUUID } from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  parseSessionToken,
  SESSION_COOKIE_NAME,
} from "@/lib/auth/session";

import {
  incrementFlitGreat,
  readFlits,
} from "@/lib/flit/flit-store";

import {
  incrementVodGreat,
  readVods,
} from "@/lib/vod/vod-store";

import { WalletService } from "@/lib/wallet/wallet-service";
import { awardFitActivity } from "@/lib/fit";

type ContentType =
  | "FLIT"
  | "VOD";

const GREAT_COST = 10;
const GREAT_CREATOR_SHARE = 5;
const GREAT_PLATFORM_SHARE = 5;

export async function POST(
  request: Request,
) {
  const traceId =
    `GREAT-${Date.now()}-${randomUUID().slice(0, 8)}`;

  const walletService =
    new WalletService();

  let debit:
    | Awaited<
        ReturnType<
          WalletService["createTransaction"]
        >
      >
    | null = null;

  let reactionId = "";

  let creatorCredit:
    | Awaited<
        ReturnType<
          WalletService["creditCreatorContentRevenue"]
        >
      >
    | null = null;


  let platformCredit:
    | Awaited<
        ReturnType<
          WalletService["creditPlatformContentRevenue"]
        >
      >
    | null = null;

  try {
    const token =
      (await cookies()).get(
        SESSION_COOKIE_NAME,
      )?.value;

    const userId = token
      ? parseSessionToken(
          token,
        )?.userId ?? null
      : null;

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          errorCode:
            "GREAT_AUTH_REQUIRED",
          error:
            "로그인이 필요합니다.",
          traceId,
        },
        {
          status: 401,
        },
      );
    }

    let body: unknown;

    try {
      body =
        await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          errorCode:
            "GREAT_INVALID_JSON",
          error:
            "요청 형식이 올바르지 않습니다.",
          traceId,
        },
        {
          status: 400,
        },
      );
    }

    if (
      !body ||
      typeof body !== "object"
    ) {
      return NextResponse.json(
        {
          success: false,
          errorCode:
            "GREAT_INVALID_REQUEST",
          error:
            "요청 정보가 올바르지 않습니다.",
          traceId,
        },
        {
          status: 400,
        },
      );
    }

    const raw =
      body as Record<
        string,
        unknown
      >;

    const contentType =
      raw.contentType === "FLIT" ||
      raw.contentType === "VOD"
        ? (raw.contentType as ContentType)
        : null;

    const contentId =
      typeof raw.contentId ===
      "string"
        ? raw.contentId.trim()
        : "";

    if (
      !contentType ||
      !contentId
    ) {
      return NextResponse.json(
        {
          success: false,
          errorCode:
            "GREAT_INVALID_REQUEST",
          error:
            "콘텐츠 정보가 올바르지 않습니다.",
          traceId,
        },
        {
          status: 400,
        },
      );
    }

    const content =
      contentType === "FLIT"
        ? (
            await readFlits()
          ).find(
            (item) =>
              item.id ===
              contentId,
          )
        : (
            await readVods()
          ).find(
            (item) =>
              item.id ===
              contentId,
          );

    if (!content) {
      return NextResponse.json(
        {
          success: false,
          errorCode:
            "GREAT_CONTENT_NOT_FOUND",
          error:
            "콘텐츠를 찾을 수 없습니다.",
          traceId,
        },
        {
          status: 404,
        },
      );
    }

    const balance =
      await walletService.getBalance(
        userId,
        "FLAT",
      );

    if (
      balance.balance <
      GREAT_COST
    ) {
      return NextResponse.json(
        {
          success: false,
          errorCode:
            "GREAT_INSUFFICIENT_BALANCE",
          error:
            "FLAT 잔액이 부족합니다.",
          required:
            GREAT_COST,
          balance:
            balance.balance,
          traceId,
        },
        {
          status: 400,
        },
      );
    }

    reactionId =
      `great_${Date.now()}_${randomUUID()}`;

    const transactionId =
      `${reactionId}_debit`;

    debit =
      await walletService.createTransaction(
        {
          userId,
          assetType:
            "FLAT",
          amount:
            GREAT_COST,
          direction:
            "DEBIT",
          transactionId,
          idempotencyKey:
            transactionId,
          sourceType:
            "CONTENT_GREAT",
          sourceId:
            reactionId,
        },
      );

    const creatorTransactionId =
      `${reactionId}_creator_credit`;

    creatorCredit =
      await walletService.creditCreatorContentRevenue({
        userId: content.userId,
        amount:
          GREAT_CREATOR_SHARE,
        transactionId:
          creatorTransactionId,
        idempotencyKey:
          creatorTransactionId,
        sourceType:
          "CONTENT_GREAT_REVENUE",
        sourceId:
          reactionId,
      });

    const platformTransactionId =
      `${reactionId}_platform_credit`;

    platformCredit =
      await walletService.creditPlatformContentRevenue({
        amount:
          GREAT_PLATFORM_SHARE,
        transactionId:
          platformTransactionId,
        idempotencyKey:
          platformTransactionId,
        sourceType:
          "CONTENT_GREAT_PLATFORM_REVENUE",
        sourceId:
          reactionId,
      });

    const finalBalance =
      await walletService.getBalance(
        userId,
        "FLAT",
      );

    const updated =
      contentType === "FLIT"
        ? await incrementFlitGreat(
            contentId,
          )
        : await incrementVodGreat(
            contentId,
          );

    if (!updated) {
      throw new Error(
        "GREAT_CONTENT_UPDATE_FAILED",
      );
    }

    // FLATLIVE_FIT_WATCH_SECONDS_REACTION_V1: PAID_REACTION_FIT
    let fitAwarded = 0;

    try {
      const fitResult =
        await awardFitActivity({
          userId,
          activityCode:
            contentType === "FLIT"
              ? "FLIT_GREAT"
              : "VOD_GREAT",
          eventKey:
            reactionId,
        });

      fitAwarded =
        fitResult.awarded
          ? fitResult.amount
          : 0;
    } catch (fitError) {
      console.error(
        "[FIT_PAID_REACTION_AWARD_FAILED]",
        {
          contentType,
          contentId,
          reaction:
            "GREAT",
          fitError,
        },
      );
    }

    const response =
      NextResponse.json({
        success: true,
        contentType,
        contentId,
        greats:
          updated.greats,
        charged:
          GREAT_COST,
        balance:
          finalBalance.balance,
        transactionId:
          debit.transactionId,
        traceId,
      });

    if (fitAwarded > 0) {
      response.headers.set(
        "X-FIT-Awarded",
        String(fitAwarded),
      );
    }

    return response;
  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : "UNKNOWN_ERROR";

    if (
      platformCredit &&
      reactionId
    ) {
      try {
        const platformBalance =
          await walletService.getPlatformContentRevenueBalance();

        const platformReversalTransactionId =
          `${reactionId}_platform_reversal`;

        await walletService.reverseLedgerEntry(
          platformCredit.transactionId,
          {
            transactionId:
              platformReversalTransactionId,
            walletId:
              platformCredit.walletId,
            legalEntity:
              platformCredit.legalEntity,
            ownerType:
              platformCredit.ownerType,
            ownerId:
              platformCredit.ownerId,
            assetType:
              platformCredit.assetType,
            amount:
              platformCredit.amount,
            direction:
              "DEBIT",
            balanceBefore:
              platformBalance.balance,
            balanceAfter:
              platformBalance.balance -
              platformCredit.amount,
            sourceType:
              "CONTENT_GREAT_PLATFORM_REVENUE_REVERSAL",
            sourceId:
              reactionId,
            status:
              "POSTED",
            reversedTransactionId:
              platformCredit.transactionId,
            idempotencyKey:
              platformReversalTransactionId,
            createdAt:
              new Date().toISOString(),
          },
        );

        console.error(
          "[GREAT_PLATFORM_REVENUE_REVERSED]",
          {
            traceId,
            reactionId,
          },
        );
      } catch (platformRollbackError) {
        console.error(
          "[GREAT_PLATFORM_REVENUE_REVERSAL_FAILED]",
          {
            traceId,
            reactionId,
            error:
              platformRollbackError instanceof Error
                ? platformRollbackError.message
                : "UNKNOWN_ERROR",
          },
        );
      }
    }

    if (
      creatorCredit &&
      reactionId
    ) {
      try {
        const creatorBalance =
          await walletService.getCreatorRevenueBalance(
            creatorCredit.ownerId,
          );

        const creatorReversalTransactionId =
          `${reactionId}_creator_reversal`;

        await walletService.reverseLedgerEntry(
          creatorCredit.transactionId,
          {
            transactionId:
              creatorReversalTransactionId,
            walletId:
              creatorCredit.walletId,
            legalEntity:
              creatorCredit.legalEntity,
            ownerType:
              creatorCredit.ownerType,
            ownerId:
              creatorCredit.ownerId,
            assetType:
              creatorCredit.assetType,
            amount:
              creatorCredit.amount,
            direction:
              "DEBIT",
            balanceBefore:
              creatorBalance.balance,
            balanceAfter:
              creatorBalance.balance -
              creatorCredit.amount,
            sourceType:
              "CONTENT_GREAT_REVENUE_REVERSAL",
            sourceId:
              reactionId,
            status:
              "POSTED",
            reversedTransactionId:
              creatorCredit.transactionId,
            idempotencyKey:
              creatorReversalTransactionId,
            createdAt:
              new Date().toISOString(),
          },
        );

        console.error(
          "[GREAT_CREATOR_REVENUE_REVERSED]",
          {
            traceId,
            reactionId,
            creatorUserId:
              creatorCredit.ownerId,
          },
        );
      } catch (creatorRollbackError) {
        console.error(
          "[GREAT_CREATOR_REVENUE_REVERSAL_FAILED]",
          {
            traceId,
            reactionId,
            error:
              creatorRollbackError instanceof Error
                ? creatorRollbackError.message
                : "UNKNOWN_ERROR",
          },
        );
      }
    }

    if (
      debit &&
      reactionId
    ) {
      try {
        const currentBalance =
          await walletService.getBalance(
            debit.ownerId,
            "FLAT",
          );

        const compensationTransactionId =
          `${reactionId}_compensation`;

        await walletService.reverseLedgerEntry(
          debit.transactionId,
          {
            transactionId:
              compensationTransactionId,
            walletId:
              debit.walletId,
            legalEntity:
              debit.legalEntity,
            ownerType:
              debit.ownerType,
            ownerId:
              debit.ownerId,
            assetType:
              debit.assetType,
            amount:
              debit.amount,
            direction:
              "CREDIT",
            balanceBefore:
              currentBalance.balance,
            balanceAfter:
              currentBalance.balance +
              debit.amount,
            sourceType:
              "CONTENT_GREAT_COMPENSATION",
            sourceId:
              reactionId,
            status:
              "POSTED",
            reversedTransactionId:
              debit.transactionId,
            idempotencyKey:
              compensationTransactionId,
            createdAt:
              new Date().toISOString(),
          },
        );

        console.error(
          "[GREAT_REACTION_COMPENSATED]",
          {
            traceId,
            reactionId,
            errorMessage,
          },
        );

        return NextResponse.json(
          {
            success: false,
            errorCode:
              "GREAT_FAILED_COMPENSATED",
            error:
              "멋져요 처리에 실패하여 10 FLAT을 복구했습니다.",
            traceId,
          },
          {
            status: 500,
          },
        );
      } catch (
        compensationError
      ) {
        console.error(
          "[GREAT_REACTION_COMPENSATION_FAILED]",
          {
            traceId,
            reactionId,
            originalError:
              errorMessage,
            compensationError,
          },
        );

        return NextResponse.json(
          {
            success: false,
            errorCode:
              "GREAT_COMPENSATION_FAILED",
            error:
              "멋져요 처리와 FLAT 복구가 모두 실패했습니다.",
            traceId,
          },
          {
            status: 500,
          },
        );
      }
    }

    console.error(
      "[GREAT_REACTION_FAILED]",
      {
        traceId,
        error,
      },
    );

    return NextResponse.json(
      {
        success: false,
        errorCode:
          "GREAT_FAILED",
        error:
          errorMessage ===
          "잔액이 부족합니다."
            ? "FLAT 잔액이 부족합니다."
            : "멋져요 처리에 실패했습니다.",
        traceId,
      },
      {
        status: 500,
      },
    );
  }
}
