import fs from "node:fs/promises";
import path from "node:path";

export type LiveAnalyticsRecord = {
  roomId: string;

  broadcasterUserId: string;

  title: string;
  category: string;

  startedAt: number;
  endedAt: number | null;

  durationMs: number;

  peakConcurrentViewers: number;

  totalUniqueViewers: number;

  /**
   * 방송 중 중복 입장 계산용 내부 값입니다.
   * 화면/API에는 그대로 노출하지 않습니다.
   */
  viewerIds: string[];

  createdAt: string;
  updatedAt: string;
};

type StartLiveAnalyticsInput = {
  roomId: string;

  broadcasterUserId: string;

  title: string;
  category: string;

  startedAt: number;
};

const DATA_DIR = path.join(
  process.cwd(),
  "data",
);

const ANALYTICS_FILE = path.join(
  DATA_DIR,
  "live-analytics.json",
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
      ANALYTICS_FILE,
    );
  } catch {
    await fs.writeFile(
      ANALYTICS_FILE,
      "[]",
      "utf-8",
    );
  }
}

async function readUnsafe(): Promise<
  LiveAnalyticsRecord[]
> {
  await ensureFile();

  const raw =
    await fs.readFile(
      ANALYTICS_FILE,
      "utf-8",
    );

  if (!raw.trim()) {
    return [];
  }

  const parsed: unknown =
    JSON.parse(raw);

  if (!Array.isArray(parsed)) {
    throw new Error(
      "LIVE_ANALYTICS_INVALID_FORMAT",
    );
  }

  return parsed as LiveAnalyticsRecord[];
}

async function writeUnsafe(
  records: LiveAnalyticsRecord[],
) {
  await ensureFile();

  const tempFile =
    `${ANALYTICS_FILE}.tmp`;

  await fs.writeFile(
    tempFile,
    JSON.stringify(
      records,
      null,
      2,
    ),
    "utf-8",
  );

  await fs.rename(
    tempFile,
    ANALYTICS_FILE,
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

export async function startLiveAnalytics(
  input: StartLiveAnalyticsInput,
) {
  return serializeWrite(
    async () => {
      const records =
        await readUnsafe();

      const existing =
        records.find(
          (item) =>
            item.roomId ===
            input.roomId,
        );

      if (existing) {
        return existing;
      }

      const now =
        new Date().toISOString();

      const record:
        LiveAnalyticsRecord = {
        roomId:
          input.roomId,

        broadcasterUserId:
          input.broadcasterUserId,

        title:
          input.title.trim() ||
          "제목 없는 LIVE",

        category:
          input.category.trim() ||
          "기타",

        startedAt:
          input.startedAt,

        endedAt:
          null,

        durationMs:
          0,

        peakConcurrentViewers:
          0,

        totalUniqueViewers:
          0,

        viewerIds:
          [],

        createdAt:
          now,

        updatedAt:
          now,
      };

      records.unshift(
        record,
      );

      await writeUnsafe(
        records,
      );

      return record;
    },
  );
}

export async function recordLiveViewer(
  roomId: string,
  viewerId: string,
  currentViewerCount: number,
) {
  return serializeWrite(
    async () => {
      const records =
        await readUnsafe();

      const index =
        records.findIndex(
          (item) =>
            item.roomId ===
            roomId,
        );

      if (index < 0) {
        return null;
      }

      const current =
        records[index];

      const normalizedViewerId =
        viewerId.trim();

      const viewerIds =
        normalizedViewerId &&
        !current.viewerIds.includes(
          normalizedViewerId,
        )
          ? [
              ...current.viewerIds,
              normalizedViewerId,
            ]
          : current.viewerIds;

      const nextViewerCount =
        Number.isFinite(
          currentViewerCount,
        )
          ? Math.max(
              0,
              Math.floor(
                currentViewerCount,
              ),
            )
          : 0;

      const updated:
        LiveAnalyticsRecord = {
        ...current,

        viewerIds,

        totalUniqueViewers:
          viewerIds.length,

        peakConcurrentViewers:
          Math.max(
            current.peakConcurrentViewers,
            nextViewerCount,
          ),

        updatedAt:
          new Date().toISOString(),
      };

      records[index] =
        updated;

      await writeUnsafe(
        records,
      );

      return updated;
    },
  );
}

export async function finishLiveAnalytics(
  roomId: string,
  endedAt = Date.now(),
) {
  return serializeWrite(
    async () => {
      const records =
        await readUnsafe();

      const index =
        records.findIndex(
          (item) =>
            item.roomId ===
            roomId,
        );

      if (index < 0) {
        return null;
      }

      const current =
        records[index];

      if (
        current.endedAt !==
        null
      ) {
        return current;
      }

      const safeEndedAt =
        Math.max(
          endedAt,
          current.startedAt,
        );

      const updated:
        LiveAnalyticsRecord = {
        ...current,

        endedAt:
          safeEndedAt,

        durationMs:
          safeEndedAt -
          current.startedAt,

        updatedAt:
          new Date().toISOString(),
      };

      records[index] =
        updated;

      await writeUnsafe(
        records,
      );

      return updated;
    },
  );
}

export async function readLiveAnalyticsByBroadcaster(
  broadcasterUserId: string,
) {
  const records =
    await readUnsafe();

  return records.filter(
    (item) =>
      item.broadcasterUserId ===
      broadcasterUserId,
  );
}

export async function readLiveAnalyticsByRoom(
  roomId: string,
) {
  const records =
    await readUnsafe();

  return (
    records.find(
      (item) =>
        item.roomId ===
        roomId,
    ) ?? null
  );
}
