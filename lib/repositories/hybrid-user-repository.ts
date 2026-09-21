import type {
  UserId,
  UserRecord,
} from "@/lib/auth/types";

import {
  LocalUserRepository,
} from "@/lib/repositories/local-user-repository";

import {
  DatabaseUserRepository,
} from "@/lib/repositories/database-user-repository";

import type {
  UserRepository,
} from "@/lib/repositories/user-repository";

export class HybridUserRepository
  implements UserRepository
{
  private readonly local =
    new LocalUserRepository();

  private readonly database =
    new DatabaseUserRepository();

  async findAll(): Promise<UserRecord[]> {
    try {
      return await this.database.findAll();
    } catch (error) {
      console.error(
        "[HYBRID_USER_DB_FIND_ALL_FAILED]",
        error,
      );

      return this.local.findAll();
    }
  }

  async findById(
    id: UserId,
  ): Promise<UserRecord | null> {
    try {
      const user =
        await this.database.findById(id);

      if (user) {
        return user;
      }
    } catch (error) {
      console.error(
        "[HYBRID_USER_DB_FIND_BY_ID_FAILED]",
        error,
      );
    }

    return this.local.findById(id);
  }

  async findByUsername(
    username: string,
  ): Promise<UserRecord | null> {
    try {
      const user =
        await this.database.findByUsername(
          username,
        );

      if (user) {
        return user;
      }
    } catch (error) {
      console.error(
        "[HYBRID_USER_DB_FIND_BY_USERNAME_FAILED]",
        error,
      );
    }

    return this.local.findByUsername(
      username,
    );
  }

  async findByEmail(
    email: string,
  ): Promise<UserRecord | null> {
    try {
      const user =
        await this.database.findByEmail(
          email,
        );

      if (user) {
        return user;
      }
    } catch (error) {
      console.error(
        "[HYBRID_USER_DB_FIND_BY_EMAIL_FAILED]",
        error,
      );
    }

    return this.local.findByEmail(email);
  }

  async create(
    user: Omit<
      UserRecord,
      "createdAt" | "updatedAt"
    >,
  ): Promise<UserRecord> {
    const localUser =
      await this.local.create(user);

    try {
      await this.database.create({
        id: localUser.id,
        username: localUser.username,
        email: localUser.email,
        displayName:
          localUser.displayName,
        birthDate:
          localUser.birthDate,
        passwordHash:
          localUser.passwordHash,
      });
    } catch (error) {
      console.error(
        "[HYBRID_USER_DB_CREATE_FAILED]",
        error,
      );
    }

    return localUser;
  }

  async update(
    id: UserId,
    updates: Partial<
      Omit<
        UserRecord,
        "id" | "createdAt"
      >
    >,
  ): Promise<UserRecord | null> {
    const localUser =
      await this.local.update(
        id,
        updates,
      );

    if (!localUser) {
      return null;
    }

    try {
      await this.database.update(
        id,
        updates,
      );
    } catch (error) {
      console.error(
        "[HYBRID_USER_DB_UPDATE_FAILED]",
        error,
      );
    }

    return localUser;
  }

  async delete(
    id: UserId,
  ): Promise<void> {
    await this.local.delete(id);

    try {
      await this.database.delete(id);
    } catch (error) {
      console.error(
        "[HYBRID_USER_DB_DELETE_FAILED]",
        error,
      );
    }
  }
}
