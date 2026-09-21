import crypto from "crypto";

import { WalletService } from "@/lib/wallet/wallet-service";

import { getFitActivityConfig } from "./fit-config-store";
import type {
  FitActivityCode,
  FitSummary,
} from "./types";

function startOfTodayIso() {
  const now = new Date();
  const start = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    0,
    0,
    0,
    0,
  );
  return start.toISOString();
}

function activitySourceType(
  activityCode: FitActivityCode,
) {
  return `FIT_ACTIVITY:${activityCode}`;
}

export class FitService {
  private walletService =
    new WalletService();

  async getSummary(
    userId: string,
  ): Promise<FitSummary> {
    const [
      balance,
      transactions,
    ] = await Promise.all([
      this.walletService.getBalance(
        userId,
        "FIT",
      ),
      this.walletService.listAllUserFitTransactions(
        userId,
      ),
    ]);

    const posted =
      transactions.filter(
        (entry) =>
          entry.status === "POSTED",
      );

    const totalEarnedFit =
      posted
        .filter(
          (entry) =>
            entry.direction === "CREDIT",
        )
        .reduce(
          (sum, entry) =>
            sum + entry.amount,
          0,
        );

    return {
      userId,
      balanceFit:
        balance.balance,
      totalEarnedFit,
      recentTransactions:
        posted
          .slice(0, 50)
          .map((entry) => ({
            transactionId:
              entry.transactionId,
            amount:
              entry.amount,
            direction:
              entry.direction,
            balanceAfter:
              entry.balanceAfter,
            sourceType:
              entry.sourceType,
            sourceId:
              entry.sourceId,
            createdAt:
              entry.createdAt,
          })),
    };
  }

  async awardActivity(input: {
    userId: string;
    activityCode: FitActivityCode;
    eventKey: string;
  }) {
    const eventKey =
      input.eventKey.trim();

    if (!eventKey) {
      throw new Error(
        "FIT eventKey가 필요합니다.",
      );
    }

    const config =
      await getFitActivityConfig();

    const rule =
      config.rules.find(
        (item) =>
          item.code ===
          input.activityCode,
      );

    if (!rule) {
      return {
        awarded: false,
        reason: "UNKNOWN_ACTIVITY",
        amount: 0,
      } as const;
    }

    if (
      !rule.enabled ||
      rule.rewardFit <= 0
    ) {
      return {
        awarded: false,
        reason: "DISABLED",
        amount: 0,
      } as const;
    }

    const all =
      await this.walletService.listAllUserFitTransactions(
        input.userId,
      );

    const sourceType =
      activitySourceType(
        input.activityCode,
      );

    const todayStart =
      startOfTodayIso();

    const todayCredits =
      all.filter(
        (entry) =>
          entry.status === "POSTED" &&
          entry.direction === "CREDIT" &&
          entry.sourceType ===
            sourceType &&
          entry.createdAt >=
            todayStart,
      );

    if (
      rule.dailyCountLimit !== null &&
      todayCredits.length >=
        rule.dailyCountLimit
    ) {
      return {
        awarded: false,
        reason: "DAILY_COUNT_LIMIT",
        amount: 0,
      } as const;
    }

    const todayAmount =
      todayCredits.reduce(
        (sum, entry) =>
          sum + entry.amount,
        0,
      );

    let awardAmount =
      rule.rewardFit;

    if (
      rule.dailyFitLimit !== null
    ) {
      const remaining =
        rule.dailyFitLimit -
        todayAmount;

      if (remaining <= 0) {
        return {
          awarded: false,
          reason: "DAILY_FIT_LIMIT",
          amount: 0,
        } as const;
      }

      awardAmount =
        Math.min(
          awardAmount,
          remaining,
        );
    }

    const idempotencyKey =
      [
        "fit",
        input.userId,
        input.activityCode,
        eventKey,
      ].join(":");

    const existing =
      await this.walletService.findTransactionByIdempotencyKey(
        input.userId,
        "FIT",
        idempotencyKey,
      );

    if (existing) {
      return {
        awarded: false,
        reason: "DUPLICATE",
        amount: 0,
        transaction: existing,
      } as const;
    }

    const transactionId =
      `fit_${crypto.randomUUID()}`;

    const transaction =
      await this.walletService.createTransaction({
        userId:
          input.userId,
        assetType:
          "FIT",
        amount:
          awardAmount,
        direction:
          "CREDIT",
        transactionId,
        idempotencyKey,
        sourceType,
        sourceId:
          eventKey,
      });

    return {
      awarded: true,
      reason: "AWARDED",
      amount: awardAmount,
      transaction,
    } as const;
  }

  async awardWatchInterval(input: {
    userId: string;
    activityCode:
      | "FLIT_WATCH"
      | "VOD_WATCH";
    contentId: string;
    intervalIndex: number;
    watchedSeconds: number;
  }) {
    const config =
      await getFitActivityConfig();

    const rule =
      config.rules.find(
        (item) =>
          item.code ===
          input.activityCode,
      );

    const watchSeconds =
      rule?.watchSeconds ?? 30;

    if (
      !rule ||
      !rule.enabled ||
      watchSeconds <= 0
    ) {
      return {
        awarded: false,
        reason: "DISABLED",
        amount: 0,
        watchSeconds,
      } as const;
    }

    if (
      !Number.isSafeInteger(
        input.intervalIndex,
      ) ||
      input.intervalIndex < 1
    ) {
      return {
        awarded: false,
        reason: "INVALID_INTERVAL",
        amount: 0,
        watchSeconds,
      } as const;
    }

    if (
      !Number.isFinite(
        input.watchedSeconds,
      ) ||
      input.watchedSeconds <
        input.intervalIndex *
          watchSeconds
    ) {
      return {
        awarded: false,
        reason: "WATCH_SECONDS_NOT_MET",
        amount: 0,
        watchSeconds,
      } as const;
    }

    const result =
      await this.awardActivity({
        userId:
          input.userId,
        activityCode:
          input.activityCode,
        eventKey:
          [
            input.contentId,
            "watch",
            input.intervalIndex,
          ].join(":"),
      });

    return {
      ...result,
      watchSeconds,
    };
  }

  async awardPurchase(input: {
    userId: string;
    orderId: string;
    paidAmountWon: number;
  }) {
    const orderId =
      input.orderId.trim();

    if (!orderId) {
      throw new Error(
        "플핑 주문 ID가 필요합니다.",
      );
    }

    if (
      !Number.isSafeInteger(
        input.paidAmountWon,
      ) ||
      input.paidAmountWon <= 0
    ) {
      throw new Error(
        "플핑 정상 결제금액이 필요합니다.",
      );
    }

    const config =
      await getFitActivityConfig();

    const rule =
      config.rules.find(
        (item) =>
          item.code ===
          "PLSHOP_PURCHASE",
      );

    if (
      !rule ||
      !rule.enabled ||
      config.purchaseRewardPercent <= 0
    ) {
      return {
        awarded: false,
        reason: "DISABLED",
        amount: 0,
      } as const;
    }

    const sourceType =
      activitySourceType(
        "PLSHOP_PURCHASE",
      );

    const all =
      await this.walletService.listAllUserFitTransactions(
        input.userId,
      );

    const todayStart =
      startOfTodayIso();

    const todayCredits =
      all.filter(
        (entry) =>
          entry.status === "POSTED" &&
          entry.direction === "CREDIT" &&
          entry.sourceType ===
            sourceType &&
          entry.createdAt >=
            todayStart,
      );

    if (
      rule.dailyCountLimit !== null &&
      todayCredits.length >=
        rule.dailyCountLimit
    ) {
      return {
        awarded: false,
        reason: "DAILY_COUNT_LIMIT",
        amount: 0,
      } as const;
    }

    const idempotencyKey =
      [
        "fit",
        input.userId,
        "PLSHOP_PURCHASE",
        orderId,
      ].join(":");

    const existing =
      await this.walletService.findTransactionByIdempotencyKey(
        input.userId,
        "FIT",
        idempotencyKey,
      );

    if (existing) {
      return {
        awarded: false,
        reason: "DUPLICATE",
        amount: 0,
        transaction: existing,
      } as const;
    }

    let awardAmount =
      Math.floor(
        input.paidAmountWon *
          config.purchaseRewardPercent /
          100,
      );

    if (awardAmount <= 0) {
      return {
        awarded: false,
        reason: "BELOW_ONE_FIT",
        amount: 0,
      } as const;
    }

    if (
      rule.dailyFitLimit !== null
    ) {
      const todayAmount =
        todayCredits.reduce(
          (sum, entry) =>
            sum + entry.amount,
          0,
        );

      const remaining =
        rule.dailyFitLimit -
        todayAmount;

      if (remaining <= 0) {
        return {
          awarded: false,
          reason: "DAILY_FIT_LIMIT",
          amount: 0,
        } as const;
      }

      awardAmount =
        Math.min(
          awardAmount,
          remaining,
        );
    }

    const transaction =
      await this.walletService.createTransaction({
        userId:
          input.userId,
        assetType:
          "FIT",
        amount:
          awardAmount,
        direction:
          "CREDIT",
        transactionId:
          `fit_${crypto.randomUUID()}`,
        idempotencyKey,
        sourceType,
        sourceId:
          orderId,
      });

    return {
      awarded: true,
      reason: "AWARDED",
      amount: awardAmount,
      transaction,
      purchaseRewardPercent:
        config.purchaseRewardPercent,
      paidAmountWon:
        input.paidAmountWon,
    } as const;
  }
}

export async function awardFitActivity(
  input: {
    userId: string;
    activityCode: FitActivityCode;
    eventKey: string;
  },
) {
  return new FitService().awardActivity(
    input,
  );
}


export async function awardFitPurchase(
  input: {
    userId: string;
    orderId: string;
    paidAmountWon: number;
  },
) {
  return new FitService().awardPurchase(
    input,
  );
}


export async function awardFitWatchInterval(
  input: {
    userId: string;
    activityCode:
      | "FLIT_WATCH"
      | "VOD_WATCH";
    contentId: string;
    intervalIndex: number;
    watchedSeconds: number;
  },
) {
  return new FitService().awardWatchInterval(
    input,
  );
}
