import { LocalWalletRepository } from "./local-wallet-repository";
import type {
  LedgerEntity,
  LedgerTransaction,
  UserWalletSummary,
  WalletAccountKey,
} from "./types";

type WalletAssetType = "FLAT" | "FIT";
type WalletDirection = "CREDIT" | "DEBIT";

const USER_ASSET_ENTITY: Record<WalletAssetType, LedgerEntity> = {
  FLAT: "FLATTIST_CORP",
  FIT: "SIA_ANGEL_CORP",
};

type CreateWalletTransactionInput = {
  userId: string;
  assetType: WalletAssetType;
  amount: number;
  direction: WalletDirection;

  transactionId: string;
  idempotencyKey: string;

  sourceType: string;
  sourceId: string;
};

function userAccount(
  userId: string,
  assetType: WalletAssetType,
): WalletAccountKey {
  return {
    legalEntity: USER_ASSET_ENTITY[assetType],
    ownerType: "USER",
    ownerId: userId,
    assetType,
  };
}


function creatorFlatAccount(
  userId: string,
): WalletAccountKey {
  return {
    legalEntity: "FLATTIST_CORP",
    ownerType: "CREATOR",
    ownerId: userId,
    assetType: "FLAT",
  };
}


function platformContentRevenueAccount(): WalletAccountKey {
  return {
    legalEntity: "FLATTIST_CORP",
    ownerType: "PLATFORM",
    ownerId: "CONTENT_REACTION_REVENUE",
    assetType: "FLAT",
  };
}

export class WalletService {
  private repository = new LocalWalletRepository();

  async createTransaction(input: CreateWalletTransactionInput) {
    if (!Number.isSafeInteger(input.amount) || input.amount <= 0) {
      throw new Error("거래 금액이 올바르지 않습니다.");
    }

    if (!input.transactionId) {
      throw new Error("transactionId가 필요합니다.");
    }

    if (!input.idempotencyKey) {
      throw new Error("idempotencyKey가 필요합니다.");
    }

    const account = userAccount(input.userId, input.assetType);
    const balance = await this.repository.getBalance(account);

    return this.repository.appendComputed({
      transactionId: input.transactionId,
      walletId: balance.walletId,
      legalEntity: account.legalEntity,
      ownerType: account.ownerType,
      ownerId: account.ownerId,
      assetType: account.assetType,
      amount: input.amount,
      direction: input.direction,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      status: "POSTED",
      idempotencyKey: input.idempotencyKey,
      createdAt: new Date().toISOString(),
    });
  }

  async creditCreatorDonationRevenue(input: {
    userId: string;
    amount: number;
    transactionId: string;
    idempotencyKey: string;
    donationId: string;
  }) {
    if (!Number.isSafeInteger(input.amount) || input.amount <= 0) {
      throw new Error("거래 금액이 올바르지 않습니다.");
    }

    if (!input.transactionId) {
      throw new Error("transactionId가 필요합니다.");
    }

    if (!input.idempotencyKey) {
      throw new Error("idempotencyKey가 필요합니다.");
    }

    const account = creatorFlatAccount(input.userId);
    const balance =
      await this.repository.getBalance(account);

    return this.repository.appendComputed({
      transactionId: input.transactionId,
      walletId: balance.walletId,
      legalEntity: account.legalEntity,
      ownerType: account.ownerType,
      ownerId: account.ownerId,
      assetType: account.assetType,
      amount: input.amount,
      direction: "CREDIT",
      sourceType: "DONATION",
      sourceId: input.donationId,
      status: "POSTED",
      idempotencyKey: input.idempotencyKey,
      createdAt: new Date().toISOString(),
    });
  }

  async creditCreatorContentRevenue(input: {
    userId: string;
    amount: number;
    transactionId: string;
    idempotencyKey: string;
    sourceType: string;
    sourceId: string;
  }) {
    if (!Number.isSafeInteger(input.amount) || input.amount <= 0) {
      throw new Error("거래 금액이 올바르지 않습니다.");
    }

    if (!input.transactionId) {
      throw new Error("transactionId가 필요합니다.");
    }

    if (!input.idempotencyKey) {
      throw new Error("idempotencyKey가 필요합니다.");
    }

    if (!input.sourceType || !input.sourceId) {
      throw new Error("수익 출처 정보가 필요합니다.");
    }

    const account = creatorFlatAccount(input.userId);
    const balance =
      await this.repository.getBalance(account);

    return this.repository.appendComputed({
      transactionId: input.transactionId,
      walletId: balance.walletId,
      legalEntity: account.legalEntity,
      ownerType: account.ownerType,
      ownerId: account.ownerId,
      assetType: account.assetType,
      amount: input.amount,
      direction: "CREDIT",
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      status: "POSTED",
      idempotencyKey: input.idempotencyKey,
      createdAt: new Date().toISOString(),
    });
  }

  async creditPlatformContentRevenue(input: {
    amount: number;
    transactionId: string;
    idempotencyKey: string;
    sourceType: string;
    sourceId: string;
  }) {
    if (
      !Number.isSafeInteger(input.amount) ||
      input.amount <= 0
    ) {
      throw new Error(
        "거래 금액이 올바르지 않습니다.",
      );
    }

    if (!input.transactionId) {
      throw new Error(
        "transactionId가 필요합니다.",
      );
    }

    if (!input.idempotencyKey) {
      throw new Error(
        "idempotencyKey가 필요합니다.",
      );
    }

    if (
      !input.sourceType ||
      !input.sourceId
    ) {
      throw new Error(
        "수익 출처 정보가 필요합니다.",
      );
    }

    const account =
      platformContentRevenueAccount();

    const balance =
      await this.repository.getBalance(
        account,
      );

    return this.repository.appendComputed({
      transactionId:
        input.transactionId,
      walletId:
        balance.walletId,
      legalEntity:
        account.legalEntity,
      ownerType:
        account.ownerType,
      ownerId:
        account.ownerId,
      assetType:
        account.assetType,
      amount:
        input.amount,
      direction:
        "CREDIT",
      sourceType:
        input.sourceType,
      sourceId:
        input.sourceId,
      status:
        "POSTED",
      idempotencyKey:
        input.idempotencyKey,
      createdAt:
        new Date().toISOString(),
    });
  }

  async getPlatformContentRevenueBalance() {
    return this.repository.getBalance(
      platformContentRevenueAccount(),
    );
  }

  async getCreatorRevenueBalance(userId: string) {
    return this.repository.getBalance(
      creatorFlatAccount(userId),
    );
  }

  async getBalance(userId: string, assetType: WalletAssetType) {
    return this.repository.getBalance(
      userAccount(userId, assetType),
    );
  }

  async findTransactionByIdempotencyKey(
    userId: string,
    assetType: WalletAssetType,
    idempotencyKey: string,
  ) {
    if (!idempotencyKey) {
      return null;
    }

    return this.repository.findByIdempotencyKey(
      userAccount(userId, assetType),
      idempotencyKey,
    );
  }

  async listAllUserFlatTransactions(userId: string) {
    return this.repository.listAllTransactions(
      userAccount(userId, "FLAT"),
    );
  }

  // FLATLIVE_FIT_V1
  async listAllUserFitTransactions(userId: string) {
    return this.repository.listAllTransactions(
      userAccount(userId, "FIT"),
    );
  }

  async getUserSummary(userId: string): Promise<UserWalletSummary> {
    const flatAccount = userAccount(userId, "FLAT");
    const fitAccount = userAccount(userId, "FIT");

    const [flat, fit, flatHistory, fitHistory] =
      await Promise.all([
        this.repository.getBalance(flatAccount),
        this.repository.getBalance(fitAccount),
        this.repository.listTransactions(flatAccount, 20),
        this.repository.listTransactions(fitAccount, 20),
      ]);

    const recentTransactions = [...flatHistory, ...fitHistory]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 30);

    return {
      userId,
      balances: {
        FLAT: flat.balance,
        FIT: fit.balance,
      },
      accounts: [flat, fit],
      recentTransactions,
    };
  }

  async getReceivedDonationSummary(userId: string) {
    const account =
      creatorFlatAccount(userId);

    const transactions =
      await this.repository.listTransactions(
        account,
        Number.MAX_SAFE_INTEGER,
      );

    const posted =
      transactions.filter(
        (entry) =>
          entry.status === "POSTED",
      );

    const liveCredits =
      posted.filter(
        (entry) =>
          entry.direction === "CREDIT" &&
          entry.sourceType === "DONATION",
      );

    const contentCredits =
      posted.filter(
        (entry) =>
          entry.direction === "CREDIT" &&
          (
            entry.sourceType ===
              "CONTENT_GREAT_REVENUE" ||
            entry.sourceType ===
              "CONTENT_BEST_REVENUE"
          ),
      );

    const contentReversals =
      posted.filter(
        (entry) =>
          entry.direction === "DEBIT" &&
          (
            entry.sourceType ===
              "CONTENT_GREAT_REVENUE_REVERSAL" ||
            entry.sourceType ===
              "CONTENT_BEST_REVENUE_REVERSAL"
          ),
      );

    const liveReceived =
      liveCredits.reduce(
        (sum, entry) =>
          sum + entry.amount,
        0,
      );

    const contentCreditTotal =
      contentCredits.reduce(
        (sum, entry) =>
          sum + entry.amount,
        0,
      );

    const contentReversalTotal =
      contentReversals.reduce(
        (sum, entry) =>
          sum + entry.amount,
        0,
      );

    const contentReceived =
      contentCreditTotal -
      contentReversalTotal;

    const totalReceived =
      liveReceived +
      contentReceived;

    const recent = [
      ...liveCredits,
      ...contentCredits,
    ]
      .sort((a, b) =>
        b.createdAt.localeCompare(
          a.createdAt,
        ),
      )
      .slice(0, 20);

    return {
      totalReceived,
      count:
        liveCredits.length +
        contentCredits.length,

      liveReceived,
      liveCount:
        liveCredits.length,

      contentReceived,
      contentCount:
        contentCredits.length,

      recent,
      recentLive:
        liveCredits.slice(0, 30),
      recentContent:
        contentCredits.slice(0, 30),
    };
  }

  async appendLedgerEntry(transaction: LedgerTransaction) {
    return this.repository.append(transaction);
  }

  async reverseLedgerEntry(
    originalTransactionId: string,
    reversalTransaction: LedgerTransaction,
  ) {
    return this.repository.reverse(
      originalTransactionId,
      reversalTransaction,
    );
  }
}
