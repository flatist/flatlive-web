import fs from "fs/promises";
import path from "path";

export type LikeContentType =
  | "FLIT"
  | "VOD";

export type LikeRecord = {
  id: string;
  userId: string;
  contentType: LikeContentType;
  contentId: string;
  createdAt: string;
};

const FILE_PATH = path.join(
  process.cwd(),
  "data",
  "content-likes.json",
);

let likeWriteQueue: Promise<void> =
  Promise.resolve();

async function readLikes(): Promise<LikeRecord[]> {
  try {
    const raw = await fs.readFile(
      FILE_PATH,
      "utf8",
    );

    const parsed = JSON.parse(raw);

    return Array.isArray(parsed)
      ? parsed
      : [];
  } catch {
    return [];
  }
}

export async function hasUserLiked(
  userId: string,
  contentType: LikeContentType,
  contentId: string,
): Promise<boolean> {
  const likes = await readLikes();

  return likes.some(
    (item) =>
      item.userId === userId &&
      item.contentType === contentType &&
      item.contentId === contentId,
  );
}

export async function createLikeOnce(
  input: {
    userId: string;
    contentType: LikeContentType;
    contentId: string;
  },
): Promise<{
  created: boolean;
  record: LikeRecord | null;
}> {
  let result: {
    created: boolean;
    record: LikeRecord | null;
  } = {
    created: false,
    record: null,
  };

  const task = likeWriteQueue.then(
    async () => {
      const likes = await readLikes();

      const exists = likes.some(
        (item) =>
          item.userId === input.userId &&
          item.contentType === input.contentType &&
          item.contentId === input.contentId,
      );

      if (exists) {
        result = {
          created: false,
          record: null,
        };
        return;
      }

      const record: LikeRecord = {
        id:
          `like_${Date.now()}_${crypto.randomUUID()}`,
        userId: input.userId,
        contentType: input.contentType,
        contentId: input.contentId,
        createdAt: new Date().toISOString(),
      };

      likes.push(record);

      await fs.mkdir(
        path.dirname(FILE_PATH),
        { recursive: true },
      );

      await fs.writeFile(
        FILE_PATH,
        JSON.stringify(
          likes,
          null,
          2,
        ),
        "utf8",
      );

      result = {
        created: true,
        record,
      };
    },
  );

  likeWriteQueue = task.then(
    () => undefined,
    () => undefined,
  );

  await task;

  return result;
}
export async function removeLikeRecord(
  recordId: string,
): Promise<boolean> {
  let removed = false;

  const task = likeWriteQueue.then(
    async () => {
      const likes = await readLikes();

      const next = likes.filter(
        (item) => item.id !== recordId,
      );

      if (next.length === likes.length) {
        removed = false;
        return;
      }

      await fs.mkdir(
        path.dirname(FILE_PATH),
        { recursive: true },
      );

      await fs.writeFile(
        FILE_PATH,
        JSON.stringify(next, null, 2),
        "utf8",
      );

      removed = true;
    },
  );

  likeWriteQueue = task.then(
    () => undefined,
    () => undefined,
  );

  await task;

  return removed;
}

export async function toggleLikeRecord(
  input: {
    userId: string;
    contentType: LikeContentType;
    contentId: string;
  },
): Promise<{
  liked: boolean;
}> {
  let result = {
    liked: false,
  };

  const task = likeWriteQueue.then(
    async () => {
      const likes = await readLikes();

      const index = likes.findIndex(
        (item) =>
          item.userId === input.userId &&
          item.contentType ===
            input.contentType &&
          item.contentId ===
            input.contentId,
      );

      if (index >= 0) {
        likes.splice(index, 1);

        result = {
          liked: false,
        };
      } else {
        likes.push({
          id:
            `like_${Date.now()}_${crypto.randomUUID()}`,
          userId:
            input.userId,
          contentType:
            input.contentType,
          contentId:
            input.contentId,
          createdAt:
            new Date().toISOString(),
        });

        result = {
          liked: true,
        };
      }

      await fs.mkdir(
        path.dirname(FILE_PATH),
        {
          recursive: true,
        },
      );

      await fs.writeFile(
        FILE_PATH,
        JSON.stringify(
          likes,
          null,
          2,
        ),
        "utf8",
      );
    },
  );

  likeWriteQueue = task.then(
    () => undefined,
    () => undefined,
  );

  await task;

  return result;
}


export async function deleteLikesForContent(
  contentType: LikeContentType,
  contentId: string,
): Promise<number> {
  let removedCount = 0;

  const task =
    likeWriteQueue.then(
      async () => {
        const likes =
          await readLikes();

        const next =
          likes.filter(
            (item) => {
              const matched =
                item.contentType ===
                  contentType &&
                item.contentId ===
                  contentId;

              if (matched) {
                removedCount += 1;
              }

              return !matched;
            },
          );

        if (
          removedCount === 0
        ) {
          return;
        }

        await fs.mkdir(
          path.dirname(
            FILE_PATH,
          ),
          {
            recursive: true,
          },
        );

        await fs.writeFile(
          FILE_PATH,
          JSON.stringify(
            next,
            null,
            2,
          ),
          "utf8",
        );
      },
    );

  likeWriteQueue =
    task.then(
      () => undefined,
      () => undefined,
    );

  await task;

  return removedCount;
}
