import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL 환경변수가 없습니다.");
}

const globalForPg = globalThis as unknown as {
  flatlivePgPool?: Pool;
};

export const pgPool =
  globalForPg.flatlivePgPool ??
  new Pool({
    connectionString,
  });

if (process.env.NODE_ENV !== "production") {
  globalForPg.flatlivePgPool = pgPool;
}

export async function testDatabaseConnection() {
  const result = await pgPool.query<{
    database_name: string;
    database_user: string;
  }>(
    `
    SELECT
      current_database() AS database_name,
      current_user AS database_user
    `,
  );

  return result.rows[0];
}
