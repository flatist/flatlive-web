import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";

import {
  calculateSettlementAllocation,
  SETTLEMENT_POLICY_VERSION,
} from "./policy";

import {
  getCreatorSettlementAffiliation,
} from "./affiliation-store";

export type SettlementRecordStatus =
  | "CALCULATED"
  | "PENDING"
  | "APPROVED"
  | "PAID"
  | "HOLD"
  | "CANCELLED";

export type SettlementRecord = {
  settlementId: string;

  creatorUserId: string;

  grossAmount: number;

  affiliation:
    | "AGENCY"
    | "INDEPENDENT";

  agencyId?: string | null;
  branchId?: string | null;
  headManagerUserId?: string | null;

  creatorAmount: number;
  agencyAmount: number;
  branchAmount: number;
  headManagerAmount: number;
  companyAmount: number;

  creatorRate: number;
  agencyRate: number;
  branchRate: number;
  headManagerRate: number;
  companyRate: number;

  policyVersion: string;

  sourceType: string;
  sourceId: string;

  status: SettlementRecordStatus;

  createdAt: string;
  updatedAt: string;
};

const FILE_PATH = path.join(
  process.cwd(),
  "data",
  "settlement-records.json",
);

let writeQueue: Promise<void> =
  Promise.resolve();

async function readRecords():
  Promise<SettlementRecord[]> {
  try {
    const raw =
      await fs.readFile(
        FILE_PATH,
        "utf8",
      );

    const parsed =
      JSON.parse(raw);

    return Array.isArray(parsed)
      ? parsed
      : [];
  } catch (error) {
    const code =
      error &&
      typeof error === "object" &&
      "code" in error
        ? String(error.code)
        : "";

    if (code === "ENOENT") {
      return [];
    }

    throw error;
  }
}

async function writeRecords(
  records: SettlementRecord[],
) {
  await fs.mkdir(
    path.dirname(FILE_PATH),
    {
      recursive: true,
    },
  );

  const tempPath =
    `${FILE_PATH}.tmp`;

  await fs.writeFile(
    tempPath,
    JSON.stringify(
      records,
      null,
      2,
    ) + "\n",
    "utf8",
  );

  await fs.rename(
    tempPath,
    FILE_PATH,
  );
}

async function withWriteLock<T>(
  work: () => Promise<T>,
): Promise<T> {
  const operation =
    writeQueue.then(work);

  writeQueue =
    operation
      .then(() => undefined)
      .catch(() => undefined);

  return operation;
}

export async function createSettlementRecord(
  input: {
    creatorUserId: string;
    grossAmount: number;
    sourceType: string;
    sourceId: string;
  },
) {
  if (!input.creatorUserId) {
    throw new Error(
      "creatorUserId가 필요합니다.",
    );
  }

  if (
    !Number.isSafeInteger(
      input.grossAmount,
    ) ||
    input.grossAmount <= 0
  ) {
    throw new Error(
      "정산 대상 금액이 올바르지 않습니다.",
    );
  }

  if (
    !input.sourceType ||
    !input.sourceId
  ) {
    throw new Error(
      "정산 출처 정보가 필요합니다.",
    );
  }

  return withWriteLock(
    async () => {
      const records =
        await readRecords();

      const duplicate =
        records.find(
          (item) =>
            item.creatorUserId ===
              input.creatorUserId &&
            item.sourceType ===
              input.sourceType &&
            item.sourceId ===
              input.sourceId,
        );

      if (duplicate) {
        return duplicate;
      }

      const affiliation =
        await getCreatorSettlementAffiliation(
          input.creatorUserId,
        );

      const allocation =
        calculateSettlementAllocation(
          input.grossAmount,
          affiliation.affiliation,
        );

      const now =
        new Date()
          .toISOString();

      const record:
        SettlementRecord = {
        settlementId:
          `stl_${randomUUID()}`,

        creatorUserId:
          input.creatorUserId,

        grossAmount:
          input.grossAmount,

        affiliation:
          affiliation.affiliation,

        agencyId:
          affiliation.affiliation ===
          "AGENCY"
            ? affiliation.agencyId
            : null,

        branchId:
          affiliation.affiliation ===
          "AGENCY"
            ? affiliation.branchId
            : null,

        headManagerUserId:
          affiliation.affiliation ===
          "AGENCY"
            ? affiliation.headManagerUserId
            : null,

        creatorAmount:
          allocation.creatorAmount,

        agencyAmount:
          allocation.agencyAmount,

        branchAmount:
          allocation.branchAmount,

        headManagerAmount:
          allocation.headManagerAmount,

        companyAmount:
          allocation.companyAmount,

        creatorRate:
          allocation.creatorRate,

        agencyRate:
          allocation.agencyRate,

        branchRate:
          allocation.branchRate,

        headManagerRate:
          allocation.headManagerRate,

        companyRate:
          allocation.companyRate,

        policyVersion:
          SETTLEMENT_POLICY_VERSION,

        sourceType:
          input.sourceType,

        sourceId:
          input.sourceId,

        status:
          "CALCULATED",

        createdAt:
          now,

        updatedAt:
          now,
      };

      records.push(
        record,
      );

      await writeRecords(
        records,
      );

      return record;
    },
  );
}

export async function getSettlementRecordById(
  settlementId: string,
) {
  const records =
    await readRecords();

  return (
    records.find(
      (item) =>
        item.settlementId ===
        settlementId,
    ) ?? null
  );
}

export async function listSettlementRecordsByCreator(
  creatorUserId: string,
) {
  const records =
    await readRecords();

  return records
    .filter(
      (item) =>
        item.creatorUserId ===
        creatorUserId,
    )
    .sort(
      (a, b) =>
        b.createdAt.localeCompare(
          a.createdAt,
        ),
    );
}

export async function listSettlementRecordsByAgency(
  agencyId: string,
) {
  const records =
    await readRecords();

  return records
    .filter(
      (item) =>
        item.agencyId ===
        agencyId,
    )
    .sort(
      (a, b) =>
        b.createdAt.localeCompare(
          a.createdAt,
        ),
    );
}

export async function listSettlementRecordsByBranch(
  branchId: string,
) {
  const records =
    await readRecords();

  return records
    .filter(
      (item) =>
        item.branchId ===
        branchId,
    )
    .sort(
      (a, b) =>
        b.createdAt.localeCompare(
          a.createdAt,
        ),
    );
}

export async function listSettlementRecordsByHeadManager(
  headManagerUserId: string,
) {
  const records =
    await readRecords();

  return records
    .filter(
      (item) =>
        item.headManagerUserId ===
        headManagerUserId,
    )
    .sort(
      (a, b) =>
        b.createdAt.localeCompare(
          a.createdAt,
        ),
    );
}


export async function updateSettlementRecordStatus(
  input: {
    settlementId: string;
    status: SettlementRecordStatus;
  },
) {
  if (!input.settlementId) {
    throw new Error(
      "settlementId가 필요합니다.",
    );
  }

  return withWriteLock(
    async () => {
      const records =
        await readRecords();

      const index =
        records.findIndex(
          (item) =>
            item.settlementId ===
            input.settlementId,
        );

      if (index < 0) {
        throw new Error(
          "정산 기록을 찾을 수 없습니다.",
        );
      }

      const current =
        records[index];

      const allowedTransitions:
        Record<
          SettlementRecordStatus,
          SettlementRecordStatus[]
        > = {
        CALCULATED: [
          "PENDING",
          "CANCELLED",
        ],

        PENDING: [
          "APPROVED",
          "HOLD",
          "CANCELLED",
        ],

        APPROVED: [
          "PAID",
          "HOLD",
          "CANCELLED",
        ],

        PAID: [],

        HOLD: [
          "PENDING",
          "APPROVED",
          "CANCELLED",
        ],

        CANCELLED: [],
      };

      if (
        current.status !==
          input.status &&
        !allowedTransitions[
          current.status
        ].includes(
          input.status,
        )
      ) {
        throw new Error(
          `허용되지 않은 정산 상태 변경입니다. ${current.status} → ${input.status}`,
        );
      }

      const updated:
        SettlementRecord = {
        ...current,
        status:
          input.status,
        updatedAt:
          new Date()
            .toISOString(),
      };

      records[index] =
        updated;

      await writeRecords(
        records,
      );

      return updated;
    },
  );
}

export async function listAllSettlementRecords() {
  const records =
    await readRecords();

  return records.sort(
    (a, b) =>
      b.createdAt.localeCompare(
        a.createdAt,
      ),
  );
}
