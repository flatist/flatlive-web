BEGIN;

CREATE TABLE IF NOT EXISTS live_managers (
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
);

CREATE UNIQUE INDEX IF NOT EXISTS
  uq_live_managers_active
ON live_managers (
  broadcaster_user_id,
  manager_user_id
)
WHERE revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS
  idx_live_managers_manager
ON live_managers (
  manager_user_id
)
WHERE revoked_at IS NULL;

COMMIT;
