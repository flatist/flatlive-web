import { pgPool } from "@/lib/db/postgres";

export type LiveManagerRecord = {
  broadcasterUserId: string;
  managerUserId: string;
  createdByUserId: string;
  createdAt: Date;
};

let ensureTablePromise:
  Promise<void> | null = null;

async function ensureTable() {
  if (!ensureTablePromise) {
    ensureTablePromise =
      (async () => {
        await pgPool.query(`
          CREATE TABLE IF NOT EXISTS
            live_managers (
              broadcaster_user_id TEXT NOT NULL,
              manager_user_id TEXT NOT NULL,
              created_by_user_id TEXT NOT NULL,
              created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
              revoked_at TIMESTAMPTZ,
              revoked_by_user_id TEXT,

              CHECK (
                broadcaster_user_id <>
                manager_user_id
              )
            )
        `);

        await pgPool.query(`
          CREATE UNIQUE INDEX IF NOT EXISTS
            uq_live_managers_active
          ON live_managers (
            broadcaster_user_id,
            manager_user_id
          )
          WHERE revoked_at IS NULL
        `);

        await pgPool.query(`
          CREATE INDEX IF NOT EXISTS
            idx_live_managers_manager
          ON live_managers (
            manager_user_id
          )
          WHERE revoked_at IS NULL
        `);
      })().catch((error) => {
        ensureTablePromise = null;
        throw error;
      });
  }

  await ensureTablePromise;
}

export async function isLiveManager(
  broadcasterUserId: string,
  managerUserId: string,
) {
  const broadcaster =
    broadcasterUserId.trim();

  const manager =
    managerUserId.trim();

  if (
    !broadcaster ||
    !manager ||
    broadcaster === manager
  ) {
    return false;
  }

  await ensureTable();

  const result =
    await pgPool.query(
      `
        SELECT 1
        FROM live_managers
        WHERE broadcaster_user_id = $1
          AND manager_user_id = $2
          AND revoked_at IS NULL
        LIMIT 1
      `,
      [
        broadcaster,
        manager,
      ],
    );

  return result.rowCount === 1;
}

export async function canModerateLive(
  broadcasterUserId: string,
  actorUserId: string,
) {
  const broadcaster =
    broadcasterUserId.trim();

  const actor =
    actorUserId.trim();

  if (!broadcaster || !actor) {
    return false;
  }

  if (broadcaster === actor) {
    return true;
  }

  return isLiveManager(
    broadcaster,
    actor,
  );
}

export async function listLiveManagers(
  broadcasterUserId: string,
) {
  const broadcaster =
    broadcasterUserId.trim();

  if (!broadcaster) {
    return [];
  }

  await ensureTable();

  const result =
    await pgPool.query<{
      broadcaster_user_id: string;
      manager_user_id: string;
      created_by_user_id: string;
      created_at: Date;
    }>(
      `
        SELECT
          broadcaster_user_id,
          manager_user_id,
          created_by_user_id,
          created_at
        FROM live_managers
        WHERE broadcaster_user_id = $1
          AND revoked_at IS NULL
        ORDER BY created_at ASC
      `,
      [broadcaster],
    );

  return result.rows.map(
    (row): LiveManagerRecord => ({
      broadcasterUserId:
        row.broadcaster_user_id,
      managerUserId:
        row.manager_user_id,
      createdByUserId:
        row.created_by_user_id,
      createdAt:
        row.created_at,
    }),
  );
}

export async function assignLiveManager(
  input: {
    broadcasterUserId: string;
    managerUserId: string;
    actorUserId: string;
  },
) {
  const broadcaster =
    input.broadcasterUserId.trim();

  const manager =
    input.managerUserId.trim();

  const actor =
    input.actorUserId.trim();

  if (
    !broadcaster ||
    !manager ||
    !actor
  ) {
    throw new Error(
      "LIVE_MANAGER_REQUIRED",
    );
  }

  if (actor !== broadcaster) {
    throw new Error(
      "LIVE_MANAGER_ASSIGN_FORBIDDEN",
    );
  }

  if (manager === broadcaster) {
    throw new Error(
      "LIVE_MANAGER_SELF_NOT_ALLOWED",
    );
  }

  await ensureTable();

  await pgPool.query(
    `
      INSERT INTO live_managers (
        broadcaster_user_id,
        manager_user_id,
        created_by_user_id
      )
      SELECT $1, $2, $3
      WHERE NOT EXISTS (
        SELECT 1
        FROM live_managers
        WHERE broadcaster_user_id = $1
          AND manager_user_id = $2
          AND revoked_at IS NULL
      )
    `,
    [
      broadcaster,
      manager,
      actor,
    ],
  );

  return listLiveManagers(
    broadcaster,
  );
}

export async function revokeLiveManager(
  input: {
    broadcasterUserId: string;
    managerUserId: string;
    actorUserId: string;
  },
) {
  const broadcaster =
    input.broadcasterUserId.trim();

  const manager =
    input.managerUserId.trim();

  const actor =
    input.actorUserId.trim();

  if (actor !== broadcaster) {
    throw new Error(
      "LIVE_MANAGER_REVOKE_FORBIDDEN",
    );
  }

  await ensureTable();

  await pgPool.query(
    `
      UPDATE live_managers
      SET
        revoked_at = NOW(),
        revoked_by_user_id = $3
      WHERE broadcaster_user_id = $1
        AND manager_user_id = $2
        AND revoked_at IS NULL
    `,
    [
      broadcaster,
      manager,
      actor,
    ],
  );

  return listLiveManagers(
    broadcaster,
  );
}
