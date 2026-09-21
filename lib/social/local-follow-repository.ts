import { randomUUID } from "crypto";
import fs from "fs/promises";
import path from "path";

import type { FollowRepository } from "./follow-repository";
import type { FollowRecord } from "./types";

const FILE_PATH = path.join(process.cwd(), "data", "follows.json");

async function readItems(): Promise<FollowRecord[]> {
  try {
    const raw = await fs.readFile(FILE_PATH, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as FollowRecord[]) : [];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}

async function writeItems(items: FollowRecord[]) {
  await fs.mkdir(path.dirname(FILE_PATH), { recursive: true });
  await fs.writeFile(FILE_PATH, JSON.stringify(items, null, 2) + "\n", "utf8");
}

export class LocalFollowRepository implements FollowRepository {
  async find(followerUserId: string, followingUserId: string) {
    return (
      (await readItems()).find(
        (item) => item.followerUserId === followerUserId && item.followingUserId === followingUserId,
      ) ?? null
    );
  }

  async create(followerUserId: string, followingUserId: string) {
    const items = await readItems();
    const existing = items.find(
      (item) => item.followerUserId === followerUserId && item.followingUserId === followingUserId,
    );
    if (existing) return existing;

    const record: FollowRecord = {
      id: randomUUID(),
      followerUserId,
      followingUserId,
      createdAt: new Date().toISOString(),
    };
    items.push(record);
    await writeItems(items);
    return record;
  }

  async delete(followerUserId: string, followingUserId: string) {
    const items = await readItems();
    await writeItems(
      items.filter(
        (item) => !(item.followerUserId === followerUserId && item.followingUserId === followingUserId),
      ),
    );
  }

  async countFollowers(userId: string) {
    return (await readItems()).filter((item) => item.followingUserId === userId).length;
  }

  async countFollowing(userId: string) {
    return (await readItems()).filter((item) => item.followerUserId === userId).length;
  }

  async listFollowerUserIds(userId: string) {
    return (await readItems())
      .filter((item) => item.followingUserId === userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((item) => item.followerUserId);
  }

  async listFollowingUserIds(userId: string) {
    return (await readItems())
      .filter((item) => item.followerUserId === userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((item) => item.followingUserId);
  }
}
