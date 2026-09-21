import fs from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

import type {
  FanMembershipPurchaseInput,
  FanMembershipRecord,
  FanMembershipRevokeInput,
} from "./fan-membership-types";
import {
  getRuntimeFanMembershipStatus,
  isFanMembershipActive,
  isVipTier,
} from "./fan-membership-types";

const DATA_DIR = path.join(process.cwd(), "data");
const FAN_MEMBERSHIPS_FILE = path.join(DATA_DIR, "fan-memberships.json");
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

function normalizeId(value: string) {
  return value.trim();
}

function normalizePriceFlat(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.floor(value));
}

async function readAll(): Promise<FanMembershipRecord[]> {
  try {
    const raw = await fs.readFile(FAN_MEMBERSHIPS_FILE, "utf8");
    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((item): item is FanMembershipRecord => {
      return (
        item &&
        typeof item.id === "string" &&
        typeof item.broadcasterUserId === "string" &&
        typeof item.viewerUserId === "string" &&
        (item.tier === "FAN" || item.tier === "VIP") &&
        (item.status === "ACTIVE" ||
          item.status === "EXPIRED" ||
          item.status === "REVOKED") &&
        typeof item.startedAt === "number" &&
        (typeof item.expiresAt === "number" || item.expiresAt === null) &&
        typeof item.priceFlat === "number" &&
        (item.durationType === "THIRTY_DAYS" ||
          item.durationType === "PERMANENT") &&
        typeof item.createdAt === "number" &&
        typeof item.updatedAt === "number"
      );
    });
  } catch (error) {
    const code =
      error && typeof error === "object" && "code" in error
        ? String((error as { code?: unknown }).code)
        : "";

    if (code === "ENOENT") {
      return [];
    }

    throw error;
  }
}

async function writeAll(rows: FanMembershipRecord[]) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(
    FAN_MEMBERSHIPS_FILE,
    JSON.stringify(rows, null, 2),
    "utf8",
  );
}

function createExpiresAt(
  durationType: FanMembershipPurchaseInput["durationType"],
  now: number,
) {
  if (durationType === "PERMANENT") {
    return null;
  }

  return now + THIRTY_DAYS_MS;
}

export class LocalFanMembershipStore {
  async getActiveMembership(
    broadcasterUserId: string,
    viewerUserId: string,
    now = Date.now(),
  ) {
    const safeBroadcasterUserId = normalizeId(broadcasterUserId);
    const safeViewerUserId = normalizeId(viewerUserId);

    if (!safeBroadcasterUserId || !safeViewerUserId) {
      return null;
    }

    const rows = await readAll();
    const found = rows.find(
      (row) =>
        row.broadcasterUserId === safeBroadcasterUserId &&
        row.viewerUserId === safeViewerUserId,
    );

    if (!found || !isFanMembershipActive(found, now)) {
      return null;
    }

    return {
      ...found,
      status: getRuntimeFanMembershipStatus(found, now),
    };
  }

  async listByBroadcaster(broadcasterUserId: string, now = Date.now()) {
    const safeBroadcasterUserId = normalizeId(broadcasterUserId);

    if (!safeBroadcasterUserId) {
      return [];
    }

    const rows = await readAll();

    return rows
      .filter((row) => row.broadcasterUserId === safeBroadcasterUserId)
      .map((row) => ({
        ...row,
        status: getRuntimeFanMembershipStatus(row, now),
      }))
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }

  async purchaseMembership(input: FanMembershipPurchaseInput, now = Date.now()) {
    const broadcasterUserId = normalizeId(input.broadcasterUserId);
    const viewerUserId = normalizeId(input.viewerUserId);

    if (!broadcasterUserId || !viewerUserId) {
      throw new Error("FAN_MEMBERSHIP_USER_REQUIRED");
    }

    if (broadcasterUserId === viewerUserId) {
      throw new Error("FAN_MEMBERSHIP_SELF_NOT_ALLOWED");
    }

    const rows = await readAll();
    const existingIndex = rows.findIndex(
      (row) =>
        row.broadcasterUserId === broadcasterUserId &&
        row.viewerUserId === viewerUserId,
    );
    const existing = existingIndex >= 0 ? rows[existingIndex] : null;
    const existingIsActive = existing
      ? isFanMembershipActive(existing, now)
      : false;

    if (
      existing &&
      existingIsActive &&
      isVipTier(existing.tier) &&
      input.tier === "FAN"
    ) {
      return {
        ...existing,
        status: getRuntimeFanMembershipStatus(existing, now),
      };
    }

    const record: FanMembershipRecord = {
      id: existing?.id ?? randomUUID(),
      broadcasterUserId,
      viewerUserId,
      tier: input.tier,
      status: "ACTIVE",
      startedAt: now,
      expiresAt: createExpiresAt(input.durationType, now),
      priceFlat: normalizePriceFlat(input.priceFlat),
      durationType: input.durationType,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };

    if (existingIndex >= 0) {
      rows[existingIndex] = record;
    } else {
      rows.push(record);
    }

    await writeAll(rows);

    return record;
  }

  async revokeMembership(input: FanMembershipRevokeInput, now = Date.now()) {
    const broadcasterUserId = normalizeId(input.broadcasterUserId);
    const viewerUserId = normalizeId(input.viewerUserId);

    if (!broadcasterUserId || !viewerUserId) {
      throw new Error("FAN_MEMBERSHIP_USER_REQUIRED");
    }

    const rows = await readAll();
    const index = rows.findIndex(
      (row) =>
        row.broadcasterUserId === broadcasterUserId &&
        row.viewerUserId === viewerUserId,
    );

    if (index < 0) {
      return null;
    }

    const updated: FanMembershipRecord = {
      ...rows[index],
      status: "REVOKED",
      updatedAt: now,
    };

    rows[index] = updated;
    await writeAll(rows);

    return updated;
  }
}
