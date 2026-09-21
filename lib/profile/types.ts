import type { UserId } from "@/lib/auth/types";

export type FlatLiveProfile = {
  userId: UserId;
  nickname: string;
  bio: string;
  avatarUrl: string;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
};

export type UpdateFlatLiveProfileInput = {
  nickname: string;
  bio: string;
  avatarUrl: string;
  isPublic: boolean;
};
