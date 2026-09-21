import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

export type NotificationType =
  | "SYSTEM"
  | "NOTICE"
  | "LIVE"
  | "FOLLOW"
  | "DONATION"
  | "REACTION"
  | "REPORT";

export type NotificationRecord = {
  id: string;

  userId: string;

  type: NotificationType;

  title: string;
  message: string;

  href: string;

  isRead: boolean;
  readAt: string | null;

  createdAt: string;
};

export type CreateNotificationInput = {
  userId: string;

  type: NotificationType;

  title: string;
  message: string;

  href?: string;
};

const DATA_DIR = path.join(
  process.cwd(),
  "data",
);

const NOTIFICATION_FILE = path.join(
  DATA_DIR,
  "notifications.json",
);

let notificationWriteQueue: Promise<void> =
  Promise.resolve();

async function ensureNotificationFile() {
  await fs.mkdir(
    DATA_DIR,
    {
      recursive: true,
    },
  );

  try {
    await fs.access(
      NOTIFICATION_FILE,
    );
  } catch {
    await fs.writeFile(
      NOTIFICATION_FILE,
      "[]",
      "utf-8",
    );
  }
}

async function readUnsafe(): Promise<
  NotificationRecord[]
> {
  await ensureNotificationFile();

  const raw = await fs.readFile(
    NOTIFICATION_FILE,
    "utf-8",
  );

  if (!raw.trim()) {
    return [];
  }

  const parsed: unknown =
    JSON.parse(raw);

  if (!Array.isArray(parsed)) {
    throw new Error(
      "NOTIFICATION_STORE_INVALID_FORMAT",
    );
  }

  return parsed as NotificationRecord[];
}

async function writeUnsafe(
  notifications: NotificationRecord[],
) {
  await ensureNotificationFile();

  const tempFile =
    `${NOTIFICATION_FILE}.tmp`;

  await fs.writeFile(
    tempFile,
    JSON.stringify(
      notifications,
      null,
      2,
    ),
    "utf-8",
  );

  await fs.rename(
    tempFile,
    NOTIFICATION_FILE,
  );
}

function serializeWrite<T>(
  work: () => Promise<T>,
): Promise<T> {
  const result =
    notificationWriteQueue.then(
      work,
    );

  notificationWriteQueue =
    result
      .then(() => undefined)
      .catch(() => undefined);

  return result;
}

export async function readNotifications() {
  return readUnsafe();
}

export async function readNotificationsByUser(
  userId: string,
) {
  const notifications =
    await readUnsafe();

  return notifications.filter(
    (item) =>
      item.userId === userId,
  );
}

export async function countUnreadNotifications(
  userId: string,
) {
  const notifications =
    await readUnsafe();

  return notifications.filter(
    (item) =>
      item.userId === userId &&
      !item.isRead,
  ).length;
}

export async function createNotification(
  input: CreateNotificationInput,
) {
  return serializeWrite(
    async () => {
      const notifications =
        await readUnsafe();

      const notification:
        NotificationRecord = {
        id: randomUUID(),

        userId:
          input.userId,

        type:
          input.type,

        title:
          input.title.trim(),

        message:
          input.message.trim(),

        href:
          input.href?.trim() ??
          "",

        isRead:
          false,

        readAt:
          null,

        createdAt:
          new Date().toISOString(),
      };

      notifications.unshift(
        notification,
      );

      await writeUnsafe(
        notifications,
      );

      return notification;
    },
  );
}

export async function markNotificationRead(
  notificationId: string,
  userId: string,
) {
  return serializeWrite(
    async () => {
      const notifications =
        await readUnsafe();

      const index =
        notifications.findIndex(
          (item) =>
            item.id ===
              notificationId &&
            item.userId ===
              userId,
        );

      if (index < 0) {
        return null;
      }

      const current =
        notifications[index];

      if (current.isRead) {
        return current;
      }

      const updated:
        NotificationRecord = {
        ...current,

        isRead:
          true,

        readAt:
          new Date().toISOString(),
      };

      notifications[index] =
        updated;

      await writeUnsafe(
        notifications,
      );

      return updated;
    },
  );
}

export async function markAllNotificationsRead(
  userId: string,
) {
  return serializeWrite(
    async () => {
      const notifications =
        await readUnsafe();

      const now =
        new Date().toISOString();

      let changed = 0;

      const updated =
        notifications.map(
          (item) => {
            if (
              item.userId !==
                userId ||
              item.isRead
            ) {
              return item;
            }

            changed += 1;

            return {
              ...item,

              isRead:
                true,

              readAt:
                now,
            };
          },
        );

      if (changed > 0) {
        await writeUnsafe(
          updated,
        );
      }

      return changed;
    },
  );
}
