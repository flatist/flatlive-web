import fs from "node:fs/promises";
import path from "node:path";
import {
  randomUUID,
} from "node:crypto";

export type CommentContentType =
  | "VOD"
  | "FLIT";

export type CommentItem = {
  id: string;
  contentType:
    CommentContentType;
  contentId: string;

  userId: string;
  username: string;
  displayName: string;

  text: string;
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
    "comments.json",
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

let commentWriteQueue:
  Promise<void> =
  Promise.resolve();

export async function readComments():
  Promise<CommentItem[]> {
  await ensureStore();

  try {
    const raw =
      await fs.readFile(
        DATA_FILE,
        "utf8",
      );

    const parsed =
      JSON.parse(raw);

    if (
      !Array.isArray(parsed)
    ) {
      return [];
    }

    return parsed.filter(
      (
        item,
      ): item is CommentItem => {
        return (
          typeof item ===
            "object" &&
          item !== null &&
          typeof item.id ===
            "string" &&
          (
            item.contentType ===
              "VOD" ||
            item.contentType ===
              "FLIT"
          ) &&
          typeof item.contentId ===
            "string" &&
          typeof item.userId ===
            "string" &&
          typeof item.username ===
            "string" &&
          typeof item.displayName ===
            "string" &&
          typeof item.text ===
            "string" &&
          typeof item.createdAt ===
            "string"
        );
      },
    );
  } catch {
    return [];
  }
}

export async function getCommentsByContent(
  contentType:
    CommentContentType,
  contentId: string,
): Promise<CommentItem[]> {
  const comments =
    await readComments();

  return comments
    .filter(
      (item) =>
        item.contentType ===
          contentType &&
        item.contentId ===
          contentId,
    )
    .sort(
      (a, b) =>
        new Date(
          a.createdAt,
        ).getTime() -
        new Date(
          b.createdAt,
        ).getTime(),
    );
}

type AddCommentInput = {
  contentType:
    CommentContentType;
  contentId: string;

  userId: string;
  username: string;
  displayName: string;

  text: string;
};

export async function addComment(
  input: AddCommentInput,
): Promise<CommentItem> {
  let created:
    CommentItem | null =
    null;

  const operation =
    commentWriteQueue.then(
      async () => {
        const comments =
          await readComments();

        const item:
          CommentItem = {
          id:
            `comment_${randomUUID()}`,

          contentType:
            input.contentType,

          contentId:
            input.contentId,

          userId:
            input.userId,

          username:
            input.username,

          displayName:
            input.displayName,

          text:
            input.text,

          createdAt:
            new Date()
              .toISOString(),
        };

        comments.push(
          item,
        );

        await fs.writeFile(
          DATA_FILE,
          JSON.stringify(
            comments,
            null,
            2,
          ),
          "utf8",
        );

        created =
          item;
      },
    );

  commentWriteQueue =
    operation.then(
      () => undefined,
      () => undefined,
    );

  await operation;

  if (!created) {
    throw new Error(
      "COMMENT_CREATE_FAILED",
    );
  }

  return created;
}

export async function deleteCommentByOwner(
  commentId: string,
  userId: string,
): Promise<
  | {
      success: true;
      comment: CommentItem;
    }
  | {
      success: false;
      reason:
        | "NOT_FOUND"
        | "FORBIDDEN";
    }
> {
  let result:
    | {
        success: true;
        comment: CommentItem;
      }
    | {
        success: false;
        reason:
          | "NOT_FOUND"
          | "FORBIDDEN";
      } = {
        success: false,
        reason: "NOT_FOUND",
      };

  const operation =
    commentWriteQueue.then(
      async () => {
        const comments =
          await readComments();

        const index =
          comments.findIndex(
            (item) =>
              item.id ===
              commentId,
          );

        if (index < 0) {
          result = {
            success: false,
            reason:
              "NOT_FOUND",
          };

          return;
        }

        const comment =
          comments[index];

        if (
          comment.userId !==
          userId
        ) {
          result = {
            success: false,
            reason:
              "FORBIDDEN",
          };

          return;
        }

        comments.splice(
          index,
          1,
        );

        await fs.writeFile(
          DATA_FILE,
          JSON.stringify(
            comments,
            null,
            2,
          ),
          "utf8",
        );

        result = {
          success: true,
          comment,
        };
      },
    );

  commentWriteQueue =
    operation.then(
      () => undefined,
      () => undefined,
    );

  await operation;

  return result;
}

export async function countCommentsByContent(
  contentType:
    CommentContentType,
  contentId: string,
): Promise<number> {
  const comments =
    await getCommentsByContent(
      contentType,
      contentId,
    );

  return comments.length;
}