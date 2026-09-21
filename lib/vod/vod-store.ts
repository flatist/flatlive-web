import fs from "node:fs/promises";
import path from "node:path";

export type VodVisibility =
  | "public"
  | "followers"
  | "private";

export type VodItem = {
  id: string;
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  title: string;
  description: string;
  visibility: VodVisibility;
  isAdult: boolean;
  videoUrl: string;
  thumbnailUrl?: string;
  originalFileName: string;
  createdAt: string;
  views: number;
  likes: number;
  greats: number;
  bests: number;
  comments: number;
};

const DATA_FILE = path.join(
  process.cwd(),
  "data",
  "vods.json",
);

export async function readVods(): Promise<VodItem[]> {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf8");
    const data = JSON.parse(raw);

    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

let vodWriteQueue: Promise<void> =
  Promise.resolve();

export async function incrementVodViews(
  vodId: string,
): Promise<VodItem | null> {
  let updatedVod: VodItem | null =
    null;

  const task =
    vodWriteQueue.then(
      async () => {
        const vods =
          await readVods();

        const index =
          vods.findIndex(
            (item) =>
              item.id === vodId,
          );

        if (index < 0) {
          updatedVod = null;
          return;
        }

        const currentViews =
          Number.isSafeInteger(
            vods[index].views,
          ) &&
          vods[index].views >= 0
            ? vods[index].views
            : 0;

        const nextVod: VodItem = {
          ...vods[index],
          views:
            currentViews + 1,
        };

        vods[index] =
          nextVod;

        await fs.mkdir(
          path.dirname(DATA_FILE),
          {
            recursive: true,
          },
        );

        await fs.writeFile(
          DATA_FILE,
          JSON.stringify(
            vods,
            null,
            2,
          ),
          "utf8",
        );

        updatedVod =
          nextVod;
      },
    );

  vodWriteQueue =
    task.then(
      () => undefined,
      () => undefined,
    );

  await task;

  return updatedVod;
}

export async function addVod(
  vod: Omit<
    VodItem,
    | "createdAt"
    | "views"
    | "likes"
    | "greats"
    | "bests"
    | "comments"
  >,
): Promise<VodItem> {
  const vods = await readVods();

  const item: VodItem = {
    ...vod,
    createdAt: new Date().toISOString(),
    views: 0,
    likes: 0,
    greats: 0,
    bests: 0,
    comments: 0,
  };

  vods.unshift(item);

  await fs.mkdir(path.dirname(DATA_FILE), {
    recursive: true,
  });

  await fs.writeFile(
    DATA_FILE,
    JSON.stringify(vods, null, 2),
    "utf8",
  );

  return item;
}
export async function incrementVodLike(
  vodId: string,
): Promise<VodItem | null> {
  let updated: VodItem | null = null;

  const task = vodWriteQueue.then(
    async () => {
      const vods = await readVods();

      const index = vods.findIndex(
        (item) => item.id === vodId,
      );

      if (index < 0) {
        updated = null;
        return;
      }

      const item = vods[index];

      const currentLikes =
        Number.isSafeInteger(item.likes) &&
        item.likes >= 0
          ? item.likes
          : 0;

      const next = {
        ...item,
        likes: currentLikes + 1,
      };

      vods[index] = next;

      await fs.writeFile(
        DATA_FILE,
        JSON.stringify(vods, null, 2),
        "utf8",
      );

      updated = next;
    },
  );

  vodWriteQueue = task.then(
    () => undefined,
    () => undefined,
  );

  await task;

  return updated;
}

export async function decrementVodLike(
  vodId: string,
): Promise<VodItem | null> {
  let updated: VodItem | null = null;

  const task = vodWriteQueue.then(
    async () => {
      const vods = await readVods();

      const index = vods.findIndex(
        (item) => item.id === vodId,
      );

      if (index < 0) {
        updated = null;
        return;
      }

      const item = vods[index];

      const currentLikes =
        Number.isSafeInteger(item.likes) &&
        item.likes >= 0
          ? item.likes
          : 0;

      const next: VodItem = {
        ...item,
        likes: Math.max(
          0,
          currentLikes - 1,
        ),
      };

      vods[index] = next;

      await fs.writeFile(
        DATA_FILE,
        JSON.stringify(
          vods,
          null,
          2,
        ),
        "utf8",
      );

      updated = next;
    },
  );

  vodWriteQueue = task.then(
    () => undefined,
    () => undefined,
  );

  await task;

  return updated;
}

export async function incrementVodGreat(
  vodId: string,
): Promise<VodItem | null> {
  let updated: VodItem | null = null;

  const task = vodWriteQueue.then(
    async () => {
      const vods = await readVods();

      const index = vods.findIndex(
        (item) => item.id === vodId,
      );

      if (index < 0) {
        updated = null;
        return;
      }

      const item = vods[index];

      const currentGreats =
        Number.isSafeInteger(item.greats) &&
        item.greats >= 0
          ? item.greats
          : 0;

      const nextGreats =
        currentGreats + 1;

      if (
        !Number.isSafeInteger(
          nextGreats,
        )
      ) {
        throw new Error(
          "VOD_GREAT_OVERFLOW",
        );
      }

      const next: VodItem = {
        ...item,
        greats: nextGreats,
      };

      vods[index] = next;

      await fs.writeFile(
        DATA_FILE,
        JSON.stringify(
          vods,
          null,
          2,
        ),
        "utf8",
      );

      updated = next;
    },
  );

  vodWriteQueue = task.then(
    () => undefined,
    () => undefined,
  );

  await task;

  return updated;
}


export async function incrementVodBest(
  vodId: string,
): Promise<VodItem | null> {
  let updated: VodItem | null = null;

  const task = vodWriteQueue.then(
    async () => {
      const vods = await readVods();

      const index = vods.findIndex(
        (item) => item.id === vodId,
      );

      if (index < 0) {
        updated = null;
        return;
      }

      const item = vods[index];

      const currentBests =
        Number.isSafeInteger(item.bests) &&
        item.bests >= 0
          ? item.bests
          : 0;

      const nextBests =
        currentBests + 1;

      if (
        !Number.isSafeInteger(nextBests)
      ) {
        throw new Error(
          "VOD_BEST_OVERFLOW",
        );
      }

      const next: VodItem = {
        ...item,
        bests: nextBests,
      };

      vods[index] = next;

      await fs.writeFile(
        DATA_FILE,
        JSON.stringify(
          vods,
          null,
          2,
        ),
        "utf8",
      );

      updated = next;
    },
  );

  vodWriteQueue = task.then(
    () => undefined,
    () => undefined,
  );

  await task;

  return updated;
}

export async function deleteVodByOwner(
  vodId: string,
  ownerUserId: string,
): Promise<VodItem | null> {
  let deleted: VodItem | null = null;

  const task =
    vodWriteQueue.then(
      async () => {
        const vods =
          await readVods();

        const index =
          vods.findIndex(
            (item) =>
              item.id === vodId,
          );

        if (index < 0) {
          return;
        }

        const item =
          vods[index];

        if (
          item.userId !==
          ownerUserId
        ) {
          throw new Error(
            "VOD_DELETE_FORBIDDEN",
          );
        }

        deleted = item;

        vods.splice(
          index,
          1,
        );

        await fs.mkdir(
          path.dirname(
            DATA_FILE,
          ),
          {
            recursive: true,
          },
        );

        await fs.writeFile(
          DATA_FILE,
          JSON.stringify(
            vods,
            null,
            2,
          ),
          "utf8",
        );
      },
    );

  vodWriteQueue =
    task.then(
      () => undefined,
      () => undefined,
    );

  await task;

  return deleted;
}


export async function setVodCommentCount(
  vodId: string,
  count: number,
): Promise<VodItem | null> {
  let updated:
    VodItem | null =
    null;

  const safeCount =
    Number.isSafeInteger(count) &&
    count >= 0
      ? count
      : 0;

  const task =
    vodWriteQueue.then(
      async () => {
        const vods =
          await readVods();

        const index =
          vods.findIndex(
            (item) =>
              item.id === vodId,
          );

        if (index < 0) {
          updated = null;
          return;
        }

        const next: VodItem = {
          ...vods[index],
          comments:
            safeCount,
        };

        vods[index] =
          next;

        await fs.mkdir(
          path.dirname(DATA_FILE),
          {
            recursive: true,
          },
        );

        await fs.writeFile(
          DATA_FILE,
          JSON.stringify(
            vods,
            null,
            2,
          ),
          "utf8",
        );

        updated =
          next;
      },
    );

  vodWriteQueue =
    task.then(
      () => undefined,
      () => undefined,
    );

  await task;

  return updated;
}
