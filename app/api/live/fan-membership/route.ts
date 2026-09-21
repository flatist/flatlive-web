import { randomUUID } from "crypto";
import { NextResponse } from "next/server";

import { requireAuthenticatedUser } from "@/lib/auth/authorization";
import {
  FanCardSettingsService,
  FanMembershipService,
} from "@/lib/fan-card";
import { WalletService } from "@/lib/wallet/wallet-service";

export const dynamic = "force-dynamic";

const settingsService = new FanCardSettingsService();
const membershipService = new FanMembershipService();
const walletService = new WalletService();

type Tier = "FAN" | "VIP";

function isTier(value: unknown): value is Tier {
  return value === "FAN" || value === "VIP";
}

function safePrice(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.floor(value));
}

export async function GET(request: Request) {
  try {
    const user = await requireAuthenticatedUser();

    const url = new URL(request.url);
    const broadcasterUserId =
      url.searchParams.get("broadcasterUserId")?.trim() ?? "";

    if (!broadcasterUserId) {
      return NextResponse.json(
        {
          success: false,
          error: "BROADCASTER_REQUIRED",
          message: "방송자 정보가 필요합니다.",
        },
        { status: 400 },
      );
    }

    const [settings, membership, balance] = await Promise.all([
      settingsService.getSettings(broadcasterUserId),
      membershipService.getActiveMembership(
        broadcasterUserId,
        user.userId,
      ),
      walletService.getBalance(user.userId, "FLAT"),
    ]);

    return NextResponse.json({
      success: true,
      settings,
      membership,
      balance: balance.balance,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "팬가입 정보를 불러오지 못했습니다.";

    return NextResponse.json(
      {
        success: false,
        error: message.includes("UNAUTHORIZED")
          ? "UNAUTHORIZED"
          : "FAN_MEMBERSHIP_GET_FAILED",
        message,
      },
      {
        status: message.includes("UNAUTHORIZED") ? 401 : 500,
      },
    );
  }
}

export async function POST(request: Request) {
  let viewerUserId = "";
  let purchaseId = "";
  let debitTransactionId = "";
  let creatorCredit:
    | Awaited<
        ReturnType<
          WalletService["creditCreatorDonationRevenue"]
        >
      >
    | undefined;

  try {
    const user = await requireAuthenticatedUser();
    viewerUserId = user.userId;

    const body = await request.json();

    const broadcasterUserId =
      typeof body.broadcasterUserId === "string"
        ? body.broadcasterUserId.trim()
        : "";

    const tier = body.tier;

    if (!broadcasterUserId || !isTier(tier)) {
      return NextResponse.json(
        {
          success: false,
          error: "FAN_MEMBERSHIP_INPUT_INVALID",
          message: "팬가입 정보가 올바르지 않습니다.",
        },
        { status: 400 },
      );
    }

    if (broadcasterUserId === viewerUserId) {
      return NextResponse.json(
        {
          success: false,
          error: "FAN_MEMBERSHIP_SELF_NOT_ALLOWED",
          message: "본인 방송에는 팬가입할 수 없습니다.",
        },
        { status: 400 },
      );
    }

    const settings =
      await settingsService.getSettings(broadcasterUserId);

    const enabled =
      tier === "VIP"
        ? settings.vipEnabled
        : settings.fanEnabled;

    if (!enabled) {
      return NextResponse.json(
        {
          success: false,
          error: "FAN_MEMBERSHIP_DISABLED",
          message:
            tier === "VIP"
              ? "현재 VIP 팬가입을 받고 있지 않습니다."
              : "현재 팬가입을 받고 있지 않습니다.",
        },
        { status: 400 },
      );
    }

    const priceFlat = safePrice(
      tier === "VIP"
        ? settings.vipPriceFlat
        : settings.fanPriceFlat,
    );

    const durationType =
      tier === "VIP"
        ? settings.vipDurationType
        : settings.fanDurationType;

    const existing =
      await membershipService.getActiveMembership(
        broadcasterUserId,
        viewerUserId,
      );

    if (existing?.tier === tier) {
      const balance =
        await walletService.getBalance(
          viewerUserId,
          "FLAT",
        );

      return NextResponse.json({
        success: true,
        alreadyActive: true,
        membership: existing,
        balance: balance.balance,
        message:
          tier === "VIP"
            ? "이미 VIP 팬입니다."
            : "이미 팬으로 가입되어 있습니다.",
      });
    }

    if (
      existing?.tier === "VIP" &&
      tier === "FAN"
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "VIP_DOWNGRADE_NOT_ALLOWED",
          message:
            "현재 VIP 팬입니다. 일반 팬으로 중복 가입할 수 없습니다.",
        },
        { status: 400 },
      );
    }

    const balance =
      await walletService.getBalance(
        viewerUserId,
        "FLAT",
      );

    if (balance.balance < priceFlat) {
      return NextResponse.json(
        {
          success: false,
          error: "FAN_MEMBERSHIP_INSUFFICIENT_BALANCE",
          message: "FLAT 잔액이 부족합니다.",
          required: priceFlat,
          balance: balance.balance,
        },
        { status: 400 },
      );
    }

    purchaseId =
      `fan_membership_${Date.now()}_${randomUUID()}`;

    if (priceFlat > 0) {
      debitTransactionId =
        `${purchaseId}_viewer_debit`;

      await walletService.createTransaction({
        userId: viewerUserId,
        assetType: "FLAT",
        amount: priceFlat,
        direction: "DEBIT",
        transactionId: debitTransactionId,
        idempotencyKey: debitTransactionId,
        sourceType: "FAN_MEMBERSHIP_PURCHASE",
        sourceId: purchaseId,
      });

      const creatorTransactionId =
        `${purchaseId}_creator_credit`;

      creatorCredit =
        await walletService.creditCreatorDonationRevenue({
          userId: broadcasterUserId,
          amount: priceFlat,
          transactionId: creatorTransactionId,
          idempotencyKey: creatorTransactionId,
          donationId: purchaseId,
        });
    }

    const membership =
      await membershipService.purchaseMembership({
        broadcasterUserId,
        viewerUserId,
        tier,
        priceFlat,
        durationType,
      });

    const afterBalance =
      await walletService.getBalance(
        viewerUserId,
        "FLAT",
      );

    return NextResponse.json({
      success: true,
      membership,
      balance: afterBalance.balance,
      message:
        tier === "VIP"
          ? "VIP 팬가입이 완료됐습니다."
          : "팬가입이 완료됐습니다.",
    });
  } catch (error) {
    /*
     * membership 저장 전에 오류가 발생한 경우:
     * - 방송자 수익 적립이 됐다면 기존 원장 reversal
     * - 시청자 FLAT이 차감됐다면 CREDIT 보상
     */
    if (creatorCredit && purchaseId) {
      try {
        const reversalTransactionId =
          `${purchaseId}_creator_reversal`;

        const creatorBalance =
          await walletService.getCreatorRevenueBalance(
            creatorCredit.ownerId,
          );

        await walletService.reverseLedgerEntry(
          creatorCredit.transactionId,
          {
            transactionId: reversalTransactionId,
            walletId: creatorCredit.walletId,
            legalEntity: creatorCredit.legalEntity,
            ownerType: creatorCredit.ownerType,
            ownerId: creatorCredit.ownerId,
            assetType: creatorCredit.assetType,
            amount: creatorCredit.amount,
            direction: "DEBIT",
            sourceType: "FAN_MEMBERSHIP_REVENUE_REVERSAL",
            sourceId: purchaseId,
            status: "POSTED",
            idempotencyKey: reversalTransactionId,
            balanceBefore: creatorBalance.balance,
            balanceAfter:
              creatorBalance.balance -
              creatorCredit.amount,
            createdAt: new Date().toISOString(),
          },
        );
      } catch (reversalError) {
        console.error(
          "FAN MEMBERSHIP CREATOR REVERSAL FAILED:",
          reversalError,
        );
      }
    }

    if (
      viewerUserId &&
      debitTransactionId &&
      purchaseId
    ) {
      try {
        const original =
          await walletService.findTransactionByIdempotencyKey(
            viewerUserId,
            "FLAT",
            debitTransactionId,
          );

        if (original) {
          const refundTransactionId =
            `${purchaseId}_viewer_refund`;

          await walletService.createTransaction({
            userId: viewerUserId,
            assetType: "FLAT",
            amount: original.amount,
            direction: "CREDIT",
            transactionId: refundTransactionId,
            idempotencyKey: refundTransactionId,
            sourceType: "FAN_MEMBERSHIP_REFUND",
            sourceId: purchaseId,
          });
        }
      } catch (refundError) {
        console.error(
          "FAN MEMBERSHIP REFUND FAILED:",
          refundError,
        );
      }
    }

    const message =
      error instanceof Error
        ? error.message
        : "팬가입 처리에 실패했습니다.";

    return NextResponse.json(
      {
        success: false,
        error: message.includes("UNAUTHORIZED")
          ? "UNAUTHORIZED"
          : "FAN_MEMBERSHIP_PURCHASE_FAILED",
        message,
      },
      {
        status: message.includes("UNAUTHORIZED")
          ? 401
          : 500,
      },
    );
  }
}
