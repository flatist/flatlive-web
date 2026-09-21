import fs from "fs/promises";
import path from "path";

import {
  DEFAULT_FAN_CARD_SETTINGS,
  type FanCardSettings,
  type FanCardSettingsInput,
  type FanMembershipDurationType,
} from "./fan-card-types";

const FILE_PATH = path.join(
  process.cwd(),
  "data",
  "fan-card-settings.json",
);

async function readAll(): Promise<FanCardSettings[]> {
  try {
    const parsed = JSON.parse(await fs.readFile(FILE_PATH, "utf8"));
    return Array.isArray(parsed) ? (parsed as FanCardSettings[]) : [];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }

    throw error;
  }
}

async function writeAll(records: FanCardSettings[]) {
  await fs.mkdir(path.dirname(FILE_PATH), { recursive: true });
  await fs.writeFile(
    FILE_PATH,
    JSON.stringify(records, null, 2) + "\n",
    "utf8",
  );
}

function isDurationType(value: unknown): value is FanMembershipDurationType {
  return value === "THIRTY_DAYS" || value === "PERMANENT";
}

function safeMessage(value: unknown, fallback: string) {
  if (typeof value !== "string") {
    return fallback;
  }

  const trimmed = value.trim();
  return trimmed.slice(0, 500);
}

function safeImageUrl(value: unknown, fallback: string) {
  if (typeof value !== "string") {
    return fallback;
  }

  return value.trim().slice(0, 1000);
}

function safeColor(value: unknown, fallback: string) {
  if (typeof value !== "string") {
    return fallback;
  }

  const trimmed = value.trim();
  return /^#[0-9a-fA-F]{6}$/.test(trimmed) ? trimmed : fallback;
}

function safePrice(value: unknown, fallback: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }

  return Math.max(0, Math.floor(value));
}

function normalizeInput(
  current: FanCardSettings,
  input: FanCardSettingsInput,
): FanCardSettings {
  return {
    broadcasterUserId: current.broadcasterUserId,

    fanEnabled:
      typeof input.fanEnabled === "boolean"
        ? input.fanEnabled
        : current.fanEnabled,
    fanMessage: safeMessage(input.fanMessage, current.fanMessage),
    fanPriceFlat: safePrice(input.fanPriceFlat, current.fanPriceFlat),
    fanDurationType: isDurationType(input.fanDurationType)
      ? input.fanDurationType
      : current.fanDurationType,
    fanNicknameColor: safeColor(
      input.fanNicknameColor,
      current.fanNicknameColor,
    ),

    vipEnabled:
      typeof input.vipEnabled === "boolean"
        ? input.vipEnabled
        : current.vipEnabled,
    vipMessage: safeMessage(input.vipMessage, current.vipMessage),
    vipImageUrl: safeImageUrl(input.vipImageUrl, current.vipImageUrl),
    vipPriceFlat: safePrice(input.vipPriceFlat, current.vipPriceFlat),
    vipDurationType: isDurationType(input.vipDurationType)
      ? input.vipDurationType
      : current.vipDurationType,
    vipNicknameColor: safeColor(
      input.vipNicknameColor,
      current.vipNicknameColor,
    ),

    updatedAt: Date.now(),
  };
}

export function createDefaultFanCardSettings(
  broadcasterUserId: string,
): FanCardSettings {
  return {
    broadcasterUserId,
    ...DEFAULT_FAN_CARD_SETTINGS,
    updatedAt: Date.now(),
  };
}

export class LocalFanCardSettingsStore {
  async getByBroadcasterUserId(
    broadcasterUserId: string,
  ): Promise<FanCardSettings> {
    const records = await readAll();

    return (
      records.find(
        (record) => record.broadcasterUserId === broadcasterUserId,
      ) ?? createDefaultFanCardSettings(broadcasterUserId)
    );
  }

  async update(
    broadcasterUserId: string,
    input: FanCardSettingsInput,
  ): Promise<FanCardSettings> {
    const records = await readAll();
    const index = records.findIndex(
      (record) => record.broadcasterUserId === broadcasterUserId,
    );

    const current =
      index >= 0
        ? records[index]
        : createDefaultFanCardSettings(broadcasterUserId);

    const next = normalizeInput(current, input);

    if (index >= 0) {
      records[index] = next;
    } else {
      records.push(next);
    }

    await writeAll(records);

    return next;
  }
}
