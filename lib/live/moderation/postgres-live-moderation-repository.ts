import { pgPool } from "@/lib/db/postgres";

import type {
  LiveBanDuration,
  LiveBanReason,
  LiveBanScope,
  LiveViewerBanRecord,
} from "./live-moderation-types";

type BanRow = {
  ban_id: string;
  broadcaster_user_id: string;
  room_id: string | null;
  target_user_id: string | null;
  target_guest_id: string | null;
  scope: LiveBanScope;
  duration_type: LiveBanDuration;
  reason: LiveBanReason;
  reason_detail: string;
  actor_user_id: string;
  created_at: Date;
  expires_at: Date | null;
  revoked_at: Date | null;
  revoked_by_user_id: string | null;
};

function mapBan(
  row: BanRow,
): LiveViewerBanRecord {
  return {
    banId: row.ban_id,
    broadcasterUserId:
      row.broadcaster_user_id,
    roomId: row.room_id,
    targetUserId:
      row.target_user_id,
    targetGuestId:
      row.target_guest_id,
    scope: row.scope,
    durationType:
      row.duration_type,
    reason: row.reason,
    reasonDetail:
      row.reason_detail,
    actorUserId:
      row.actor_user_id,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    revokedAt: row.revoked_at,
    revokedByUserId:
      row.revoked_by_user_id,
  };
}

export class PostgresLiveModerationRepository {
  async createBan(input: {
    banId: string;
    broadcasterUserId: string;
    roomId: string | null;
    targetUserId: string | null;
    targetGuestId: string | null;
    scope: LiveBanScope;
    durationType: LiveBanDuration;
    reason: LiveBanReason;
    reasonDetail: string;
    actorUserId: string;
    expiresAt: Date | null;
  }) {
    const result =
      await pgPool.query<BanRow>(
        `
        INSERT INTO live_viewer_bans (
          ban_id,
          broadcaster_user_id,
          room_id,
          target_user_id,
          target_guest_id,
          scope,
          duration_type,
          reason,
          reason_detail,
          actor_user_id,
          expires_at
        )
        VALUES (
          $1,$2,$3,$4,$5,
          $6,$7,$8,$9,$10,$11
        )
        RETURNING *
        `,
        [
          input.banId,
          input.broadcasterUserId,
          input.roomId,
          input.targetUserId,
          input.targetGuestId,
          input.scope,
          input.durationType,
          input.reason,
          input.reasonDetail,
          input.actorUserId,
          input.expiresAt,
        ],
      );

    return mapBan(result.rows[0]);
  }

  async findActiveBan(input: {
    broadcasterUserId: string;
    roomId: string;
    targetUserId?: string;
    targetGuestId?: string;
  }) {
    const userId =
      input.targetUserId?.trim() || "";

    const guestId =
      input.targetGuestId?.trim() || "";

    if (!userId && !guestId) {
      return null;
    }

    const result =
      await pgPool.query<BanRow>(
        `
        SELECT *
        FROM live_viewer_bans
        WHERE broadcaster_user_id = $1
          AND revoked_at IS NULL
          AND (
            expires_at IS NULL
            OR expires_at > NOW()
          )
          AND (
            (
              $2 <> ''
              AND target_user_id = $2
            )
            OR
            (
              $3 <> ''
              AND target_guest_id = $3
            )
          )
          AND scope = 'BROADCASTER'
        ORDER BY created_at DESC
        LIMIT 1
        `,
        [
          input.broadcasterUserId,
          userId,
          guestId,
        ],
      );

    return result.rows[0]
      ? mapBan(result.rows[0])
      : null;
  }

  async listActiveByBroadcaster(
    broadcasterUserId: string,
  ) {
    const result =
      await pgPool.query<BanRow>(
        `
        SELECT *
        FROM live_viewer_bans
        WHERE broadcaster_user_id = $1
          AND revoked_at IS NULL
          AND scope = 'BROADCASTER'
          AND (
            expires_at IS NULL
            OR expires_at > NOW()
          )
        ORDER BY created_at DESC
        LIMIT 500
        `,
        [broadcasterUserId],
      );

    return result.rows.map(mapBan);
  }

  async revokeBan(input: {
    banId: string;
    broadcasterUserId: string;
    actorUserId: string;
  }) {
    const result =
      await pgPool.query<BanRow>(
        `
        UPDATE live_viewer_bans
        SET
          revoked_at = NOW(),
          revoked_by_user_id = $3
        WHERE ban_id = $1
          AND broadcaster_user_id = $2
          AND revoked_at IS NULL
        RETURNING *
        `,
        [
          input.banId,
          input.broadcasterUserId,
          input.actorUserId,
        ],
      );

    return result.rows[0]
      ? mapBan(result.rows[0])
      : null;
  }
}
