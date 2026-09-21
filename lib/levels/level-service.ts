import { readLiveAnalyticsByBroadcaster } from "@/lib/analytics/live-analytics-store";
import { SocialService } from "@/lib/social/social-service";
import { WalletService } from "@/lib/wallet/wallet-service";
import type { LedgerTransaction } from "@/lib/wallet/types";

import {
  getCreatorLevel,
  getViewerLevelByLiveDonationFlat,
  type CreatorLevelResult,
  type ViewerLevelPolicy,
} from "./level-policy";

const walletService = new WalletService();
const socialService = new SocialService();

const MAX_OPEN_LIVE_DURATION_MS = 12 * 60 * 60 * 1000;

function isPostedDonationDebit(entry: LedgerTransaction) {
  return (
    entry.status === "POSTED" &&
    entry.assetType === "FLAT" &&
    entry.direction === "DEBIT" &&
    entry.sourceType === "DONATION"
  );
}

function isPostedDonationCredit(entry: LedgerTransaction) {
  return (
    entry.status === "POSTED" &&
    entry.assetType === "FLAT" &&
    entry.direction === "CREDIT" &&
    entry.sourceType === "DONATION"
  );
}

function sumAmount(entries: LedgerTransaction[]) {
  return entries.reduce((sum, entry) => sum + entry.amount, 0);
}

function getMonthRange(now = new Date()) {
  const start = new Date(
    now.getFullYear(),
    now.getMonth(),
    1,
    0,
    0,
    0,
    0,
  );

  const end = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    1,
    0,
    0,
    0,
    0,
  );

  return {
    startMs: start.getTime(),
    endMs: end.getTime(),
  };
}

function overlapDurationMs(
  startedAt: number,
  endedAt: number,
  startMs: number,
  endMs: number,
) {
  const from = Math.max(startedAt, startMs);
  const to = Math.min(endedAt, endMs);

  return Math.max(0, to - from);
}

function calculateMonthlyLiveDurationMs(
  records: Array<{
    startedAt: number;
    endedAt: number | null;
  }>,
  now = Date.now(),
) {
  const { startMs, endMs } = getMonthRange(new Date(now));

  const closedDurationMs = records.reduce((sum, record) => {
    if (record.endedAt === null) {
      return sum;
    }

    return (
      sum +
      overlapDurationMs(
        record.startedAt,
        record.endedAt,
        startMs,
        endMs,
      )
    );
  }, 0);

  const latestOpenRecord = records
    .filter((record) => record.endedAt === null)
    .sort((a, b) => b.startedAt - a.startedAt)[0];

  if (!latestOpenRecord) {
    return closedDurationMs;
  }

  const openAgeMs = now - latestOpenRecord.startedAt;

  if (openAgeMs < 0 || openAgeMs > MAX_OPEN_LIVE_DURATION_MS) {
    return closedDurationMs;
  }

  const cappedOpenEndedAt = Math.min(
    now,
    latestOpenRecord.startedAt + MAX_OPEN_LIVE_DURATION_MS,
  );

  return (
    closedDurationMs +
    overlapDurationMs(
      latestOpenRecord.startedAt,
      cappedOpenEndedAt,
      startMs,
      endMs,
    )
  );
}

export type ViewerLevelSummary = {
  userId: string;
  cumulativeLiveDonationFlat: number;
  level: ViewerLevelPolicy;
};

export type CreatorLevelSummary = {
  userId: string;
  isLiveCreator: boolean;
  monthlyLiveDurationMs: number;
  monthlyLiveHours: number;
  followerCount: number;
  cumulativeLiveDonationReceivedFlat: number;
  level: CreatorLevelResult["level"];
  eligibleLevelByAllConditions: CreatorLevelResult["eligibleLevelByAllConditions"];
  visibleLevelByMonthlyHours: CreatorLevelResult["visibleLevelByMonthlyHours"];
};

export async function getViewerLevelSummary(
  userId: string,
): Promise<ViewerLevelSummary> {
  const transactions =
    await walletService.listAllUserFlatTransactions(userId);

  const cumulativeLiveDonationFlat = sumAmount(
    transactions.filter(isPostedDonationDebit),
  );

  return {
    userId,
    cumulativeLiveDonationFlat,
    level: getViewerLevelByLiveDonationFlat(cumulativeLiveDonationFlat),
  };
}

export async function getCreatorLevelSummary(
  userId: string,
): Promise<CreatorLevelSummary> {
  const [receivedDonationSummary, socialStats, liveRecords] =
    await Promise.all([
      walletService.getReceivedDonationSummary(userId),
      socialService.getStats(userId),
      readLiveAnalyticsByBroadcaster(userId),
    ]);

  const monthlyLiveDurationMs =
    calculateMonthlyLiveDurationMs(liveRecords);

  const creatorLevel = getCreatorLevel({
    monthlyLiveDurationMs,
    followerCount: socialStats.followers,
    cumulativeLiveDonationReceivedFlat:
      receivedDonationSummary.liveReceived,
    hasLiveBroadcastHistory: liveRecords.length > 0,
  });

  return {
    userId,
    isLiveCreator: creatorLevel.isLiveCreator,
    monthlyLiveDurationMs,
    monthlyLiveHours:
      monthlyLiveDurationMs / 1000 / 60 / 60,
    followerCount: socialStats.followers,
    cumulativeLiveDonationReceivedFlat:
      receivedDonationSummary.liveReceived,
    level: creatorLevel.level,
    eligibleLevelByAllConditions:
      creatorLevel.eligibleLevelByAllConditions,
    visibleLevelByMonthlyHours:
      creatorLevel.visibleLevelByMonthlyHours,
  };
}
