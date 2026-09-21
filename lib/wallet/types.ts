import type { UserId } from "@/lib/auth/types";

export type AssetType = "KRW" | "FLAT" | "FIT" | "SIA" | "WEM";

export type LedgerEntity =
  | "FLATTIST_CORP"
  | "GOGOREALBOX_CORP"
  | "SIA_ANGEL_CORP";

export type WalletOwnerType =
  | "USER"
  | "CREATOR"
  | "AGENCY"
  | "PLATFORM"
  | "SETTLEMENT"
  | "REFUND"
  | "REWARD";

export type LedgerDirection = "CREDIT" | "DEBIT";

export type LedgerStatus =
  | "PENDING"
  | "POSTED"
  | "HOLD"
  | "REVERSED"
  | "CANCELLED";

export type WalletAccountKey = {
  legalEntity: LedgerEntity;
  ownerType: WalletOwnerType;
  ownerId: string;
  assetType: AssetType;
};

export type LedgerTransaction = {
  transactionId: string;
  walletId: string;
  legalEntity: LedgerEntity;
  ownerType: WalletOwnerType;
  ownerId: string;
  assetType: AssetType;
  amount: number;
  direction: LedgerDirection;
  balanceBefore: number;
  balanceAfter: number;
  sourceType: string;
  sourceId: string;
  status: LedgerStatus;
  reversedTransactionId?: string;
  idempotencyKey?: string;
  policyId?: string;
  policyVersion?: string;
  createdAt: string;
};

export type AssetBalance = {
  walletId: string;
  legalEntity: LedgerEntity;
  ownerType: WalletOwnerType;
  ownerId: string;
  assetType: AssetType;
  balance: number;
};

export type UserWalletSummary = {
  userId: UserId;
  balances: {
    FLAT: number;
    FIT: number;
  };
  accounts: AssetBalance[];
  recentTransactions: LedgerTransaction[];
};
