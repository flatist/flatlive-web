import fs from "node:fs/promises";
import path from "node:path";

export type AdultVerificationRecord = {
  userId: string;
  verified: boolean;

  /**
   * 실제 본인인증 사업자 연결 후
   * PASS / NICE / KCB 등의 공급자 코드를 저장합니다.
   */
  provider: string;

  /**
   * 사용자의 정확한 생년월일 자체를
   * 불필요하게 저장하지 않고,
   * 성인 여부 판정 결과 중심으로 관리합니다.
   */
  verifiedAt: string | null;

  createdAt: string;
  updatedAt: string;
};

const DATA_DIR = path.join(
  process.cwd(),
  "data",
);

const DATA_FILE = path.join(
  DATA_DIR,
  "adult-verifications.json",
);

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

async function readRecords():
  Promise<AdultVerificationRecord[]> {
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
      ? parsed
      : [];
  } catch {
    return [];
  }
}

async function writeRecords(
  records: AdultVerificationRecord[],
) {
  await ensureStore();

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

export async function getAdultVerification(
  userId: string,
): Promise<AdultVerificationRecord | null> {
  const normalizedUserId =
    userId.trim();

  if (!normalizedUserId) {
    return null;
  }

  const records =
    await readRecords();

  return (
    records.find(
      (item) =>
        item.userId ===
        normalizedUserId,
    ) ?? null
  );
}

export async function isAdultVerified(
  userId: string,
): Promise<boolean> {
  const record =
    await getAdultVerification(
      userId,
    );

  return record?.verified === true;
}


export async function markAdultVerified(
  userId: string,
  provider: string,
): Promise<AdultVerificationRecord> {
  const normalizedUserId =
    userId.trim();

  const normalizedProvider =
    provider.trim();

  if (!normalizedUserId) {
    throw new Error(
      "userId가 필요합니다.",
    );
  }

  if (!normalizedProvider) {
    throw new Error(
      "provider가 필요합니다.",
    );
  }

  const records =
    await readRecords();

  const now =
    new Date().toISOString();

  const existingIndex =
    records.findIndex(
      (item) =>
        item.userId ===
        normalizedUserId,
    );

  const record:
    AdultVerificationRecord = {
      userId:
        normalizedUserId,
      verified: true,
      provider:
        normalizedProvider,
      verifiedAt: now,
      createdAt:
        existingIndex >= 0
          ? records[
              existingIndex
            ].createdAt
          : now,
      updatedAt: now,
    };

  if (existingIndex >= 0) {
    records[
      existingIndex
    ] = record;
  } else {
    records.push(record);
  }

  await writeRecords(
    records,
  );

  return record;
}
