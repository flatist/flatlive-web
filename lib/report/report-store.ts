import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

export type ReportTargetType =
  | "LIVE"
  | "FLIT"
  | "VOD";

export type ReportReason =
  | "SEXUAL"
  | "VIOLENCE"
  | "HARASSMENT"
  | "ILLEGAL_FRAUD"
  | "COPYRIGHT"
  | "PORTRAIT_PRIVACY"
  | "IMPERSONATION"
  | "DEFAMATION"
  | "TRADEMARK"
  | "ILLEGAL_HARMFUL"
  | "SPAM"
  | "OTHER";

export type ReportStatus =
  | "RECEIVED"
  | "REVIEWING"
  | "RESOLVED"
  | "REJECTED";

export type ReportRecord = {
  id: string;

  reporterUserId: string;
  reporterUsername: string;

  targetType: ReportTargetType;
  targetId: string;

  targetOwnerUserId: string;
  targetTitle: string;

  reason: ReportReason;
  detail: string;

  status: ReportStatus;

  adminMemo: string;
  actionedByUserId: string;
  actionedAt: string | null;

  traceId: string;

  createdAt: string;
  updatedAt: string;
};

type CreateReportInput = {
  reporterUserId: string;
  reporterUsername: string;

  targetType: ReportTargetType;
  targetId: string;

  targetOwnerUserId?: string;
  targetTitle?: string;

  reason: ReportReason;
  detail?: string;

  traceId: string;
};

type UpdateReportInput = {
  status: ReportStatus;
  adminMemo?: string;
  actionedByUserId: string;
};

const DATA_DIR = path.join(
  process.cwd(),
  "data",
);

const REPORT_FILE = path.join(
  DATA_DIR,
  "reports.json",
);

let reportWriteQueue: Promise<void> =
  Promise.resolve();

async function ensureReportFile() {
  await fs.mkdir(DATA_DIR, {
    recursive: true,
  });

  try {
    await fs.access(REPORT_FILE);
  } catch {
    await fs.writeFile(
      REPORT_FILE,
      "[]",
      "utf-8",
    );
  }
}

async function readUnsafe(): Promise<ReportRecord[]> {
  await ensureReportFile();

  const raw = await fs.readFile(
    REPORT_FILE,
    "utf-8",
  );

  if (!raw.trim()) {
    return [];
  }

  const parsed: unknown =
    JSON.parse(raw);

  if (!Array.isArray(parsed)) {
    throw new Error(
      "REPORT_STORE_INVALID_FORMAT",
    );
  }

  return parsed as ReportRecord[];
}

async function writeUnsafe(
  reports: ReportRecord[],
) {
  await ensureReportFile();

  const tempFile =
    `${REPORT_FILE}.tmp`;

  await fs.writeFile(
    tempFile,
    JSON.stringify(
      reports,
      null,
      2,
    ),
    "utf-8",
  );

  await fs.rename(
    tempFile,
    REPORT_FILE,
  );
}

function serializeWrite<T>(
  work: () => Promise<T>,
): Promise<T> {
  const result =
    reportWriteQueue.then(work);

  reportWriteQueue = result
    .then(() => undefined)
    .catch(() => undefined);

  return result;
}

export async function readReports() {
  return readUnsafe();
}

export async function findReportById(
  reportId: string,
) {
  const reports =
    await readUnsafe();

  return (
    reports.find(
      (item) =>
        item.id === reportId,
    ) ?? null
  );
}

export async function findDuplicateReport(params: {
  reporterUserId: string;
  targetType: ReportTargetType;
  targetId: string;
}) {
  const reports =
    await readUnsafe();

  return (
    reports.find(
      (item) =>
        item.reporterUserId ===
          params.reporterUserId &&
        item.targetType ===
          params.targetType &&
        item.targetId ===
          params.targetId &&
        item.status !== "REJECTED",
    ) ?? null
  );
}

export async function createReport(
  input: CreateReportInput,
) {
  return serializeWrite(
    async () => {
      const reports =
        await readUnsafe();

      const duplicate =
        reports.find(
          (item) =>
            item.reporterUserId ===
              input.reporterUserId &&
            item.targetType ===
              input.targetType &&
            item.targetId ===
              input.targetId &&
            item.status !==
              "REJECTED",
        );

      if (duplicate) {
        return {
          created: false,
          report: duplicate,
        };
      }

      const now =
        new Date().toISOString();

      const report: ReportRecord = {
        id: randomUUID(),

        reporterUserId:
          input.reporterUserId,
        reporterUsername:
          input.reporterUsername,

        targetType:
          input.targetType,
        targetId:
          input.targetId,

        targetOwnerUserId:
          input.targetOwnerUserId ?? "",
        targetTitle:
          input.targetTitle ?? "",

        reason:
          input.reason,
        detail:
          input.detail?.trim() ?? "",

        status:
          "RECEIVED",

        adminMemo: "",
        actionedByUserId: "",
        actionedAt: null,

        traceId:
          input.traceId,

        createdAt: now,
        updatedAt: now,
      };

      reports.unshift(report);

      await writeUnsafe(
        reports,
      );

      return {
        created: true,
        report,
      };
    },
  );
}

export async function updateReport(
  reportId: string,
  input: UpdateReportInput,
) {
  return serializeWrite(
    async () => {
      const reports =
        await readUnsafe();

      const index =
        reports.findIndex(
          (item) =>
            item.id === reportId,
        );

      if (index === -1) {
        return null;
      }

      const now =
        new Date().toISOString();

      const current =
        reports[index];

      const updated: ReportRecord = {
        ...current,

        status:
          input.status,

        adminMemo:
          input.adminMemo?.trim() ??
          current.adminMemo,

        actionedByUserId:
          input.actionedByUserId,

        actionedAt: now,
        updatedAt: now,
      };

      reports[index] =
        updated;

      await writeUnsafe(
        reports,
      );

      return updated;
    },
  );
}
