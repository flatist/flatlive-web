import { promises as fs } from "fs";
import path from "path";

import type { Role } from "./permissions";

export type UserRoleRecord = {
  userId: string;
  role: Role;
  grantedByUserId?: string | null;
  grantedAt: string;
  updatedAt: string;
};

const ROLE_FILE = path.join(
  process.cwd(),
  "data",
  "admin-roles.json",
);

let writeQueue: Promise<void> = Promise.resolve();

async function readRoles(): Promise<UserRoleRecord[]> {
  try {
    const raw = await fs.readFile(ROLE_FILE, "utf8");
    const parsed = JSON.parse(raw);

    return Array.isArray(parsed)
      ? (parsed as UserRoleRecord[])
      : [];
  } catch (error) {
    const code =
      error &&
      typeof error === "object" &&
      "code" in error
        ? String(error.code)
        : "";

    if (code === "ENOENT") {
      return [];
    }

    throw error;
  }
}

async function writeRoles(records: UserRoleRecord[]) {
  await fs.mkdir(path.dirname(ROLE_FILE), {
    recursive: true,
  });

  const tempFile = `${ROLE_FILE}.tmp`;

  await fs.writeFile(
    tempFile,
    JSON.stringify(records, null, 2),
    "utf8",
  );

  await fs.rename(tempFile, ROLE_FILE);
}

export async function getUserRole(
  userId: string,
): Promise<Role> {
  const records = await readRoles();

  return (
    records.find((record) => record.userId === userId)
      ?.role ?? "USER"
  );
}

export async function setUserRole(input: {
  userId: string;
  role: Role;
  grantedByUserId?: string | null;
}) {
  const operation = writeQueue.then(async () => {
    const records = await readRoles();

    const now = new Date().toISOString();

    const existingIndex = records.findIndex(
      (record) => record.userId === input.userId,
    );

    const record: UserRoleRecord = {
      userId: input.userId,
      role: input.role,
      grantedByUserId:
        input.grantedByUserId ?? null,
      grantedAt:
        existingIndex >= 0
          ? records[existingIndex].grantedAt
          : now,
      updatedAt: now,
    };

    if (existingIndex >= 0) {
      records[existingIndex] = record;
    } else {
      records.push(record);
    }

    await writeRoles(records);

    return record;
  });

  writeQueue = operation
    .then(() => undefined)
    .catch(() => undefined);

  return operation;
}
