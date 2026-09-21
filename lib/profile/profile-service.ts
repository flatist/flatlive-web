import { LocalProfileRepository } from "./local-profile-repository";
import type { ProfileRepository } from "./profile-repository";
import type { UpdateFlatLiveProfileInput } from "./types";

export class ProfileService {
  constructor(private readonly repository: ProfileRepository = new LocalProfileRepository()) {}

  getByUserId(userId: string) {
    return this.repository.findByUserId(userId);
  }

  async update(userId: string, input: UpdateFlatLiveProfileInput) {
    const nickname = input.nickname.trim();
    const bio = input.bio.trim();
    const avatarUrl = input.avatarUrl.trim();

    if (nickname.length < 2 || nickname.length > 30) {
      throw new Error("닉네임은 2~30자로 입력해주세요.");
    }
    if (bio.length > 160) {
      throw new Error("자기소개는 160자 이하로 입력해주세요.");
    }

    const isRemoteAvatar = /^https?:\/\//i.test(avatarUrl);
    const isLocalAvatar = /^\/uploads\/avatars\/[A-Za-z0-9._-]+$/.test(avatarUrl);
    if (avatarUrl && !isRemoteAvatar && !isLocalAvatar) {
      throw new Error("허용되지 않은 프로필 이미지 경로입니다.");
    }

    return this.repository.upsert(userId, {
      nickname,
      bio,
      avatarUrl,
      isPublic: Boolean(input.isPublic),
    });
  }
}
