import fs from "node:fs/promises";
import path from "node:path";

export type UserBlockRecord = {
  userId: string;
  targetUserId: string;
  createdAt: string;
};

const DATA_DIR =
  path.join(
    process.cwd(),
    "data",
  );

const DATA_FILE =
  path.join(
    DATA_DIR,
    "user-blocks.json",
  );

async function ensureStore() {
  await fs.mkdir(
    DATA_DIR,
    {
      recursive: true,
    },
  );

  try {
    await fs.access(
      DATA_FILE,
    );
  } catch {
    await fs.writeFile(
      DATA_FILE,
      "[]",
      "utf8",
    );
  }
}

async function readRecords() {
  await ensureStore();

  try {
    const raw =
      await fs.readFile(
        DATA_FILE,
        "utf8",
      );

    const parsed =
      JSON.parse(raw);

    return Array.isArray(parsed)
      ? parsed as UserBlockRecord[]
      : [];
  } catch {
    return [];
  }
}

async function writeRecords(
  records: UserBlockRecord[],
) {
  await ensureStore();

  await fs.writeFile(
    DATA_FILE,
    JSON.stringify(
      records,
      null,
      2,
    ),
    "utf8",
  );
}

export async function readBlockedUserIds(
  userId: string,
) {
  const records =
    await readRecords();

  return records
    .filter(
      (item) =>
        item.userId ===
        userId,
    )
    .map(
      (item) =>
        item.targetUserId,
    );
}

export async function setUserBlocked({
  userId,
  targetUserId,
  blocked,
}: {
  userId: string;
  targetUserId: string;
  blocked: boolean;
}) {
  const records =
    await readRecords();

  const exists =
    records.some(
      (item) =>
        item.userId === userId &&
        item.targetUserId ===
          targetUserId,
    );

  if (blocked && !exists) {
    records.push({
      userId,
      targetUserId,
      createdAt:
        new Date()
          .toISOString(),
    });

    await writeRecords(
      records,
    );
  }

  if (!blocked && exists) {
    await writeRecords(
      records.filter(
        (item) =>
          !(
            item.userId ===
              userId &&
            item.targetUserId ===
              targetUserId
          ),
      ),
    );
  }

  return {
    targetUserId,
    blocked,
  };
}
