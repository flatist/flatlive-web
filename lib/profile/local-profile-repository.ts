import fs from "fs/promises";
import path from "path";
import type { ProfileRepository } from "./profile-repository";
import type { FlatLiveProfile, UpdateFlatLiveProfileInput } from "./types";

const FILE_PATH = path.join(process.cwd(), "data", "flatlive-profiles.json");

async function readProfiles(): Promise<FlatLiveProfile[]> {
  try {
    return JSON.parse(await fs.readFile(FILE_PATH, "utf8")) as FlatLiveProfile[];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}

async function writeProfiles(profiles: FlatLiveProfile[]) {
  await fs.mkdir(path.dirname(FILE_PATH), { recursive: true });
  await fs.writeFile(FILE_PATH, JSON.stringify(profiles, null, 2) + "\n", "utf8");
}

export class LocalProfileRepository implements ProfileRepository {
  async findByUserId(userId: string) {
    return (await readProfiles()).find((profile) => profile.userId === userId) ?? null;
  }

  async upsert(userId: string, input: UpdateFlatLiveProfileInput) {
    const profiles = await readProfiles();
    const index = profiles.findIndex((profile) => profile.userId === userId);
    const now = new Date().toISOString();
    const profile: FlatLiveProfile = {
      userId,
      nickname: input.nickname.trim(),
      bio: input.bio.trim(),
      avatarUrl: input.avatarUrl.trim(),
      isPublic: input.isPublic,
      createdAt: index >= 0 ? profiles[index].createdAt : now,
      updatedAt: now,
    };
    if (index >= 0) profiles[index] = profile;
    else profiles.push(profile);
    await writeProfiles(profiles);
    return profile;
  }
}
