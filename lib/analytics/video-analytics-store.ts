import fs from "node:fs/promises";
import path from "node:path";

export type VideoAnalyticsContentType =
  | "FLIT"
  | "VOD";

export type VideoAnalyticsEventType =
  | "PLAY"
  | "PAUSE"
  | "PROGRESS"
  | "SEEK"
  | "COMPLETE";

export type VideoAnalyticsSession = {
  key: string;

  contentType:
    VideoAnalyticsContentType;

  contentId: string;

  viewerSessionId: string;

  viewerUserId:
    string | null;

  source: string;

  durationSeconds: number;

  watchedSeconds: number;

  maxPositionSeconds: number;

  lastPositionSeconds: number;

  reachedBuckets: number[];

  playCount: number;
  pauseCount: number;
  seekCount: number;

  completed: boolean;

  createdAt: string;
  updatedAt: string;
};

export type RecordVideoAnalyticsInput = {
  contentType:
    VideoAnalyticsContentType;

  contentId: string;

  viewerSessionId: string;

  viewerUserId?:
    string | null;

  source?: string;

  eventType:
    VideoAnalyticsEventType;

  currentTime:
    number;

  duration:
    number;

  watchedDelta?: number;
};

const DATA_DIR =
  path.join(
    process.cwd(),
    "data",
  );

const DATA_FILE =
  path.join(
    DATA_DIR,
    "video-analytics.json",
  );

let writeQueue:
  Promise<void> =
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

async function readUnsafe():
  Promise<
    VideoAnalyticsSession[]
  > {
  await ensureFile();

  const raw =
    await fs.readFile(
      DATA_FILE,
      "utf8",
    );

  if (!raw.trim()) {
    return [];
  }

  const parsed: unknown =
    JSON.parse(raw);

  if (!Array.isArray(parsed)) {
    throw new Error(
      "VIDEO_ANALYTICS_INVALID_FORMAT",
    );
  }

  return parsed as
    VideoAnalyticsSession[];
}

async function writeUnsafe(
  records:
    VideoAnalyticsSession[],
) {
  await ensureFile();

  const tempFile =
    `${DATA_FILE}.tmp`;

  await fs.writeFile(
    tempFile,
    JSON.stringify(
      records,
      null,
      2,
    ),
    "utf8",
  );

  await fs.rename(
    tempFile,
    DATA_FILE,
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
      .then(
        () => undefined,
      )
      .catch(
        () => undefined,
      );

  return result;
}

function safeSeconds(
  value: number,
) {
  if (
    !Number.isFinite(value)
  ) {
    return 0;
  }

  return Math.max(
    0,
    value,
  );
}

function makeBuckets(
  currentTime: number,
  duration: number,
) {
  const current =
    safeSeconds(
      currentTime,
    );

  const safeDuration =
    safeSeconds(
      duration,
    );

  if (
    safeDuration <= 0
  ) {
    return [];
  }

  const maxBucket =
    Math.floor(
      Math.min(
        current,
        safeDuration,
      ) / 5,
    ) * 5;

  const buckets:
    number[] = [];

  for (
    let second = 0;
    second <= maxBucket;
    second += 5
  ) {
    buckets.push(
      second,
    );
  }

  return buckets;
}

export async function recordVideoAnalytics(
  input:
    RecordVideoAnalyticsInput,
) {
  return serializeWrite(
    async () => {
      const records =
        await readUnsafe();

      const contentId =
        input.contentId.trim();

      const viewerSessionId =
        input.viewerSessionId.trim();

      if (
        !contentId ||
        !viewerSessionId
      ) {
        throw new Error(
          "VIDEO_ANALYTICS_IDENTIFIER_REQUIRED",
        );
      }

      const key =
        `${input.contentType}:${contentId}:${viewerSessionId}`;

      const index =
        records.findIndex(
          (item) =>
            item.key === key,
        );

      const now =
        new Date()
          .toISOString();

      const currentTime =
        safeSeconds(
          input.currentTime,
        );

      const duration =
        safeSeconds(
          input.duration,
        );

      const watchedDelta =
        Math.min(
          5,
          safeSeconds(
            input.watchedDelta ??
              0,
          ),
        );

      const reachedNow =
        makeBuckets(
          currentTime,
          duration,
        );

      if (index < 0) {
        const record:
          VideoAnalyticsSession = {
          key,

          contentType:
            input.contentType,

          contentId,

          viewerSessionId,

          viewerUserId:
            input.viewerUserId ??
            null,

          source:
            input.source?.trim() ||
            "UNKNOWN",

          durationSeconds:
            duration,

          watchedSeconds:
            watchedDelta,

          maxPositionSeconds:
            currentTime,

          lastPositionSeconds:
            currentTime,

          reachedBuckets:
            reachedNow,

          playCount:
            input.eventType ===
            "PLAY"
              ? 1
              : 0,

          pauseCount:
            input.eventType ===
            "PAUSE"
              ? 1
              : 0,

          seekCount:
            input.eventType ===
            "SEEK"
              ? 1
              : 0,

          completed:
            input.eventType ===
            "COMPLETE",

          createdAt:
            now,

          updatedAt:
            now,
        };

        records.push(
          record,
        );

        await writeUnsafe(
          records,
        );

        return record;
      }

      const current =
        records[index];

      const reachedBuckets =
        Array.from(
          new Set([
            ...current.reachedBuckets,
            ...reachedNow,
          ]),
        ).sort(
          (a, b) =>
            a - b,
        );

      const updated:
        VideoAnalyticsSession = {
        ...current,

        viewerUserId:
          current.viewerUserId ??
          input.viewerUserId ??
          null,

        source:
          current.source !==
          "UNKNOWN"
            ? current.source
            : input.source?.trim() ||
              "UNKNOWN",

        durationSeconds:
          Math.max(
            current.durationSeconds,
            duration,
          ),

        watchedSeconds:
          current.watchedSeconds +
          watchedDelta,

        maxPositionSeconds:
          Math.max(
            current.maxPositionSeconds,
            currentTime,
          ),

        lastPositionSeconds:
          currentTime,

        reachedBuckets,

        playCount:
          current.playCount +
          (
            input.eventType ===
            "PLAY"
              ? 1
              : 0
          ),

        pauseCount:
          current.pauseCount +
          (
            input.eventType ===
            "PAUSE"
              ? 1
              : 0
          ),

        seekCount:
          current.seekCount +
          (
            input.eventType ===
            "SEEK"
              ? 1
              : 0
          ),

        completed:
          current.completed ||
          input.eventType ===
            "COMPLETE",

        updatedAt:
          now,
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

export async function readVideoAnalyticsByContent(
  contentType:
    VideoAnalyticsContentType,
  contentId: string,
) {
  const records =
    await readUnsafe();

  return records.filter(
    (item) =>
      item.contentType ===
        contentType &&
      item.contentId ===
        contentId,
  );
}

export async function readAllVideoAnalytics() {
  return readUnsafe();
}
