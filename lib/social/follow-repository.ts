import type { FollowRecord } from "./types";

export interface FollowRepository {
  find(followerUserId: string, followingUserId: string): Promise<FollowRecord | null>;
  create(followerUserId: string, followingUserId: string): Promise<FollowRecord>;
  delete(followerUserId: string, followingUserId: string): Promise<void>;
  countFollowers(userId: string): Promise<number>;
  countFollowing(userId: string): Promise<number>;
  listFollowerUserIds(userId: string): Promise<string[]>;
  listFollowingUserIds(userId: string): Promise<string[]>;
}
