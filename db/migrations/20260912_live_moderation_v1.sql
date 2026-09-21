BEGIN;

CREATE TABLE IF NOT EXISTS live_viewer_bans (
  ban_id TEXT PRIMARY KEY,
  broadcaster_user_id TEXT NOT NULL,
  room_id TEXT,
  target_user_id TEXT,
  target_guest_id TEXT,

  scope TEXT NOT NULL
    CHECK (scope IN ('ROOM', 'BROADCASTER')),

  duration_type TEXT NOT NULL
    CHECK (
      duration_type IN (
        'ROOM',
        'ONE_DAY',
        'PERMANENT'
      )
    ),

  reason TEXT NOT NULL,
  reason_detail TEXT NOT NULL DEFAULT '',

  actor_user_id TEXT NOT NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,

  revoked_at TIMESTAMPTZ,
  revoked_by_user_id TEXT,

  CHECK (
    target_user_id IS NOT NULL
    OR target_guest_id IS NOT NULL
  )
);

CREATE INDEX IF NOT EXISTS
  idx_live_viewer_bans_user
ON live_viewer_bans (
  broadcaster_user_id,
  target_user_id
);

CREATE INDEX IF NOT EXISTS
  idx_live_viewer_bans_guest
ON live_viewer_bans (
  broadcaster_user_id,
  target_guest_id
);

CREATE INDEX IF NOT EXISTS
  idx_live_viewer_bans_room
ON live_viewer_bans (
  room_id
);

COMMIT;
