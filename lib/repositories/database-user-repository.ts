import { pgPool } from "@/lib/db/postgres";
import type {
  UserId,
  UserRecord,
} from "@/lib/auth/types";
import type {
  UserRepository,
} from "@/lib/repositories/user-repository";

type UserRow = {
  id: string;
  username: string;
  email: string;
  display_name: string;
  birth_date: string | Date | null;
  password_hash: string;
  created_at: string | Date;
  updated_at: string | Date;
};

function toIsoDateOnly(
  value: string | Date | null,
) {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  return String(value).slice(0, 10);
}

function toIsoDateTime(
  value: string | Date,
) {
  if (value instanceof Date) {
    return value.toISOString();
  }

  return new Date(value).toISOString();
}

function mapUser(
  row: UserRow,
): UserRecord {
  return {
    id: row.id,
    username: row.username,
    email: row.email,
    displayName: row.display_name,
    birthDate: toIsoDateOnly(
      row.birth_date,
    ),
    passwordHash: row.password_hash,
    createdAt: toIsoDateTime(
      row.created_at,
    ),
    updatedAt: toIsoDateTime(
      row.updated_at,
    ),
  };
}

export class DatabaseUserRepository
  implements UserRepository
{
  async findAll(): Promise<UserRecord[]> {
    const result =
      await pgPool.query<UserRow>(`
        SELECT
          id,
          username,
          email,
          display_name,
          birth_date,
          password_hash,
          created_at,
          updated_at
        FROM users
        ORDER BY created_at ASC
      `);

    return result.rows.map(mapUser);
  }

  async findById(
    id: UserId,
  ): Promise<UserRecord | null> {
    const result =
      await pgPool.query<UserRow>(
        `
        SELECT
          id,
          username,
          email,
          display_name,
          birth_date,
          password_hash,
          created_at,
          updated_at
        FROM users
        WHERE id = $1
        LIMIT 1
        `,
        [id],
      );

    return result.rows[0]
      ? mapUser(result.rows[0])
      : null;
  }

  async findByUsername(
    username: string,
  ): Promise<UserRecord | null> {
    const result =
      await pgPool.query<UserRow>(
        `
        SELECT
          id,
          username,
          email,
          display_name,
          birth_date,
          password_hash,
          created_at,
          updated_at
        FROM users
        WHERE LOWER(username) = LOWER($1)
        LIMIT 1
        `,
        [username],
      );

    return result.rows[0]
      ? mapUser(result.rows[0])
      : null;
  }

  async findByEmail(
    email: string,
  ): Promise<UserRecord | null> {
    const result =
      await pgPool.query<UserRow>(
        `
        SELECT
          id,
          username,
          email,
          display_name,
          birth_date,
          password_hash,
          created_at,
          updated_at
        FROM users
        WHERE LOWER(email) = LOWER($1)
        LIMIT 1
        `,
        [email],
      );

    return result.rows[0]
      ? mapUser(result.rows[0])
      : null;
  }

  async create(
    user: Omit<
      UserRecord,
      "createdAt" | "updatedAt"
    >,
  ): Promise<UserRecord> {
    const now =
      new Date().toISOString();

    const result =
      await pgPool.query<UserRow>(
        `
        INSERT INTO users (
          id,
          username,
          email,
          display_name,
          birth_date,
          password_hash,
          created_at,
          updated_at
        )
        VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8
        )
        RETURNING
          id,
          username,
          email,
          display_name,
          birth_date,
          password_hash,
          created_at,
          updated_at
        `,
        [
          user.id,
          user.username,
          user.email,
          user.displayName,
          user.birthDate || null,
          user.passwordHash,
          now,
          now,
        ],
      );

    return mapUser(result.rows[0]);
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
    const current =
      await this.findById(id);

    if (!current) {
      return null;
    }

    const next = {
      ...current,
      ...updates,
    };

    const result =
      await pgPool.query<UserRow>(
        `
        UPDATE users
        SET
          username = $2,
          email = $3,
          display_name = $4,
          birth_date = $5,
          password_hash = $6,
          updated_at = NOW()
        WHERE id = $1
        RETURNING
          id,
          username,
          email,
          display_name,
          birth_date,
          password_hash,
          created_at,
          updated_at
        `,
        [
          id,
          next.username,
          next.email,
          next.displayName,
          next.birthDate || null,
          next.passwordHash,
        ],
      );

    return result.rows[0]
      ? mapUser(result.rows[0])
      : null;
  }

  async delete(
    id: UserId,
  ): Promise<void> {
    await pgPool.query(
      `
      DELETE FROM users
      WHERE id = $1
      `,
      [id],
    );
  }
}
