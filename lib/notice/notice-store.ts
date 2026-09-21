import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

export type NoticeAudience =
  | "ALL"
  | "MEMBER"
  | "SELLER";

export type NoticeStatus =
  | "PUBLIC"
  | "PRIVATE";

export type NoticeRecord = {
  id: string;

  title: string;
  content: string;

  audience: NoticeAudience;
  status: NoticeStatus;

  important: boolean;
  pinned: boolean;

  publishStartAt: string | null;
  publishEndAt: string | null;

  createdByUserId: string;
  updatedByUserId: string;

  createdAt: string;
  updatedAt: string;
};

export type CreateNoticeInput = {
  title: string;
  content: string;

  audience: NoticeAudience;
  status: NoticeStatus;

  important?: boolean;
  pinned?: boolean;

  publishStartAt?: string | null;
  publishEndAt?: string | null;

  createdByUserId: string;
};

export type UpdateNoticeInput = {
  title?: string;
  content?: string;

  audience?: NoticeAudience;
  status?: NoticeStatus;

  important?: boolean;
  pinned?: boolean;

  publishStartAt?: string | null;
  publishEndAt?: string | null;

  updatedByUserId: string;
};

const DATA_DIR = path.join(
  process.cwd(),
  "data",
);

const NOTICE_FILE = path.join(
  DATA_DIR,
  "notices.json",
);

let noticeWriteQueue: Promise<void> =
  Promise.resolve();

async function ensureNoticeFile() {
  await fs.mkdir(
    DATA_DIR,
    {
      recursive: true,
    },
  );

  try {
    await fs.access(
      NOTICE_FILE,
    );
  } catch {
    await fs.writeFile(
      NOTICE_FILE,
      "[]",
      "utf-8",
    );
  }
}

async function readUnsafe(): Promise<
  NoticeRecord[]
> {
  await ensureNoticeFile();

  const raw = await fs.readFile(
    NOTICE_FILE,
    "utf-8",
  );

  if (!raw.trim()) {
    return [];
  }

  const parsed: unknown =
    JSON.parse(raw);

  if (!Array.isArray(parsed)) {
    throw new Error(
      "NOTICE_STORE_INVALID_FORMAT",
    );
  }

  return parsed as NoticeRecord[];
}

async function writeUnsafe(
  notices: NoticeRecord[],
) {
  await ensureNoticeFile();

  const tempFile =
    `${NOTICE_FILE}.tmp`;

  await fs.writeFile(
    tempFile,
    JSON.stringify(
      notices,
      null,
      2,
    ),
    "utf-8",
  );

  await fs.rename(
    tempFile,
    NOTICE_FILE,
  );
}

function serializeWrite<T>(
  work: () => Promise<T>,
): Promise<T> {
  const result =
    noticeWriteQueue.then(
      work,
    );

  noticeWriteQueue =
    result
      .then(() => undefined)
      .catch(() => undefined);

  return result;
}

export async function readNotices() {
  return readUnsafe();
}

export async function findNoticeById(
  noticeId: string,
) {
  const notices =
    await readUnsafe();

  return (
    notices.find(
      (item) =>
        item.id === noticeId,
    ) ?? null
  );
}

export async function createNotice(
  input: CreateNoticeInput,
) {
  return serializeWrite(
    async () => {
      const notices =
        await readUnsafe();

      const now =
        new Date().toISOString();

      const notice: NoticeRecord = {
        id: randomUUID(),

        title:
          input.title.trim(),

        content:
          input.content.trim(),

        audience:
          input.audience,

        status:
          input.status,

        important:
          Boolean(
            input.important,
          ),

        pinned:
          Boolean(
            input.pinned,
          ),

        publishStartAt:
          input.publishStartAt ??
          null,

        publishEndAt:
          input.publishEndAt ??
          null,

        createdByUserId:
          input.createdByUserId,

        updatedByUserId:
          input.createdByUserId,

        createdAt: now,
        updatedAt: now,
      };

      notices.unshift(
        notice,
      );

      await writeUnsafe(
        notices,
      );

      return notice;
    },
  );
}

export async function updateNotice(
  noticeId: string,
  input: UpdateNoticeInput,
) {
  return serializeWrite(
    async () => {
      const notices =
        await readUnsafe();

      const index =
        notices.findIndex(
          (item) =>
            item.id === noticeId,
        );

      if (index < 0) {
        return null;
      }

      const current =
        notices[index];

      const updated: NoticeRecord = {
        ...current,

        title:
          input.title !== undefined
            ? input.title.trim()
            : current.title,

        content:
          input.content !== undefined
            ? input.content.trim()
            : current.content,

        audience:
          input.audience ??
          current.audience,

        status:
          input.status ??
          current.status,

        important:
          input.important ??
          current.important,

        pinned:
          input.pinned ??
          current.pinned,

        publishStartAt:
          input.publishStartAt !==
          undefined
            ? input.publishStartAt
            : current.publishStartAt,

        publishEndAt:
          input.publishEndAt !==
          undefined
            ? input.publishEndAt
            : current.publishEndAt,

        updatedByUserId:
          input.updatedByUserId,

        updatedAt:
          new Date().toISOString(),
      };

      notices[index] =
        updated;

      await writeUnsafe(
        notices,
      );

      return updated;
    },
  );
}

export async function deleteNotice(
  noticeId: string,
) {
  return serializeWrite(
    async () => {
      const notices =
        await readUnsafe();

      const index =
        notices.findIndex(
          (item) =>
            item.id === noticeId,
        );

      if (index < 0) {
        return false;
      }

      notices.splice(
        index,
        1,
      );

      await writeUnsafe(
        notices,
      );

      return true;
    },
  );
}
