import fs from "node:fs";
import path from "node:path";
import pg from "pg";

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

function readJson(name) {
  const file = path.join(process.cwd(), "data", name);

  if (!fs.existsSync(file)) {
    return [];
  }

  const raw = JSON.parse(
    fs.readFileSync(file, "utf8"),
  );

  return Array.isArray(raw) ? raw : [];
}

const unifiedUsers = readJson("identity-users.json");
const loginIdentities = readJson("login-identities.json");
const clients = readJson("clients.json");
const serviceAccess = readJson("service-access.json");
const consents = readJson("consents.json");
const emailTokens = readJson("email-verification-tokens.json");
const resetTokens = readJson("password-reset-tokens.json");

const client = await pool.connect();

try {
  await client.query("BEGIN");

  await client.query(`
    CREATE TABLE IF NOT EXISTS unified_users (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL,
      email_verified_at TIMESTAMPTZ NULL,
      last_login_at TIMESTAMPTZ NULL,
      display_name TEXT NULL,
      username TEXT NULL,
      email TEXT NULL,
      birth_date DATE NULL,
      created_at TIMESTAMPTZ NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL
    )
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS login_identities (
      id TEXT PRIMARY KEY,
      identity_id TEXT NOT NULL UNIQUE,
      user_id TEXT NOT NULL,
      provider TEXT NOT NULL,
      provider_user_id TEXT NULL,
      login_identifier TEXT NOT NULL,
      verified BOOLEAN NOT NULL,
      username TEXT NULL,
      email TEXT NULL,
      password_hash TEXT NULL,
      email_verified_at TIMESTAMPTZ NULL,
      created_at TIMESTAMPTZ NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL
    )
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS auth_clients (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL
    )
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS service_access (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      service TEXT NOT NULL,
      client_id TEXT NOT NULL,
      status TEXT NOT NULL,
      joined_at TIMESTAMPTZ NULL,
      last_access_at TIMESTAMPTZ NULL,
      created_at TIMESTAMPTZ NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL
    )
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS consents (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      client_id TEXT NOT NULL,
      consent_type TEXT NOT NULL,
      version TEXT NOT NULL,
      status TEXT NOT NULL,
      granted_at TIMESTAMPTZ NULL,
      revoked_at TIMESTAMPTZ NULL,
      created_at TIMESTAMPTZ NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL
    )
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS email_verification_tokens (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token_hash TEXT NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      used_at TIMESTAMPTZ NULL,
      created_at TIMESTAMPTZ NOT NULL
    )
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token_hash TEXT NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      used_at TIMESTAMPTZ NULL,
      created_at TIMESTAMPTZ NOT NULL
    )
  `);

  for (const x of unifiedUsers) {
    await client.query(
      `
      INSERT INTO unified_users (
        id,
        user_id,
        status,
        email_verified_at,
        last_login_at,
        display_name,
        username,
        email,
        birth_date,
        created_at,
        updated_at
      )
      VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11
      )
      ON CONFLICT (id)
      DO UPDATE SET
        user_id = EXCLUDED.user_id,
        status = EXCLUDED.status,
        email_verified_at = EXCLUDED.email_verified_at,
        last_login_at = EXCLUDED.last_login_at,
        display_name = EXCLUDED.display_name,
        username = EXCLUDED.username,
        email = EXCLUDED.email,
        birth_date = EXCLUDED.birth_date,
        updated_at = EXCLUDED.updated_at
      `,
      [
        x.id,
        x.userId,
        x.status,
        x.emailVerifiedAt ?? null,
        x.lastLoginAt ?? null,
        x.displayName ?? null,
        x.username ?? null,
        x.email ?? null,
        x.birthDate ?? null,
        x.createdAt,
        x.updatedAt,
      ],
    );
  }

  for (const x of loginIdentities) {
    await client.query(
      `
      INSERT INTO login_identities (
        id,
        identity_id,
        user_id,
        provider,
        provider_user_id,
        login_identifier,
        verified,
        username,
        email,
        password_hash,
        email_verified_at,
        created_at,
        updated_at
      )
      VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13
      )
      ON CONFLICT (id)
      DO UPDATE SET
        identity_id = EXCLUDED.identity_id,
        user_id = EXCLUDED.user_id,
        provider = EXCLUDED.provider,
        provider_user_id = EXCLUDED.provider_user_id,
        login_identifier = EXCLUDED.login_identifier,
        verified = EXCLUDED.verified,
        username = EXCLUDED.username,
        email = EXCLUDED.email,
        password_hash = EXCLUDED.password_hash,
        email_verified_at = EXCLUDED.email_verified_at,
        updated_at = EXCLUDED.updated_at
      `,
      [
        x.id,
        x.identityId,
        x.userId,
        x.provider,
        x.providerUserId ?? null,
        x.loginIdentifier,
        Boolean(x.verified),
        x.username ?? null,
        x.email ?? null,
        x.passwordHash ?? null,
        x.emailVerifiedAt ?? null,
        x.createdAt,
        x.updatedAt,
      ],
    );
  }

  for (const x of clients) {
    await client.query(
      `
      INSERT INTO auth_clients (
        id,
        code,
        name,
        status,
        created_at
      )
      VALUES ($1,$2,$3,$4,$5)
      ON CONFLICT (id)
      DO UPDATE SET
        code = EXCLUDED.code,
        name = EXCLUDED.name,
        status = EXCLUDED.status
      `,
      [
        x.id,
        x.code,
        x.name,
        x.status,
        x.createdAt,
      ],
    );
  }

  for (const x of serviceAccess) {
    await client.query(
      `
      INSERT INTO service_access (
        id,
        user_id,
        service,
        client_id,
        status,
        joined_at,
        last_access_at,
        created_at,
        updated_at
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      ON CONFLICT (id)
      DO UPDATE SET
        user_id = EXCLUDED.user_id,
        service = EXCLUDED.service,
        client_id = EXCLUDED.client_id,
        status = EXCLUDED.status,
        joined_at = EXCLUDED.joined_at,
        last_access_at = EXCLUDED.last_access_at,
        updated_at = EXCLUDED.updated_at
      `,
      [
        x.id,
        x.userId,
        x.service,
        x.clientId,
        x.status,
        x.joinedAt ?? null,
        x.lastAccessAt ?? null,
        x.createdAt,
        x.updatedAt,
      ],
    );
  }

  for (const x of consents) {
    await client.query(
      `
      INSERT INTO consents (
        id,
        user_id,
        client_id,
        consent_type,
        version,
        status,
        granted_at,
        revoked_at,
        created_at,
        updated_at
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      ON CONFLICT (id)
      DO UPDATE SET
        user_id = EXCLUDED.user_id,
        client_id = EXCLUDED.client_id,
        consent_type = EXCLUDED.consent_type,
        version = EXCLUDED.version,
        status = EXCLUDED.status,
        granted_at = EXCLUDED.granted_at,
        revoked_at = EXCLUDED.revoked_at,
        updated_at = EXCLUDED.updated_at
      `,
      [
        x.id,
        x.userId,
        x.clientId,
        x.consentType,
        x.version,
        x.status,
        x.grantedAt ?? null,
        x.revokedAt ?? null,
        x.createdAt,
        x.updatedAt,
      ],
    );
  }

  for (const x of emailTokens) {
    await client.query(
      `
      INSERT INTO email_verification_tokens (
        id,
        user_id,
        token_hash,
        expires_at,
        used_at,
        created_at
      )
      VALUES ($1,$2,$3,$4,$5,$6)
      ON CONFLICT (id)
      DO UPDATE SET
        user_id = EXCLUDED.user_id,
        token_hash = EXCLUDED.token_hash,
        expires_at = EXCLUDED.expires_at,
        used_at = EXCLUDED.used_at
      `,
      [
        x.id,
        x.userId,
        x.tokenHash,
        x.expiresAt,
        x.usedAt ?? null,
        x.createdAt,
      ],
    );
  }

  for (const x of resetTokens) {
    await client.query(
      `
      INSERT INTO password_reset_tokens (
        id,
        user_id,
        token_hash,
        expires_at,
        used_at,
        created_at
      )
      VALUES ($1,$2,$3,$4,$5,$6)
      ON CONFLICT (id)
      DO UPDATE SET
        user_id = EXCLUDED.user_id,
        token_hash = EXCLUDED.token_hash,
        expires_at = EXCLUDED.expires_at,
        used_at = EXCLUDED.used_at
      `,
      [
        x.id,
        x.userId,
        x.tokenHash,
        x.expiresAt,
        x.usedAt ?? null,
        x.createdAt,
      ],
    );
  }

  await client.query("COMMIT");

  console.log("✅ Identity PostgreSQL 마이그레이션 완료");
  console.log("unified_users =", unifiedUsers.length);
  console.log("login_identities =", loginIdentities.length);
  console.log("auth_clients =", clients.length);
  console.log("service_access =", serviceAccess.length);
  console.log("consents =", consents.length);
  console.log("email_verification_tokens =", emailTokens.length);
  console.log("password_reset_tokens =", resetTokens.length);
} catch (error) {
  await client.query("ROLLBACK");
  console.error(error);
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}
