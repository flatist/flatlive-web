import fs from "node:fs/promises";
import path from "node:path";

export type FlitVisibility =
  | "public"
  | "followers"
  | "private";

export type FlitItem = {
  id: string;
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  title: string;
  description: string;
  visibility: FlitVisibility;
  isAdult: boolean;
  videoUrl: string;
  originalFileName: string;
  createdAt: string;

  views: number;
  likes: number;
  greats: number;
  bests: number;
  comments: number;
};

const DATA_DIR =
  path.join(process.cwd(), "data");

const DATA_FILE =
  path.join(DATA_DIR, "flits.json");

async function ensureStore() {
  await fs.mkdir(DATA_DIR, {
    recursive: true,
  });

  try {
    await fs.access(DATA_FILE);
  } catch {
    await fs.writeFile(
      DATA_FILE,
      "[]",
      "utf8",
    );
  }
}

export async function readFlits() {
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
      ? parsed.map(
          (item) => ({
            ...(item as FlitItem),
            isAdult:
              (item as FlitItem).isAdult === true,
            views:
              Number.isSafeInteger(
                (item as FlitItem).views,
              ) &&
              (item as FlitItem).views >= 0
                ? (item as FlitItem).views
                : 0,
          }),
        )
      : [];
  } catch {
    return [];
  }
}

export async function addFlit(
  flit: FlitItem,
) {
  const current =
    await readFlits();

  current.unshift(flit);

  await fs.writeFile(
    DATA_FILE,
    JSON.stringify(
      current,
      null,
      2,
    ),
    "utf8",
  );

  return flit;
}

let flitViewWriteQueue =
  Promise.resolve();

export async function incrementFlitViews(
  flitId: string,
) {
  const operation =
    flitViewWriteQueue.then(
      async () => {
        const current =
          await readFlits();

        const index =
          current.findIndex(
            (item) =>
              item.id === flitId,
          );

        if (index < 0) {
          throw new Error(
            "FLIT_NOT_FOUND",
          );
        }

        const flit =
          current[index];

        if (
          flit.visibility !==
          "public"
        ) {
          throw new Error(
            "FLIT_NOT_PUBLIC",
          );
        }

        const nextViews =
          flit.views + 1;

        if (
          !Number.isSafeInteger(
            nextViews,
          )
        ) {
          throw new Error(
            "FLIT_VIEW_OVERFLOW",
          );
        }

        const updated: FlitItem = {
          ...flit,
          views: nextViews,
        };

        current[index] =
          updated;

        await fs.writeFile(
          DATA_FILE,
          JSON.stringify(
            current,
            null,
            2,
          ),
          "utf8",
        );

        return updated;
      },
    );

  flitViewWriteQueue =
    operation.then(
      () => undefined,
      () => undefined,
    );

  return operation;
}
export async function incrementFlitLike(
  flitId: string,
): Promise<FlitItem | null> {
  let updated: FlitItem | null = null;

  const task = flitViewWriteQueue.then(
    async () => {
      const flits = await readFlits();

      const index = flits.findIndex(
        (item) => item.id === flitId,
      );

      if (index < 0) {
        updated = null;
        return;
      }

      const item = flits[index];

      const currentLikes =
        Number.isSafeInteger(item.likes) &&
        item.likes >= 0
          ? item.likes
          : 0;

      const next = {
        ...item,
        likes: currentLikes + 1,
      };

      flits[index] = next;

      await fs.writeFile(
        DATA_FILE,
        JSON.stringify(flits, null, 2),
        "utf8",
      );

      updated = next;
    },
  );

  flitViewWriteQueue = task.then(
    () => undefined,
    () => undefined,
  );

  await task;

  return updated;
}

export async function decrementFlitLike(
  flitId: string,
): Promise<FlitItem | null> {
  let updated: FlitItem | null = null;

  const task = flitViewWriteQueue.then(
    async () => {
      const flits = await readFlits();

      const index = flits.findIndex(
        (item) => item.id === flitId,
      );

      if (index < 0) {
        updated = null;
        return;
      }

      const item = flits[index];

      const currentLikes =
        Number.isSafeInteger(item.likes) &&
        item.likes >= 0
          ? item.likes
          : 0;

      const next: FlitItem = {
        ...item,
        likes: Math.max(
          0,
          currentLikes - 1,
        ),
      };

      flits[index] = next;

      await fs.writeFile(
        DATA_FILE,
        JSON.stringify(
          flits,
          null,
          2,
        ),
        "utf8",
      );

      updated = next;
    },
  );

  flitViewWriteQueue = task.then(
    () => undefined,
    () => undefined,
  );

  await task;

  return updated;
}

export async function incrementFlitGreat(
  flitId: string,
): Promise<FlitItem | null> {
  let updated: FlitItem | null = null;

  const task = flitViewWriteQueue.then(
    async () => {
      const flits = await readFlits();

      const index = flits.findIndex(
        (item) => item.id === flitId,
      );

      if (index < 0) {
        updated = null;
        return;
      }

      const item = flits[index];

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
          "FLIT_GREAT_OVERFLOW",
        );
      }

      const next: FlitItem = {
        ...item,
        greats: nextGreats,
      };

      flits[index] = next;

      await fs.writeFile(
        DATA_FILE,
        JSON.stringify(
          flits,
          null,
          2,
        ),
        "utf8",
      );

      updated = next;
    },
  );

  flitViewWriteQueue = task.then(
    () => undefined,
    () => undefined,
  );

  await task;

  return updated;
}


export async function incrementFlitBest(
  flitId: string,
): Promise<FlitItem | null> {
  let updated: FlitItem | null = null;

  const task = flitViewWriteQueue.then(
    async () => {
      const flits = await readFlits();

      const index = flits.findIndex(
        (item) => item.id === flitId,
      );

      if (index < 0) {
        updated = null;
        return;
      }

      const item = flits[index];

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
          "FLIT_BEST_OVERFLOW",
        );
      }

      const next: FlitItem = {
        ...item,
        bests: nextBests,
      };

      flits[index] = next;

      await fs.writeFile(
        DATA_FILE,
        JSON.stringify(
          flits,
          null,
          2,
        ),
        "utf8",
      );

      updated = next;
    },
  );

  flitViewWriteQueue = task.then(
    () => undefined,
    () => undefined,
  );

  await task;

  return updated;
}

export async function deleteFlitByOwner(
  flitId: string,
  ownerUserId: string,
): Promise<FlitItem | null> {
  let deleted: FlitItem | null = null;

  const task =
    flitViewWriteQueue.then(
      async () => {
        const flits =
          await readFlits();

        const index =
          flits.findIndex(
            (item) =>
              item.id === flitId,
          );

        if (index < 0) {
          return;
        }

        const item =
          flits[index];

        if (
          item.userId !==
          ownerUserId
        ) {
          throw new Error(
            "FLIT_DELETE_FORBIDDEN",
          );
        }

        deleted = item;

        flits.splice(
          index,
          1,
        );

        await fs.writeFile(
          DATA_FILE,
          JSON.stringify(
            flits,
            null,
            2,
          ),
          "utf8",
        );
      },
    );

  flitViewWriteQueue =
    task.then(
      () => undefined,
      () => undefined,
    );

  await task;

  return deleted;
}


export async function setFlitCommentCount(
  flitId: string,
  count: number,
): Promise<FlitItem | null> {
  const safeCount =
    Number.isSafeInteger(count) &&
    count >= 0
      ? count
      : 0;

  const operation =
    flitViewWriteQueue.then(
      async () => {
        const current =
          await readFlits();

        const index =
          current.findIndex(
            (item) =>
              item.id === flitId,
          );

        if (index < 0) {
          return null;
        }

        const updated: FlitItem = {
          ...current[index],
          comments:
            safeCount,
        };

        current[index] =
          updated;

        await fs.writeFile(
          DATA_FILE,
          JSON.stringify(
            current,
            null,
            2,
          ),
          "utf8",
        );

        return updated;
      },
    );

  flitViewWriteQueue =
    operation.then(
      () => undefined,
      () => undefined,
    );

  return operation;
}
