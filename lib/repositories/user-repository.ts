import type { AuthUser, UserId, UserRecord } from "@/lib/auth/types";

export interface UserRepository {
  findById(id: UserId): Promise<UserRecord | null>;
  findByUsername(username: string): Promise<UserRecord | null>;
  findByEmail(email: string): Promise<UserRecord | null>;
  create(user: Omit<UserRecord, "createdAt" | "updatedAt">): Promise<UserRecord>;
  update(id: UserId, updates: Partial<Omit<UserRecord, "id" | "createdAt">>): Promise<UserRecord | null>;
  delete(id: UserId): Promise<void>;
}

export function toAuthUser(user: UserRecord): AuthUser {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    displayName: user.displayName,
  };
}
