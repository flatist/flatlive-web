import { pgPool } from "@/lib/db/postgres";

import type {
  ClutchParticipantRecord,
  ClutchParticipantStatus,
  ClutchRepository,
  ClutchRoundRecord,
  ClutchRoundParticipantRecord,
  CreateClutchSessionInput,
  InviteClutchParticipantInput,
  StartClutchRoundInput,
  FinishClutchRoundInput,
  RecordVerifiedDonationScoreInput,
  ClutchRoundStatus,
  ClutchSessionRecord,
  ClutchSessionStatus,
  ClutchMatchMode,
  ActiveClutchParticipation,
} from "./clutch-repository";

type SessionRow = {
  clutch_id: string;
  status: ClutchSessionStatus;
  created_by_user_id: string;
  created_at: Date;
  updated_at: Date;
  ended_at: Date | null;
};

type ParticipantRow = {
  clutch_id: string;
  user_id: string;
  room_id: string;
  nickname: string;
  avatar_url: string | null;
  status: ClutchParticipantStatus;
  joined_at: Date | null;
  left_at: Date | null;
  created_at: Date;
};

type RoundRow = {
  round_id: string;
  clutch_id: string;
  round_number: number;
  status: ClutchRoundStatus;
  match_mode: ClutchMatchMode;
  duration_seconds: number;
  started_by_user_id: string | null;
  started_at: Date | null;
  ends_at: Date | null;
  finished_at: Date | null;
  created_at: Date;
};

// FLATLIVE_CLUTCH_ROUND_PARTICIPANT_ROW_V12
type RoundParticipantRow = {
  round_id: string;
  user_id: string;
  team_no: number | null;
  seat_no: number;
};

type ScoreRow = {
  receiver_user_id: string;
  score: string;
};

function mapSession(
  row: SessionRow,
): ClutchSessionRecord {
  return {
    clutchId: row.clutch_id,
    status: row.status,
    createdByUserId:
      row.created_by_user_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    endedAt: row.ended_at,
  };
}

function mapParticipant(
  row: ParticipantRow,
): ClutchParticipantRecord {
  return {
    clutchId: row.clutch_id,
    userId: row.user_id,
    roomId: row.room_id,
    nickname: row.nickname,
    avatarUrl: row.avatar_url,
    status: row.status,
    joinedAt: row.joined_at,
    leftAt: row.left_at,
    createdAt: row.created_at,
  };
}

// FLATLIVE_CLUTCH_MAP_ROUND_PARTICIPANT_V12
function mapRoundParticipant(
  row: RoundParticipantRow,
): ClutchRoundParticipantRecord {
  return {
    roundId:
      row.round_id,

    userId:
      row.user_id,

    teamNo:
      row.team_no === 1 ||
      row.team_no === 2
        ? row.team_no
        : null,

    seatNo:
      row.seat_no as
        1 | 2 | 3 | 4,
  };
}

function mapRound(
  row: RoundRow,
): ClutchRoundRecord {
  return {
    roundId: row.round_id,
    clutchId: row.clutch_id,
    roundNumber: row.round_number,
    status: row.status,
    matchMode: row.match_mode,
    durationSeconds:
      row.duration_seconds,
    startedByUserId:
      row.started_by_user_id,
    startedAt: row.started_at,
    endsAt: row.ends_at,
    finishedAt: row.finished_at,
    createdAt: row.created_at,
  };
}

export class PostgresClutchRepository
  implements ClutchRepository
{
  // FLATLIVE_CLUTCH_TEAM_START_SERVER_V21
  async startRound(
    input: StartClutchRoundInput,
  ) {
    const client =
      await pgPool.connect();

    try {
      await client.query(
        "BEGIN",
      );

      const session =
        await client.query<{
          status: string;
          created_by_user_id: string;
        }>(
          `
          SELECT
            status,
            created_by_user_id
          FROM clutch_sessions
          WHERE clutch_id = $1
          FOR UPDATE
          `,
          [
            input.clutchId,
          ],
        );

      if (!session.rows[0]) {
        throw new Error(
          "CLUTCH_NOT_FOUND",
        );
      }

      if (
        session.rows[0].status !==
          "READY" &&
        session.rows[0].status !==
          "INVITING"
      ) {
        throw new Error(
          "CLUTCH_NOT_READY",
        );
      }

      // FLATLIVE_CLUTCH_HOST_START_ONLY_V3
      if (
        session.rows[0].created_by_user_id !==
        input.startedByUserId
      ) {
        throw new Error(
          "CLUTCH_HOST_REQUIRED",
        );
      }

      const starter =
        await client.query(
          `
          SELECT 1
          FROM clutch_participants
          WHERE clutch_id = $1
            AND user_id = $2
            AND status = 'ACCEPTED'
          LIMIT 1
          `,
          [
            input.clutchId,
            input.startedByUserId,
          ],
        );

      if (!starter.rows[0]) {
        throw new Error(
          "CLUTCH_PARTICIPANT_REQUIRED",
        );
      }

      const accepted =
        await client.query<{
          user_id: string;
        }>(
          `
          SELECT user_id
          FROM clutch_participants
          WHERE clutch_id = $1
            AND status = 'ACCEPTED'
          ORDER BY
            joined_at ASC NULLS LAST,
            created_at ASC,
            user_id ASC
          `,
          [
            input.clutchId,
          ],
        );

      const participantCount =
        accepted.rows.length;

      if (
        participantCount < 2
      ) {
        throw new Error(
          "CLUTCH_NOT_ENOUGH_PARTICIPANTS",
        );
      }

      if (
        participantCount > 4
      ) {
        throw new Error(
          "CLUTCH_PARTICIPANT_LIMIT",
        );
      }

      const matchMode:
        ClutchMatchMode =
          input.matchMode === "TEAM"
            ? "TEAM"
            : "SOLO";

      const teamAssignments =
        input.teamAssignments ?? [];

      if (
        matchMode === "SOLO" &&
        teamAssignments.length > 0
      ) {
        throw new Error(
          "CLUTCH_SOLO_TEAM_ASSIGNMENTS_NOT_ALLOWED",
        );
      }

      if (
        matchMode === "TEAM"
      ) {
        if (
          participantCount !== 4
        ) {
          throw new Error(
            "CLUTCH_TEAM_REQUIRES_FOUR_PARTICIPANTS",
          );
        }

        if (
          teamAssignments.length !== 4
        ) {
          throw new Error(
            "CLUTCH_TEAM_ASSIGNMENTS_REQUIRED",
          );
        }

        const acceptedSet =
          new Set(
            accepted.rows.map(
              (row) =>
                row.user_id,
            ),
          );

        const userSet =
          new Set<string>();

        const seatSet =
          new Set<number>();

        let team1Count = 0;
        let team2Count = 0;

        for (
          const assignment
          of teamAssignments
        ) {
          const userId =
            assignment.userId.trim();

          if (
            !userId ||
            !acceptedSet.has(
              userId,
            )
          ) {
            throw new Error(
              "CLUTCH_TEAM_USER_NOT_ACCEPTED",
            );
          }

          if (
            userSet.has(
              userId,
            )
          ) {
            throw new Error(
              "CLUTCH_TEAM_DUPLICATE_USER",
            );
          }

          if (
            assignment.teamNo !== 1 &&
            assignment.teamNo !== 2
          ) {
            throw new Error(
              "CLUTCH_TEAM_INVALID_TEAM",
            );
          }

          if (
            assignment.seatNo < 1 ||
            assignment.seatNo > 4
          ) {
            throw new Error(
              "CLUTCH_TEAM_INVALID_SEAT",
            );
          }

          if (
            seatSet.has(
              assignment.seatNo,
            )
          ) {
            throw new Error(
              "CLUTCH_TEAM_DUPLICATE_SEAT",
            );
          }

          userSet.add(
            userId,
          );

          seatSet.add(
            assignment.seatNo,
          );

          if (
            assignment.teamNo === 1
          ) {
            team1Count += 1;
          } else {
            team2Count += 1;
          }
        }

        if (
          team1Count !== 2 ||
          team2Count !== 2
        ) {
          throw new Error(
            "CLUTCH_TEAM_MUST_BE_2V2",
          );
        }
      }

      const liveRound =
        await client.query(
          `
          SELECT round_id
          FROM clutch_rounds
          WHERE clutch_id = $1
            AND status = 'LIVE'
          LIMIT 1
          `,
          [
            input.clutchId,
          ],
        );

      if (
        liveRound.rows[0]
      ) {
        throw new Error(
          "CLUTCH_ALREADY_LIVE",
        );
      }

      const nextRound =
        await client.query<{
          round_number: number;
        }>(
          `
          SELECT
            COALESCE(
              MAX(round_number),
              0
            ) + 1
              AS round_number
          FROM clutch_rounds
          WHERE clutch_id = $1
          `,
          [
            input.clutchId,
          ],
        );

      const roundNumber =
        Number(
          nextRound.rows[0]
            ?.round_number ??
            1,
        );

      const durationSeconds =
        Math.max(
          30,
          Math.floor(
            input.durationSeconds ??
              180,
          ),
        );

      const roundId =
        `clutch_round_${crypto.randomUUID()}`;

      const result =
        await client.query<RoundRow>(
          `
          INSERT INTO clutch_rounds (
            round_id,
            clutch_id,
            round_number,
            status,
            match_mode,
            duration_seconds,
            started_by_user_id,
            started_at,
            ends_at
          )
          VALUES (
            $1,
            $2,
            $3,
            'LIVE',
            $4,
            $5::integer,
            $6,
            NOW(),
            NOW() +
              (
                $5 *
                INTERVAL '1 second'
              )
          )
          RETURNING
            round_id,
            clutch_id,
            round_number,
            status,
            match_mode,
            duration_seconds,
            started_by_user_id,
            started_at,
            ends_at,
            finished_at,
            created_at
          `,
          [
            roundId,
            input.clutchId,
            roundNumber,
            matchMode,
            durationSeconds,
            input.startedByUserId,
          ],
        );

      if (
        matchMode === "TEAM"
      ) {
        for (
          const assignment
          of teamAssignments
        ) {
          await client.query(
            `
            INSERT INTO
              clutch_round_participants (
                round_id,
                user_id,
                team_no,
                seat_no
              )
            VALUES (
              $1,
              $2,
              $3,
              $4
            )
            `,
            [
              roundId,
              assignment.userId.trim(),
              assignment.teamNo,
              assignment.seatNo,
            ],
          );
        }
      } else {
        for (
          let index = 0;
          index <
            accepted.rows.length;
          index += 1
        ) {
          const participant =
            accepted.rows[index];

          await client.query(
            `
            INSERT INTO
              clutch_round_participants (
                round_id,
                user_id,
                team_no,
                seat_no
              )
            VALUES (
              $1,
              $2,
              NULL,
              $3
            )
            `,
            [
              roundId,
              participant.user_id,
              index + 1,
            ],
          );
        }
      }

      await client.query(
        `
        UPDATE clutch_sessions
        SET
          status = 'LIVE',
          updated_at = NOW()
        WHERE clutch_id = $1
        `,
        [
          input.clutchId,
        ],
      );

      const row =
        result.rows[0];

      if (!row) {
        throw new Error(
          "CLUTCH_ROUND_CREATE_FAILED",
        );
      }

      await client.query(
        "COMMIT",
      );

      return mapRound(
        row,
      );

    } catch (error) {

      await client.query(
        "ROLLBACK",
      );

      throw error;

    } finally {

      client.release();

    }
  }

  async finishRound(
    input: FinishClutchRoundInput,
  ) {
    const client =
      await pgPool.connect();

    try {
      await client.query("BEGIN");

      const participant =
        await client.query(
          `
          SELECT 1
          FROM clutch_participants
          WHERE clutch_id = $1
            AND user_id = $2
            AND status = 'ACCEPTED'
          LIMIT 1
          `,
          [
            input.clutchId,
            input.finishedByUserId,
          ],
        );

      if (!participant.rows[0]) {
        throw new Error(
          "CLUTCH_PARTICIPANT_REQUIRED",
        );
      }

      const current =
        await client.query<RoundRow>(
          `
          SELECT
            round_id,
            clutch_id,
            round_number,
            status,
            match_mode,
            duration_seconds,
            started_by_user_id,
            started_at,
            ends_at,
            finished_at,
            created_at
          FROM clutch_rounds
          WHERE clutch_id = $1
            AND status = 'LIVE'
          ORDER BY round_number DESC
          LIMIT 1
          FOR UPDATE
          `,
          [input.clutchId],
        );

      const active =
        current.rows[0];

      if (!active) {
        throw new Error(
          "CLUTCH_ROUND_NOT_LIVE",
        );
      }

      const result =
        await client.query<RoundRow>(
          `
          UPDATE clutch_rounds
          SET
            status = 'FINISHED',
            finished_at = NOW()
          WHERE round_id = $1
          RETURNING
            round_id,
            clutch_id,
            round_number,
            status,
            match_mode,
            duration_seconds,
            started_by_user_id,
            started_at,
            ends_at,
            finished_at,
            created_at
          `,
          [active.round_id],
        );

      await client.query(
        `
        UPDATE clutch_sessions
        SET
          status = 'READY',
          updated_at = NOW()
        WHERE clutch_id = $1
        `,
        [input.clutchId],
      );

      await client.query("COMMIT");

      const row = result.rows[0];

      if (!row) {
        throw new Error(
          "CLUTCH_ROUND_FINISH_FAILED",
        );
      }

      return mapRound(row);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async createSessionWithCreator(
    input: CreateClutchSessionInput,
  ) {
    const client =
      await pgPool.connect();

    try {
      await client.query("BEGIN");

      const existingRoom =
        await client.query<{
          clutch_id: string;
        }>(
          `
          SELECT
            s.clutch_id
          FROM clutch_sessions s
          JOIN clutch_participants p
            ON p.clutch_id = s.clutch_id
          WHERE p.room_id = $1
            AND p.status = 'ACCEPTED'
            AND s.status IN (
              'INVITING',
              'READY',
              'LIVE'
            )
          LIMIT 1
          FOR UPDATE OF s
          `,
          [input.roomId],
        );

      if (existingRoom.rows.length > 0) {
        throw new Error(
          "이 LIVE 방은 이미 다른 클러치에 참여 중입니다.",
        );
      }

      const sessionResult =
        await client.query<SessionRow>(
          `
          INSERT INTO clutch_sessions (
            clutch_id,
            status,
            created_by_user_id
          )
          VALUES (
            $1,
            'INVITING',
            $2
          )
          RETURNING
            clutch_id,
            status,
            created_by_user_id,
            created_at,
            updated_at,
            ended_at
          `,
          [
            input.clutchId,
            input.createdByUserId,
          ],
        );

      await client.query(
        `
        INSERT INTO clutch_participants (
          clutch_id,
          user_id,
          room_id,
          nickname,
          avatar_url,
          status,
          joined_at
        )
        VALUES (
          $1,
          $2,
          $3,
          $4,
          $5,
          'ACCEPTED',
          NOW()
        )
        `,
        [
          input.clutchId,
          input.createdByUserId,
          input.roomId,
          input.nickname,
          input.avatarUrl ?? null,
        ],
      );

      await client.query("COMMIT");

      const row =
        sessionResult.rows[0];

      if (!row) {
        throw new Error(
          "클러치 세션 생성 결과가 없습니다.",
        );
      }

      return mapSession(row);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async inviteParticipant(
    input: InviteClutchParticipantInput,
  ) {
    const result =
      await pgPool.query<ParticipantRow>(
        `
        INSERT INTO clutch_participants (
          clutch_id,
          user_id,
          room_id,
          nickname,
          avatar_url,
          status,
          joined_at
        )
        VALUES (
          $1,
          $2,
          $3,
          $4,
          $5,
          'INVITED',
          NULL
        )
        ON CONFLICT (
          clutch_id,
          user_id
        )
        DO UPDATE SET
          room_id = EXCLUDED.room_id,
          nickname = EXCLUDED.nickname,
          avatar_url = EXCLUDED.avatar_url,
          status = CASE
            WHEN clutch_participants.status
              IN ('REJECTED', 'LEFT')
            THEN 'INVITED'
            ELSE clutch_participants.status
          END,
          left_at = NULL
        RETURNING
          clutch_id,
          user_id,
          room_id,
          nickname,
          avatar_url,
          status,
          joined_at,
          left_at,
          created_at
        `,
        [
          input.clutchId,
          input.userId,
          input.roomId,
          input.nickname,
          input.avatarUrl ?? null,
        ],
      );

    const row = result.rows[0];

    if (!row) {
      throw new Error(
        "클러치 초대 저장 결과가 없습니다.",
      );
    }

    return mapParticipant(row);
  }

  async acceptParticipant(
    clutchId: string,
    userId: string,
  ) {
    const client =
      await pgPool.connect();

    try {
      await client.query("BEGIN");

      const participantResult =
        await client.query<ParticipantRow>(
          `
          SELECT
            clutch_id,
            user_id,
            room_id,
            nickname,
            avatar_url,
            status,
            joined_at,
            left_at,
            created_at
          FROM clutch_participants
          WHERE clutch_id = $1
            AND user_id = $2
          FOR UPDATE
          `,
          [
            clutchId,
            userId,
          ],
        );

      const participant =
        participantResult.rows[0];

      if (!participant) {
        throw new Error(
          "클러치 초대를 찾을 수 없습니다.",
        );
      }

      // FLATLIVE_CLUTCH_ACCEPT_IDEMPOTENT_V1
      const alreadyAccepted =
        participant.status === "ACCEPTED";

      if (
        !alreadyAccepted &&
        participant.status !== "INVITED"
      ) {
        throw new Error(
          "수락할 수 있는 클러치 초대 상태가 아닙니다.",
        );
      }

      const sessionResult =
        await client.query<SessionRow>(
          `
          SELECT
            clutch_id,
            status,
            created_by_user_id,
            created_at,
            updated_at,
            ended_at
          FROM clutch_sessions
          WHERE clutch_id = $1
          FOR UPDATE
          `,
          [clutchId],
        );

      const session =
        sessionResult.rows[0];

      if (!session) {
        throw new Error(
          "클러치 세션을 찾을 수 없습니다.",
        );
      }

      // 이미 ACCEPTED인 동일 초대의 재요청은
      // INVITING / READY / LIVE 상태에서 성공으로 처리한다.
      if (alreadyAccepted) {
        if (
          session.status !== "INVITING" &&
          session.status !== "READY" &&
          session.status !== "LIVE"
        ) {
          throw new Error(
            "현재 상태에서는 기존 클러치 연결을 복구할 수 없습니다.",
          );
        }

        await client.query("COMMIT");

        return mapParticipant(
          participant,
        );
      }

      // 최초 INVITED -> ACCEPTED 전환은
      // INVITING / READY 상태에서만 허용한다.
      if (
        session.status !== "INVITING" &&
        session.status !== "READY"
      ) {
        throw new Error(
          "현재 상태에서는 클러치 초대를 수락할 수 없습니다.",
        );
      }

      const otherActive =
        await client.query<{
          clutch_id: string;
        }>(
          `
          SELECT
            s.clutch_id
          FROM clutch_sessions s
          JOIN clutch_participants p
            ON p.clutch_id = s.clutch_id
          WHERE p.user_id = $1
            AND p.status = 'ACCEPTED'
            AND s.clutch_id <> $2
            AND s.status IN (
              'INVITING',
              'READY',
              'LIVE'
            )
          LIMIT 1
          `,
          [
            userId,
            clutchId,
          ],
        );

      if (
        otherActive.rows.length > 0
      ) {
        throw new Error(
          "이미 다른 클러치에 참여 중입니다.",
        );
      }

      const countResult =
        await client.query<{
          count: string;
        }>(
          `
          SELECT
            COUNT(*)::text AS count
          FROM clutch_participants
          WHERE clutch_id = $1
            AND status = 'ACCEPTED'
          `,
          [clutchId],
        );

      const acceptedCount =
        Number(
          countResult.rows[0]?.count ??
            "0",
        );

      if (acceptedCount >= 4) {
        throw new Error(
          "클러치는 최대 4명까지 참여할 수 있습니다.",
        );
      }

      const acceptedResult =
        await client.query<ParticipantRow>(
          `
          UPDATE clutch_participants
          SET
            status = 'ACCEPTED',
            joined_at = NOW(),
            left_at = NULL
          WHERE clutch_id = $1
            AND user_id = $2
          RETURNING
            clutch_id,
            user_id,
            room_id,
            nickname,
            avatar_url,
            status,
            joined_at,
            left_at,
            created_at
          `,
          [
            clutchId,
            userId,
          ],
        );

      await client.query(
        `
        UPDATE clutch_sessions
        SET
          status = 'READY',
          updated_at = NOW()
        WHERE clutch_id = $1
        `,
        [clutchId],
      );

      await client.query("COMMIT");

      const row =
        acceptedResult.rows[0];

      if (!row) {
        throw new Error(
          "클러치 수락 결과가 없습니다.",
        );
      }

      return mapParticipant(row);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  // FLATLIVE_CLUTCH_REJECT_LIFECYCLE_V1
  async rejectParticipant(
    clutchId: string,
    userId: string,
  ) {
    const client =
      await pgPool.connect();

    try {
      await client.query("BEGIN");

      const participantResult =
        await client.query<ParticipantRow>(
          `
          UPDATE clutch_participants
          SET
            status = 'REJECTED',
            joined_at = NULL,
            left_at = NOW()
          WHERE clutch_id = $1
            AND user_id = $2
            AND status = 'INVITED'
          RETURNING
            clutch_id,
            user_id,
            room_id,
            nickname,
            avatar_url,
            status,
            joined_at,
            left_at,
            created_at
          `,
          [
            clutchId,
            userId,
          ],
        );

      const row =
        participantResult.rows[0];

      if (!row) {
        throw new Error(
          "거절할 수 있는 클러치 초대를 찾을 수 없습니다.",
        );
      }

      const counts =
        await client.query<{
          accepted_count: string;
          invited_count: string;
        }>(
          `
          SELECT
            COUNT(*) FILTER (
              WHERE status = 'ACCEPTED'
            )::text AS accepted_count,

            COUNT(*) FILTER (
              WHERE status = 'INVITED'
            )::text AS invited_count

          FROM clutch_participants
          WHERE clutch_id = $1
          `,
          [clutchId],
        );

      const acceptedCount =
        Number(
          counts.rows[0]?.accepted_count ??
            "0",
        );

      const invitedCount =
        Number(
          counts.rows[0]?.invited_count ??
            "0",
        );

      if (
        acceptedCount < 2 &&
        invitedCount === 0
      ) {
        await client.query(
          `
          UPDATE clutch_sessions
          SET
            status = 'CANCELLED',
            updated_at = NOW(),
            ended_at = NOW()
          WHERE clutch_id = $1
            AND status IN (
              'INVITING',
              'READY'
            )
          `,
          [clutchId],
        );
      } else if (
        acceptedCount >= 2
      ) {
        await client.query(
          `
          UPDATE clutch_sessions
          SET
            status = 'READY',
            updated_at = NOW()
          WHERE clutch_id = $1
            AND status IN (
              'INVITING',
              'READY'
            )
          `,
          [clutchId],
        );
      }

      await client.query("COMMIT");

      return mapParticipant(row);

    } catch (error) {
      await client.query("ROLLBACK");
      throw error;

    } finally {
      client.release();
    }
  }

  async findSessionById(
    clutchId: string,
  ) {
    const result =
      await pgPool.query<SessionRow>(
        `
        SELECT
          clutch_id,
          status,
          created_by_user_id,
          created_at,
          updated_at,
          ended_at
        FROM clutch_sessions
        WHERE clutch_id = $1
        LIMIT 1
        `,
        [clutchId],
      );

    const row = result.rows[0];

    return row
      ? mapSession(row)
      : null;
  }

  async listInvitedSessionsByRoomId(
    roomId: string,
  ) {
    const result =
      await pgPool.query<SessionRow>(
        `
        SELECT DISTINCT
          s.clutch_id,
          s.status,
          s.created_by_user_id,
          s.created_at,
          s.updated_at,
          s.ended_at
        FROM clutch_sessions s
        JOIN clutch_participants p
          ON p.clutch_id = s.clutch_id
        WHERE p.room_id = $1
          AND p.status = 'INVITED'
          AND s.status IN (
            'INVITING',
            'READY'
          )
        ORDER BY s.created_at DESC
        `,
        [roomId],
      );

    return result.rows.map(
      mapSession,
    );
  }

  async leaveParticipant(
    clutchId: string,
    userId: string,
  ) {
    const client =
      await pgPool.connect();

    try {
      await client.query("BEGIN");

      const session =
        await client.query<{
          status: string;
        }>(
          `
          SELECT status
          FROM clutch_sessions
          WHERE clutch_id = $1
          FOR UPDATE
          `,
          [clutchId],
        );

      if (!session.rows[0]) {
        throw new Error(
          "MATCH_NOT_FOUND",
        );
      }

      const left =
        await client.query(
          `
          UPDATE clutch_participants
          SET
            status = 'LEFT',
            left_at = NOW()
          WHERE clutch_id = $1
            AND user_id = $2
            AND status = 'ACCEPTED'
          RETURNING user_id
          `,
          [
            clutchId,
            userId,
          ],
        );

      if (!left.rows[0]) {
        throw new Error(
          "MATCH_PARTICIPANT_NOT_FOUND",
        );
      }

      const remaining =
        await client.query<{
          count: string;
        }>(
          `
          SELECT
            COUNT(*)::text AS count
          FROM clutch_participants
          WHERE clutch_id = $1
            AND status = 'ACCEPTED'
          `,
          [clutchId],
        );

      const count =
        Number(
          remaining.rows[0]?.count ??
            0,
        );

      if (count < 2) {
        await client.query(
          `
          UPDATE clutch_rounds
          SET
            status = 'FINISHED',
            finished_at =
              COALESCE(
                finished_at,
                NOW()
              )
          WHERE clutch_id = $1
            AND status = 'LIVE'
          `,
          [clutchId],
        );

        await client.query(
          `
          UPDATE clutch_sessions
          SET
            status = 'FINISHED',
            ended_at =
              COALESCE(
                ended_at,
                NOW()
              ),
            updated_at = NOW()
          WHERE clutch_id = $1
          `,
          [clutchId],
        );
      } else if (
        session.rows[0].status !==
        "LIVE"
      ) {
        await client.query(
          `
          UPDATE clutch_sessions
          SET
            status = 'READY',
            updated_at = NOW()
          WHERE clutch_id = $1
          `,
          [clutchId],
        );
      }

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }


  // FLATLIVE_CLUTCH_STALE_PARTICIPATION_RECOVERY_V1
  async listActiveParticipationsByUserId(
    userId: string,
  ): Promise<ActiveClutchParticipation[]> {
    const cleanUserId = userId.trim();

    if (!cleanUserId) {
      return [];
    }

    const result =
      await pgPool.query<{
        clutch_id: string;
        room_id: string;
      }>(
        `
        SELECT
          s.clutch_id,
          p.room_id
        FROM clutch_sessions s
        JOIN clutch_participants p
          ON p.clutch_id = s.clutch_id
        WHERE p.user_id = $1
          AND p.status = 'ACCEPTED'
          AND s.status IN (
            'INVITING',
            'READY',
            'LIVE'
          )
        ORDER BY s.created_at DESC
        `,
        [cleanUserId],
      );

    return result.rows.map((row) => ({
      clutchId: row.clutch_id,
      roomId: row.room_id,
    }));
  }

  async findActiveSessionByRoomId(
    roomId: string,
  ) {
    const result =
      await pgPool.query<SessionRow>(
        `
        SELECT
          s.clutch_id,
          s.status,
          s.created_by_user_id,
          s.created_at,
          s.updated_at,
          s.ended_at
        FROM clutch_sessions s
        JOIN clutch_participants p
          ON p.clutch_id = s.clutch_id
        WHERE p.room_id = $1
          AND p.status = 'ACCEPTED'
          AND s.status IN (
            'INVITING',
            'READY',
            'LIVE'
          )
        ORDER BY s.created_at DESC
        LIMIT 1
        `,
        [roomId],
      );

    const row = result.rows[0];

    return row
      ? mapSession(row)
      : null;
  }

  async listParticipants(
    clutchId: string,
  ) {
    const result =
      await pgPool.query<ParticipantRow>(
        `
        SELECT
          clutch_id,
          user_id,
          room_id,
          nickname,
          avatar_url,
          status,
          joined_at,
          left_at,
          created_at
        FROM clutch_participants
        WHERE clutch_id = $1
        ORDER BY created_at ASC
        `,
        [clutchId],
      );

    return result.rows.map(
      mapParticipant,
    );
  }

  async findCurrentRound(
    clutchId: string,
  ) {
    const result =
      await pgPool.query<RoundRow>(
        `
        SELECT
          round_id,
          clutch_id,
          round_number,
          status,
          match_mode,
          duration_seconds,
          started_by_user_id,
          started_at,
          ends_at,
          finished_at,
          created_at
        FROM clutch_rounds
        WHERE clutch_id = $1
          AND status IN (
            'READY',
            'LIVE'
          )
        ORDER BY round_number DESC
        LIMIT 1
        `,
        [clutchId],
      );

    const row = result.rows[0];

    return row
      ? mapRound(row)
      : null;
  }

  // FLATLIVE_CLUTCH_LIST_ROUND_PARTICIPANTS_PG_V12
  async listRoundParticipants(
    roundId: string,
  ) {
    const result =
      await pgPool.query<
        RoundParticipantRow
      >(
        `
        SELECT
          round_id,
          user_id,
          team_no,
          seat_no
        FROM clutch_round_participants
        WHERE round_id = $1
        ORDER BY seat_no ASC
        `,
        [
          roundId,
        ],
      );

    return result.rows.map(
      mapRoundParticipant,
    );
  }

  async recordVerifiedDonationScore(
    input: RecordVerifiedDonationScoreInput,
  ) {
    const client =
      await pgPool.connect();

    try {
      await client.query("BEGIN");

      const target =
        await client.query<{
          clutch_id: string;
          round_id: string;
          room_id: string;
        }>(
          `
          SELECT
            s.clutch_id,
            r.round_id,
            p.room_id
          FROM clutch_sessions s
          JOIN clutch_participants p
            ON p.clutch_id =
              s.clutch_id
          JOIN clutch_rounds r
            ON r.clutch_id =
              s.clutch_id
          WHERE s.status = 'LIVE'
            AND r.status = 'LIVE'
            AND p.status = 'ACCEPTED'
            AND p.user_id = $1
          ORDER BY
            r.started_at DESC
          LIMIT 1
          FOR UPDATE OF s, r
          `,
          [
            input.receiverUserId,
          ],
        );

      const row = target.rows[0];

      if (!row) {
        await client.query(
          "ROLLBACK",
        );

        return false;
      }

      const result =
        await client.query(
          `
          INSERT INTO clutch_score_events (
            score_event_id,
            clutch_id,
            round_id,
            receiver_user_id,
            sender_user_id,
            room_id,
            donation_id,
            wallet_transaction_id,
            flat_amount,
            score
          )
          VALUES (
            $1,
            $2,
            $3,
            $4,
            $5,
            $6,
            $7,
            $8,
            $9,
            $9
          )
          ON CONFLICT (
            donation_id
          )
          DO NOTHING
          RETURNING score_event_id
          `,
          [
            `clutch_score_${crypto.randomUUID()}`,
            row.clutch_id,
            row.round_id,
            input.receiverUserId,
            input.senderUserId,
            row.room_id,
            input.donationId,
            input.walletTransactionId,
            input.flatAmount,
          ],
        );

      await client.query("COMMIT");

      return result.rows.length > 0;
    } catch (error) {
      await client.query("ROLLBACK");

      const pgError =
        error as {
          code?: string;
          constraint?: string;
        };

      if (
        pgError.code === "23505" &&
        pgError.constraint ===
          "uq_clutch_score_wallet_transaction"
      ) {
        return false;
      }

      throw error;
    } finally {
      client.release();
    }
  }

  async getRoundScores(
    roundId: string,
  ) {
    const result =
      await pgPool.query<ScoreRow>(
        `
        SELECT
          receiver_user_id,
          score::text AS score
        FROM clutch_round_score_totals
        WHERE round_id = $1
        `,
        [roundId],
      );

    const scores:
      Record<string, number> = {};

    for (const row of result.rows) {
      scores[row.receiver_user_id] =
        Number(row.score);
    }

    return scores;
  }
}
