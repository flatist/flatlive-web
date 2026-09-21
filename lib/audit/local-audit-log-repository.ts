import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

import type {
  AuditLogEntry,
  CreateAuditLogInput,
} from "./types";

const FILE_PATH = path.join(
  process.cwd(),
  "data",
  "admin-audit-log.json",
);

/*
 * 개발환경용 관리자 감사 로그 저장소.
 *
 * 운영환경에서는 DB의 append-only 감사 테이블로 교체한다.
 * 일반 관리자 화면에는 수정/삭제 기능을 제공하지 않는다.
 */

let writeQueue: Promise<void> = Promise.resolve();

async function withWriteLock<T>(
  work: () => Promise<T>,
): Promise<T> {
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

async function readLogs(): Promise<AuditLogEntry[]> {
  try {
    const raw = await fs.readFile(FILE_PATH, "utf8");
    const parsed = JSON.parse(raw);

    return Array.isArray(parsed)
      ? (parsed as AuditLogEntry[])
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

async function writeLogs(
  logs: AuditLogEntry[],
): Promise<void> {
  await fs.mkdir(
    path.dirname(FILE_PATH),
    { recursive: true },
  );

  const tempPath = `${FILE_PATH}.tmp`;

  await fs.writeFile(
    tempPath,
    JSON.stringify(logs, null, 2) + "\n",
    "utf8",
  );

  await fs.rename(tempPath, FILE_PATH);
}

export class LocalAuditLogRepository {
  async append(
    input: CreateAuditLogInput,
  ): Promise<AuditLogEntry> {
    return withWriteLock(async () => {
      const logs = await readLogs();

      const entry: AuditLogEntry = {
        ...input,
        auditId: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
      };

      logs.push(entry);

      await writeLogs(logs);

      return entry;
    });
  }

  async list(limit = 100): Promise<AuditLogEntry[]> {
    const logs = await readLogs();

    return logs
      .sort((a, b) =>
        b.createdAt.localeCompare(a.createdAt),
      )
      .slice(
        0,
        Math.min(
          Math.max(limit, 1),
          500,
        ),
      );
  }
}
