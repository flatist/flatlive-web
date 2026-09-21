import fs from "fs";
import { Pool } from "pg";

function loadDatabaseUrl() {
  const envText = fs.readFileSync(".env.local", "utf8");

  const line = envText
    .split(/\r?\n/)
    .find((item) =>
      item.startsWith("DATABASE_URL=")
    );

  if (!line) {
    throw new Error(
      "DATABASE_URL이 없습니다."
    );
  }

  return line.slice(
    "DATABASE_URL=".length
  );
}

const users = JSON.parse(
  fs.readFileSync(
    "data/users.json",
    "utf8"
  )
);

if (!Array.isArray(users)) {
  throw new Error(
    "users.json 형식이 배열이 아닙니다."
  );
}

const pool = new Pool({
  connectionString: loadDatabaseUrl(),
});

const client = await pool.connect();

try {
  await client.query("BEGIN");

  await client.query(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL,
      email TEXT NOT NULL,
      display_name TEXT NOT NULL,
      birth_date DATE NULL,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL
    )
  `);

  await client.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS
      users_username_lower_unique
    ON users (LOWER(username))
  `);

  await client.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS
      users_email_lower_unique
    ON users (LOWER(email))
  `);

  let migrated = 0;

  for (const user of users) {
    if (
      !user?.id ||
      !user?.username ||
      !user?.email ||
      !user?.passwordHash
    ) {
      console.log(
        "⚠️ 필수값 부족으로 건너뜀:",
        user?.id ?? "(id 없음)"
      );
      continue;
    }

    await client.query(
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
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        $7,
        $8
      )
      ON CONFLICT (id)
      DO UPDATE SET
        username = EXCLUDED.username,
        email = EXCLUDED.email,
        display_name =
          EXCLUDED.display_name,
        birth_date =
          EXCLUDED.birth_date,
        password_hash =
          EXCLUDED.password_hash,
        created_at =
          EXCLUDED.created_at,
        updated_at =
          EXCLUDED.updated_at
      `,
      [
        user.id,
        user.username,
        user.email,
        user.displayName ||
          user.username,
        user.birthDate || null,
        user.passwordHash,
        user.createdAt ||
          new Date().toISOString(),
        user.updatedAt ||
          new Date().toISOString(),
      ]
    );

    migrated += 1;
  }

  const result = await client.query(`
    SELECT COUNT(*)::int AS count
    FROM users
  `);

  await client.query("COMMIT");

  console.log(
    "✅ JSON 회원:",
    users.length
  );

  console.log(
    "✅ 이번 처리:",
    migrated
  );

  console.log(
    "✅ PostgreSQL users:",
    result.rows[0].count
  );
} catch (error) {
  await client.query("ROLLBACK");

  console.error(
    "❌ 마이그레이션 실패:",
    error
  );

  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}
