import fs from "fs/promises";
import path from "path";

import type { LedgerTransaction } from "@/lib/wallet/types";

const FILE_PATH = path.join(
  process.cwd(),
  "data",
  "wallet-ledger.json",
);

async function readLedger(): Promise<LedgerTransaction[]> {
  try {
    const raw = await fs.readFile(FILE_PATH, "utf8");
    const parsed = JSON.parse(raw);

    return Array.isArray(parsed)
      ? (parsed as LedgerTransaction[])
      : [];
  } catch (error) {
    if (
      (error as NodeJS.ErrnoException).code === "ENOENT"
    ) {
      return [];
    }

    throw error;
  }
}

export type AdminLedgerSearchField =
  | "ALL"
  | "OWNER_ID"
  | "TRANSACTION_ID"
  | "SOURCE_ID"
  | "WALLET_ID";

export class WalletLedgerAdminService {
  async search(input: {
    query?: string;
    field?: AdminLedgerSearchField;
    limit?: number;
  }) {
    const ledger = await readLedger();

    const query = (input.query ?? "").trim().toLowerCase();
    const field = input.field ?? "ALL";

    const limit = Math.min(
      Math.max(input.limit ?? 100, 1),
      500,
    );

    let filtered = ledger;

    if (query) {
      filtered = ledger.filter((entry) => {
        const ownerId =
          entry.ownerId.toLowerCase();

        const transactionId =
          entry.transactionId.toLowerCase();

        const sourceId =
          entry.sourceId.toLowerCase();

        const walletId =
          entry.walletId.toLowerCase();

        switch (field) {
          case "OWNER_ID":
            return ownerId.includes(query);

          case "TRANSACTION_ID":
            return transactionId.includes(query);

          case "SOURCE_ID":
            return sourceId.includes(query);

          case "WALLET_ID":
            return walletId.includes(query);

          case "ALL":
          default:
            return (
              ownerId.includes(query) ||
              transactionId.includes(query) ||
              sourceId.includes(query) ||
              walletId.includes(query)
            );
        }
      });
    }

    const transactions = filtered
      .sort((a, b) =>
        b.createdAt.localeCompare(a.createdAt),
      )
      .slice(0, limit);

    return {
      query: input.query ?? "",
      field,
      totalMatched: filtered.length,
      returned: transactions.length,
      transactions,
    };
  }
}
