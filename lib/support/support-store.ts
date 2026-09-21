import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

export type SupportCategory =
  | "ACCOUNT"
  | "LIVE"
  | "FLIT"
  | "VOD"
  | "FLAT"
  | "PAYMENT"
  | "REPORT"
  | "OTHER";

export type SupportStatus =
  | "RECEIVED"
  | "IN_PROGRESS"
  | "ANSWERED";

export type SupportInquiry = {
  id: string;

  userId: string;
  userEmail: string;

  category: SupportCategory;

  title: string;
  content: string;

  status: SupportStatus;

  adminAnswer: string;

  answeredByUserId: string | null;
  answeredAt: string | null;

  createdAt: string;
  updatedAt: string;
};

export type CreateSupportInquiryInput = {
  userId: string;
  userEmail: string;

  category: SupportCategory;

  title: string;
  content: string;
};

export type UpdateSupportInquiryInput = {
  status: SupportStatus;

  adminAnswer: string;

  answeredByUserId: string;
};

const DATA_DIR = path.join(
  process.cwd(),
  "data",
);

const SUPPORT_FILE = path.join(
  DATA_DIR,
  "support-inquiries.json",
);

let supportWriteQueue: Promise<void> =
  Promise.resolve();

async function ensureSupportFile() {
  await fs.mkdir(
    DATA_DIR,
    {
      recursive: true,
    },
  );

  try {
    await fs.access(
      SUPPORT_FILE,
    );
  } catch {
    await fs.writeFile(
      SUPPORT_FILE,
      "[]",
      "utf-8",
    );
  }
}

async function readUnsafe(): Promise<
  SupportInquiry[]
> {
  await ensureSupportFile();

  const raw =
    await fs.readFile(
      SUPPORT_FILE,
      "utf-8",
    );

  if (!raw.trim()) {
    return [];
  }

  const parsed: unknown =
    JSON.parse(raw);

  if (!Array.isArray(parsed)) {
    throw new Error(
      "SUPPORT_STORE_INVALID_FORMAT",
    );
  }

  return parsed as SupportInquiry[];
}

async function writeUnsafe(
  inquiries: SupportInquiry[],
) {
  await ensureSupportFile();

  const tempFile =
    `${SUPPORT_FILE}.tmp`;

  await fs.writeFile(
    tempFile,
    JSON.stringify(
      inquiries,
      null,
      2,
    ),
    "utf-8",
  );

  await fs.rename(
    tempFile,
    SUPPORT_FILE,
  );
}

function serializeWrite<T>(
  work: () => Promise<T>,
): Promise<T> {
  const result =
    supportWriteQueue.then(
      work,
    );

  supportWriteQueue =
    result
      .then(
        () => undefined,
      )
      .catch(
        () => undefined,
      );

  return result;
}

export async function readSupportInquiries() {
  return readUnsafe();
}

export async function readSupportInquiriesByUser(
  userId: string,
) {
  const inquiries =
    await readUnsafe();

  return inquiries.filter(
    (item) =>
      item.userId === userId,
  );
}

export async function createSupportInquiry(
  input: CreateSupportInquiryInput,
) {
  return serializeWrite(
    async () => {
      const inquiries =
        await readUnsafe();

      const now =
        new Date().toISOString();

      const inquiry:
        SupportInquiry = {
        id:
          randomUUID(),

        userId:
          input.userId,

        userEmail:
          input.userEmail,

        category:
          input.category,

        title:
          input.title.trim(),

        content:
          input.content.trim(),

        status:
          "RECEIVED",

        adminAnswer:
          "",

        answeredByUserId:
          null,

        answeredAt:
          null,

        createdAt:
          now,

        updatedAt:
          now,
      };

      inquiries.unshift(
        inquiry,
      );

      await writeUnsafe(
        inquiries,
      );

      return inquiry;
    },
  );
}

export async function updateSupportInquiry(
  inquiryId: string,
  input: UpdateSupportInquiryInput,
) {
  return serializeWrite(
    async () => {
      const inquiries =
        await readUnsafe();

      const index =
        inquiries.findIndex(
          (item) =>
            item.id ===
            inquiryId,
        );

      if (index < 0) {
        return null;
      }

      const previous =
        inquiries[index];

      const now =
        new Date().toISOString();

      const isAnswered =
        input.status ===
        "ANSWERED";

      const updated:
        SupportInquiry = {
        ...previous,

        status:
          input.status,

        adminAnswer:
          input.adminAnswer.trim(),

        answeredByUserId:
          isAnswered
            ? input.answeredByUserId
            : previous.answeredByUserId,

        answeredAt:
          isAnswered
            ? previous.answeredAt ??
              now
            : previous.answeredAt,

        updatedAt:
          now,
      };

      inquiries[index] =
        updated;

      await writeUnsafe(
        inquiries,
      );

      return {
        previous,
        updated,
      };
    },
  );
}
