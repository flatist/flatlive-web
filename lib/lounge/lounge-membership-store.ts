import fs from "fs";
import path from "path";

export type LoungeMembershipStatus =
  | "ACTIVE"
  | "EXPIRED"
  | "CANCELED";

export type LoungeMembership = {
  id: string;
  userId: string;
  status: LoungeMembershipStatus;
  startedAt: string;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
};

const STORE_PATH = path.join(
  process.cwd(),
  "data",
  "lounge-memberships.json",
);

function ensureStoreFile() {
  const directory = path.dirname(STORE_PATH);

  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }

  if (!fs.existsSync(STORE_PATH)) {
    fs.writeFileSync(
      STORE_PATH,
      JSON.stringify([], null, 2),
      "utf8",
    );
  }
}

function readMemberships(): LoungeMembership[] {
  ensureStoreFile();

  try {
    const content = fs.readFileSync(
      STORE_PATH,
      "utf8",
    );

    const parsed = JSON.parse(content);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed;
  } catch {
    return [];
  }
}

function writeMemberships(
  memberships: LoungeMembership[],
) {
  ensureStoreFile();

  fs.writeFileSync(
    STORE_PATH,
    JSON.stringify(memberships, null, 2),
    "utf8",
  );
}

function refreshStatus(
  membership: LoungeMembership,
): LoungeMembership {
  if (
    membership.status === "ACTIVE" &&
    new Date(membership.expiresAt).getTime() <= Date.now()
  ) {
    return {
      ...membership,
      status: "EXPIRED",
      updatedAt: new Date().toISOString(),
    };
  }

  return membership;
}

export function getLoungeMembershipByUserId(
  userId: string,
) {
  const memberships = readMemberships();

  const index = memberships.findIndex(
    (membership) =>
      membership.userId === userId,
  );

  if (index === -1) {
    return null;
  }

  const refreshed = refreshStatus(
    memberships[index],
  );

  if (
    refreshed.status !==
    memberships[index].status
  ) {
    memberships[index] = refreshed;
    writeMemberships(memberships);
  }

  return refreshed;
}

export function activateTestLoungeMembership(
  userId: string,
  months = 1,
) {
  const memberships = readMemberships();

  const now = new Date();
  const expiresAt = new Date(now);

  expiresAt.setMonth(
    expiresAt.getMonth() + months,
  );

  const existingIndex =
    memberships.findIndex(
      (membership) =>
        membership.userId === userId,
    );

  const membership: LoungeMembership = {
    id:
      existingIndex >= 0
        ? memberships[existingIndex].id
        : crypto.randomUUID(),

    userId,
    status: "ACTIVE",
    startedAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),

    createdAt:
      existingIndex >= 0
        ? memberships[existingIndex].createdAt
        : now.toISOString(),

    updatedAt: now.toISOString(),
  };

  if (existingIndex >= 0) {
    memberships[existingIndex] =
      membership;
  } else {
    memberships.push(membership);
  }

  writeMemberships(memberships);

  return membership;
}

export function cancelLoungeMembership(
  userId: string,
) {
  const memberships = readMemberships();

  const index = memberships.findIndex(
    (membership) =>
      membership.userId === userId,
  );

  if (index === -1) {
    return null;
  }

  memberships[index] = {
    ...memberships[index],
    status: "CANCELED",
    updatedAt: new Date().toISOString(),
  };

  writeMemberships(memberships);

  return memberships[index];
}

export function listAllLoungeMemberships() {
  const original = readMemberships();
  const memberships = original.map(refreshStatus);
  const changed = memberships.some(
    (item, index) =>
      original[index]?.status !== item.status,
  );

  if (changed) {
    writeMemberships(memberships);
  }

  return memberships.sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt),
  );
}
