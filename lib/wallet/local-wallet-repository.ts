import fs from "fs/promises";
import path from "path";

import type { WalletRepository } from "./wallet-repository";
import type {
  AssetBalance,
  LedgerTransaction,
  WalletAccountKey,
} from "./types";

const FILE_PATH = path.join(process.cwd(), "data", "wallet-ledger.json");

/**
 * 개발용 단일 Node 프로세스 안에서 원장 쓰기를 직렬화한다.
 *
 * 주의:
 * - 로컬 JSON 개발환경용 안전장치다.
 * - 실제 운영 DB에서는 DB transaction / row locking /
 *   UNIQUE constraint 등으로 교체해야 한다.
 */
let writeQueue: Promise<void> = Promise.resolve();

async function withLedgerWriteLock<T>(work: () => Promise<T>): Promise<T> {
  const previous = writeQueue;

  let release!: () => void;
  writeQueue = new Promise<void>((resolve) => {
    release = resolve;
  });

  await previous;

  try {
    return await work();
  } finally {
    release();
  }
}

function walletIdOf(account: WalletAccountKey) {
  return [
    account.legalEntity,
    account.ownerType,
    account.ownerId,
    account.assetType,
  ].join(":");
}

async function readLedger(): Promise<LedgerTransaction[]> {
  try {
    const parsed = JSON.parse(await fs.readFile(FILE_PATH, "utf8"));
    return Array.isArray(parsed) ? (parsed as LedgerTransaction[]) : [];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}

async function writeLedger(ledger: LedgerTransaction[]) {
  await fs.mkdir(path.dirname(FILE_PATH), { recursive: true });

  const tempPath = `${FILE_PATH}.tmp`;

  await fs.writeFile(
    tempPath,
    JSON.stringify(ledger, null, 2) + "\n",
    "utf8",
  );

  await fs.rename(tempPath, FILE_PATH);
}

function assertIntegerAmount(amount: number) {
  if (!Number.isSafeInteger(amount) || amount <= 0) {
    throw new Error("원장 금액은 0보다 큰 최소단위 정수여야 합니다.");
  }
}

function balanceFromLedger(
  ledger: LedgerTransaction[],
  account: WalletAccountKey,
): AssetBalance {
  const walletId = walletIdOf(account);

  const posted = ledger
    .filter(
      (entry) =>
        entry.walletId === walletId &&
        entry.status === "POSTED",
    )
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  const balance =
    posted.length > 0
      ? posted[posted.length - 1].balanceAfter
      : 0;

  return {
    walletId,
    ...account,
    balance,
  };
}

function validateAppend(
  ledger: LedgerTransaction[],
  transaction: LedgerTransaction,
) {
  assertIntegerAmount(transaction.amount);

  if (
    ledger.some(
      (entry) =>
        entry.transactionId === transaction.transactionId,
    )
  ) {
    throw new Error("이미 존재하는 transactionId입니다.");
  }

  if (
    transaction.idempotencyKey &&
    ledger.some(
      (entry) =>
        entry.idempotencyKey === transaction.idempotencyKey,
    )
  ) {
    throw new Error("이미 처리된 idempotencyKey입니다.");
  }

  const account: WalletAccountKey = {
    legalEntity: transaction.legalEntity,
    ownerType: transaction.ownerType,
    ownerId: transaction.ownerId,
    assetType: transaction.assetType,
  };

  const current = balanceFromLedger(ledger, account);

  if (transaction.walletId !== current.walletId) {
    throw new Error("walletId가 계정 정보와 일치하지 않습니다.");
  }

  if (transaction.balanceBefore !== current.balance) {
    throw new Error(
      "balanceBefore가 현재 원장 잔액과 일치하지 않습니다.",
    );
  }

  const expectedAfter =
    transaction.direction === "CREDIT"
      ? current.balance + transaction.amount
      : current.balance - transaction.amount;

  if (!Number.isSafeInteger(expectedAfter)) {
    throw new Error(
      "계산된 잔액이 안전한 정수 범위를 벗어났습니다.",
    );
  }

  if (expectedAfter < 0) {
    throw new Error("잔액이 부족합니다.");
  }

  if (transaction.balanceAfter !== expectedAfter) {
    throw new Error("balanceAfter 계산이 올바르지 않습니다.");
  }
}

export function findLedgerTransactionByIdempotencyKey(
  ledger: LedgerTransaction[],
  account: WalletAccountKey,
  idempotencyKey: string,
): LedgerTransaction | null {
  if (!idempotencyKey) {
    return null;
  }

  const walletId =
    walletIdOf(account);

  return (
    ledger.find(
      (entry) =>
        entry.walletId === walletId &&
        entry.idempotencyKey === idempotencyKey,
    ) ?? null
  );
}

export class LocalWalletRepository implements WalletRepository {
  async getBalance(
    account: WalletAccountKey,
  ): Promise<AssetBalance> {
    const ledger = await readLedger();
    return balanceFromLedger(ledger, account);
  }

  async listTransactions(
    account: WalletAccountKey,
    limit = 50,
  ) {
    const walletId = walletIdOf(account);
    const ledger = await readLedger();

    return ledger
      .filter((entry) => entry.walletId === walletId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, Math.max(0, limit));
  }

  async listAllTransactions(account: WalletAccountKey) {
    const walletId = walletIdOf(account);
    const ledger = await readLedger();

    return ledger
      .filter((entry) => entry.walletId === walletId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async findByIdempotencyKey(
    account: WalletAccountKey,
    idempotencyKey: string,
  ): Promise<LedgerTransaction | null> {
    if (!idempotencyKey) {
      return null;
    }

    const ledger =
      await readLedger();

    return findLedgerTransactionByIdempotencyKey(
      ledger,
      account,
      idempotencyKey,
    );
  }

  async append(transaction: LedgerTransaction) {
    return withLedgerWriteLock(async () => {
      const ledger = await readLedger();

      validateAppend(ledger, transaction);

      ledger.push(transaction);
      await writeLedger(ledger);

      return transaction;
    });
  }

  async appendComputed(
    transaction: Omit<LedgerTransaction, "balanceBefore" | "balanceAfter">,
  ) {
    return withLedgerWriteLock(async () => {
      const ledger = await readLedger();

      assertIntegerAmount(transaction.amount);

      if (
        ledger.some(
          (entry) =>
            entry.transactionId === transaction.transactionId,
        )
      ) {
        throw new Error("이미 존재하는 transactionId입니다.");
      }

      if (
        transaction.idempotencyKey &&
        ledger.some(
          (entry) =>
            entry.idempotencyKey === transaction.idempotencyKey,
        )
      ) {
        throw new Error("이미 처리된 idempotencyKey입니다.");
      }

      const account: WalletAccountKey = {
        legalEntity: transaction.legalEntity,
        ownerType: transaction.ownerType,
        ownerId: transaction.ownerId,
        assetType: transaction.assetType,
      };

      const current = balanceFromLedger(ledger, account);

      if (transaction.walletId !== current.walletId) {
        throw new Error("walletId가 계정 정보와 일치하지 않습니다.");
      }

      const balanceAfter =
        transaction.direction === "CREDIT"
          ? current.balance + transaction.amount
          : current.balance - transaction.amount;

      if (!Number.isSafeInteger(balanceAfter)) {
        throw new Error(
          "계산된 잔액이 안전한 정수 범위를 벗어났습니다.",
        );
      }

      if (balanceAfter < 0) {
        throw new Error("잔액이 부족합니다.");
      }

      const completed: LedgerTransaction = {
        ...transaction,
        balanceBefore: current.balance,
        balanceAfter,
      };

      ledger.push(completed);
      await writeLedger(ledger);

      return completed;
    });
  }

  async reverse(
    originalTransactionId: string,
    reversalTransaction: LedgerTransaction,
  ) {
    return withLedgerWriteLock(async () => {
      const ledger = await readLedger();

      const original = ledger.find(
        (entry) =>
          entry.transactionId === originalTransactionId,
      );

      if (!original) {
        throw new Error("원거래를 찾을 수 없습니다.");
      }

      if (
        ledger.some(
          (entry) =>
            entry.reversedTransactionId ===
              originalTransactionId &&
            entry.status === "POSTED",
        )
      ) {
        throw new Error("이미 역거래 처리된 거래입니다.");
      }

      if (
        reversalTransaction.reversedTransactionId !==
        originalTransactionId
      ) {
        throw new Error("역거래에 원거래 ID가 필요합니다.");
      }

      if (
        reversalTransaction.walletId !== original.walletId ||
        reversalTransaction.assetType !== original.assetType ||
        reversalTransaction.legalEntity !== original.legalEntity
      ) {
        throw new Error(
          "역거래는 원거래와 동일한 지갑/자산/법인에서 처리해야 합니다.",
        );
      }

      validateAppend(ledger, reversalTransaction);

      ledger.push(reversalTransaction);
      await writeLedger(ledger);

      return reversalTransaction;
    });
  }
}
