export type FitActivityCode =
  | "DAILY_LOGIN"
  | "PROFILE_COMPLETE"
  | "LIVE_WATCH"
  | "LIVE_CHAT"
  | "LIVE_LIKE"
  | "LIVE_SHARE"
  | "LIVE_FOLLOW"
  | "LIVE_DONATION"
  | "CLUTCH_PARTICIPATE"
  | "CLUTCH_WATCH"
  | "FLIT_WATCH"
  | "FLIT_LIKE"
  | "FLIT_COMMENT"
  | "FLIT_SHARE"
  | "FLIT_GREAT"
  | "FLIT_BEST"
  | "VOD_WATCH"
  | "VOD_LIKE"
  | "VOD_COMMENT"
  | "VOD_GREAT"
  | "VOD_BEST"
  | "FOLLOW_USER"
  | "LOUNGE_VISIT"
  | "LOUNGE_ACTIVITY"
  | "PLSHOP_VISIT"
  | "PLSHOP_PURCHASE"
  | "PLSHOP_REVIEW"
  | "EVENT";

export type FitActivityRule = {
  code: FitActivityCode;
  label: string;
  category: string;
  enabled: boolean;
  rewardFit: number;
  watchSeconds: number | null;
  dailyCountLimit: number | null;
  dailyFitLimit: number | null;
  description: string;
};

export type FitActivityConfig = {
  version: 1;
  updatedAt: string;
  rules: FitActivityRule[];
  purchaseRewardPercent: number;
};

export type FitSummary = {
  userId: string;
  balanceFit: number;
  totalEarnedFit: number;
  recentTransactions: Array<{
    transactionId: string;
    amount: number;
    direction: "CREDIT" | "DEBIT";
    balanceAfter: number;
    sourceType: string;
    sourceId: string;
    createdAt: string;
  }>;
};
