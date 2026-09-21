import type { FollowRepository } from "./follow-repository";
import { LocalFollowRepository } from "./local-follow-repository";

export class SocialService {
  constructor(private readonly repository: FollowRepository = new LocalFollowRepository()) {}

  async follow(followerUserId: string, followingUserId: string) {
    if (!followerUserId || !followingUserId) throw new Error("사용자 정보가 올바르지 않습니다.");
    if (followerUserId === followingUserId) throw new Error("자기 자신을 팔로우할 수 없습니다.");
    return this.repository.create(followerUserId, followingUserId);
  }

  async unfollow(followerUserId: string, followingUserId: string) {
    if (!followerUserId || !followingUserId) throw new Error("사용자 정보가 올바르지 않습니다.");
    await this.repository.delete(followerUserId, followingUserId);
  }

  async isFollowing(followerUserId: string, followingUserId: string) {
    if (!followerUserId || !followingUserId) return false;
    return Boolean(await this.repository.find(followerUserId, followingUserId));
  }

  async getStats(userId: string) {
    const [followers, following] = await Promise.all([
      this.repository.countFollowers(userId),
      this.repository.countFollowing(userId),
    ]);
    return { followers, following };
  }

  listFollowerUserIds(userId: string) {
    return this.repository.listFollowerUserIds(userId);
  }

  listFollowingUserIds(userId: string) {
    return this.repository.listFollowingUserIds(userId);
  }
}
