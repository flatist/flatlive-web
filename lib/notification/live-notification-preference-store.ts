import fs from "node:fs/promises";
import path from "node:path";

export type LiveNotificationPreference = {
  userId: string;
  streamerUserId: string;
  enabled: boolean;
  updatedAt: string;
};

const DATA_DIR =
  path.join(
    process.cwd(),
    "data",
  );

const FILE_PATH =
  path.join(
    DATA_DIR,
    "live-notification-preferences.json",
  );

let writeQueue: Promise<void> =
  Promise.resolve();

async function ensureFile() {
  await fs.mkdir(
    DATA_DIR,
    {
      recursive: true,
    },
  );

  try {
    await fs.access(
      FILE_PATH,
    );
  } catch {
    await fs.writeFile(
      FILE_PATH,
      "[]",
      "utf-8",
    );
  }
}

async function readUnsafe():
  Promise<LiveNotificationPreference[]> {
  await ensureFile();

  const raw =
    await fs.readFile(
      FILE_PATH,
      "utf-8",
    );

  if (!raw.trim()) {
    return [];
  }

  const parsed: unknown =
    JSON.parse(raw);

  if (!Array.isArray(parsed)) {
    throw new Error(
      "LIVE_NOTIFICATION_PREFERENCE_INVALID_FORMAT",
    );
  }

  return parsed as
    LiveNotificationPreference[];
}

async function writeUnsafe(
  items:
    LiveNotificationPreference[],
) {
  await ensureFile();

  const tempPath =
    `${FILE_PATH}.tmp`;

  await fs.writeFile(
    tempPath,
    JSON.stringify(
      items,
      null,
      2,
    ),
    "utf-8",
  );

  await fs.rename(
    tempPath,
    FILE_PATH,
  );
}

function serializeWrite<T>(
  work: () => Promise<T>,
): Promise<T> {
  const result =
    writeQueue.then(
      work,
    );

  writeQueue =
    result
      .then(() => undefined)
      .catch(() => undefined);

  return result;
}

export async function isLiveNotificationEnabled(
  userId: string,
  streamerUserId: string,
) {
  const items =
    await readUnsafe();

  return (
    items.find(
      (item) =>
        item.userId === userId &&
        item.streamerUserId ===
          streamerUserId,
    )?.enabled ?? false
  );
}

export async function listLiveNotificationPreferences(
  userId: string,
) {
  const items =
    await readUnsafe();

  return items.filter(
    (item) =>
      item.userId === userId,
  );
}

export async function setLiveNotificationPreference(
  userId: string,
  streamerUserId: string,
  enabled: boolean,
) {
  return serializeWrite(
    async () => {
      const items =
        await readUnsafe();

      const index =
        items.findIndex(
          (item) =>
            item.userId === userId &&
            item.streamerUserId ===
              streamerUserId,
        );

      const next:
        LiveNotificationPreference = {
        userId,
        streamerUserId,
        enabled,
        updatedAt:
          new Date().toISOString(),
      };

      if (index >= 0) {
        items[index] =
          next;
      } else {
        items.push(
          next,
        );
      }

      await writeUnsafe(
        items,
      );

      return next;
    },
  );
}

export async function listEnabledUsersForStreamer(
  streamerUserId: string,
) {
  const items =
    await readUnsafe();

  return items
    .filter(
      (item) =>
        item.streamerUserId ===
          streamerUserId &&
        item.enabled,
    )
    .map(
      (item) =>
        item.userId,
    );
}
