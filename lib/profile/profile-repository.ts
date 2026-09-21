import type { FlatLiveProfile, UpdateFlatLiveProfileInput } from "./types";

export interface ProfileRepository {
  findByUserId(userId: string): Promise<FlatLiveProfile | null>;
  upsert(userId: string, input: UpdateFlatLiveProfileInput): Promise<FlatLiveProfile>;
}
