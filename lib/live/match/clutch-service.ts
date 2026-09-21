import type {
  ClutchParticipantRecord,
  ClutchRepository,
  ClutchRoundRecord,
  ClutchRoundParticipantRecord,
  ClutchSessionRecord,
} from "./clutch-repository";

import {
  PostgresClutchRepository,
} from "./postgres-clutch-repository";

export type ClutchRoomSnapshot = {
  session: ClutchSessionRecord;
  participants: ClutchParticipantRecord[];
  round: ClutchRoundRecord | null;

  // FLATLIVE_CLUTCH_SNAPSHOT_ROUND_PARTICIPANTS_V12
  roundParticipants:
    ClutchRoundParticipantRecord[];

  scores: Record<string, number>;
};

export class ClutchService {
  constructor(
    private readonly repository:
      ClutchRepository =
        new PostgresClutchRepository(),
  ) {}

  async getSession(
    clutchId: string,
  ) {
    if (!clutchId.trim()) {
      return null;
    }

    return this.repository.findSessionById(
      clutchId.trim(),
    );
  }

  async createSession(
    clutchId: string,
    createdByUserId: string,
    roomId: string,
    nickname: string,
    avatarUrl?: string | null,
  ) {
    const cleanClutchId =
      clutchId.trim();

    const cleanUserId =
      createdByUserId.trim();

    const cleanRoomId =
      roomId.trim();

    const cleanNickname =
      nickname.trim();

    if (
      !cleanClutchId ||
      !cleanUserId ||
      !cleanRoomId ||
      !cleanNickname
    ) {
      throw new Error(
        "CLUTCH_CREATE_FIELDS_REQUIRED",
      );
    }

    return this.repository
      .createSessionWithCreator({
        clutchId: cleanClutchId,
        createdByUserId:
          cleanUserId,
        roomId: cleanRoomId,
        nickname: cleanNickname,
        avatarUrl:
          avatarUrl?.trim() || null,
      });
  }

  async inviteParticipant(
    clutchId: string,
    userId: string,
    roomId: string,
    nickname: string,
    avatarUrl?: string | null,
  ) {
    const cleanClutchId =
      clutchId.trim();

    const cleanUserId =
      userId.trim();

    const cleanRoomId =
      roomId.trim();

    const cleanNickname =
      nickname.trim();

    if (
      !cleanClutchId ||
      !cleanUserId ||
      !cleanRoomId ||
      !cleanNickname
    ) {
      throw new Error(
        "CLUTCH_INVITE_FIELDS_REQUIRED",
      );
    }

    return this.repository
      .inviteParticipant({
        clutchId: cleanClutchId,
        userId: cleanUserId,
        roomId: cleanRoomId,
        nickname: cleanNickname,
        avatarUrl:
          avatarUrl?.trim() || null,
      });
  }

  async acceptParticipant(
    clutchId: string,
    userId: string,
  ) {
    const cleanClutchId =
      clutchId.trim();

    const cleanUserId =
      userId.trim();

    if (
      !cleanClutchId ||
      !cleanUserId
    ) {
      throw new Error(
        "CLUTCH_ACCEPT_FIELDS_REQUIRED",
      );
    }

    return this.repository
      .acceptParticipant(
        cleanClutchId,
        cleanUserId,
      );
  }

  async rejectParticipant(
    clutchId: string,
    userId: string,
  ) {
    const cleanClutchId =
      clutchId.trim();

    const cleanUserId =
      userId.trim();

    if (
      !cleanClutchId ||
      !cleanUserId
    ) {
      throw new Error(
        "CLUTCH_REJECT_FIELDS_REQUIRED",
      );
    }

    return this.repository
      .rejectParticipant(
        cleanClutchId,
        cleanUserId,
      );
  }

  // FLATLIVE_CLUTCH_TEAM_SERVICE_V21
  async startRound(
    clutchId: string,
    userId: string,
    durationSeconds = 180,
    matchMode:
      "SOLO" | "TEAM" =
        "SOLO",
    teamAssignments: {
      userId: string;
      teamNo: 1 | 2;
      seatNo: 1 | 2 | 3 | 4;
    }[] = [],
  ) {
    const cleanClutchId =
      clutchId.trim();

    const cleanUserId =
      userId.trim();

    if (
      !cleanClutchId ||
      !cleanUserId
    ) {
      throw new Error(
        "CLUTCH_START_FIELDS_REQUIRED",
      );
    }

    const safeDuration =
      Math.max(
        30,
        Math.floor(
          Number.isFinite(
            durationSeconds,
          )
            ? durationSeconds
            : 180,
        ),
      );

    const safeMode =
      matchMode === "TEAM"
        ? "TEAM"
        : "SOLO";

    return this.repository
      .startRound({
        clutchId:
          cleanClutchId,

        startedByUserId:
          cleanUserId,

        durationSeconds:
          safeDuration,

        matchMode:
          safeMode,

        teamAssignments,
      });
  }

  async finishRound(
    clutchId: string,
    userId: string,
  ) {
    const cleanClutchId =
      clutchId.trim();

    const cleanUserId =
      userId.trim();

    if (
      !cleanClutchId ||
      !cleanUserId
    ) {
      throw new Error(
        "CLUTCH_FINISH_FIELDS_REQUIRED",
      );
    }

    return this.repository.finishRound({
      clutchId: cleanClutchId,
      finishedByUserId:
        cleanUserId,
    });
  }

  async leaveSession(
    clutchId: string,
    userId: string,
  ) {
    const cleanClutchId =
      clutchId.trim();

    const cleanUserId =
      userId.trim();

    if (
      !cleanClutchId ||
      !cleanUserId
    ) {
      throw new Error(
        "MATCH_LEAVE_FIELDS_REQUIRED",
      );
    }

    await this.repository
      .leaveParticipant(
        cleanClutchId,
        cleanUserId,
      );
  }

  async recordVerifiedDonationScore(
    input: {
      donationId: string;
      walletTransactionId: string;
      senderUserId: string;
      receiverUserId: string;
      flatAmount: number;
    },
  ) {
    const donationId =
      input.donationId.trim();

    const walletTransactionId =
      input.walletTransactionId.trim();

    const senderUserId =
      input.senderUserId.trim();

    const receiverUserId =
      input.receiverUserId.trim();

    const flatAmount =
      Math.floor(
        input.flatAmount,
      );

    if (
      !donationId ||
      !walletTransactionId ||
      !senderUserId ||
      !receiverUserId ||
      !Number.isSafeInteger(
        flatAmount,
      ) ||
      flatAmount <= 0
    ) {
      throw new Error(
        "CLUTCH_SCORE_INVALID",
      );
    }

    return this.repository
      .recordVerifiedDonationScore({
        donationId,
        walletTransactionId,
        senderUserId,
        receiverUserId,
        flatAmount,
      });
  }

  async getSessionSnapshot(
    clutchId: string,
  ): Promise<ClutchRoomSnapshot | null> {
    const cleanClutchId =
      clutchId.trim();

    if (!cleanClutchId) {
      return null;
    }

    const session =
      await this.repository
        .findSessionById(
          cleanClutchId,
        );

    if (!session) {
      return null;
    }

    const [
      participants,
      round,
    ] = await Promise.all([
      this.repository.listParticipants(
        session.clutchId,
      ),

      this.repository.findCurrentRound(
        session.clutchId,
      ),
    ]);

    // FLATLIVE_CLUTCH_ALL_SNAPSHOT_RETURNS_V12
    const [
      scores,
      roundParticipants,
    ] =
      round
        ? await Promise.all([
            this.repository
              .getRoundScores(
                round.roundId,
              ),

            this.repository
              .listRoundParticipants(
                round.roundId,
              ),
          ])
        : [
            {},
            [],
          ];

    return {
      session,
      participants,
      round,
      roundParticipants,
      scores,
    };
  }

  async listRoomInvites(
    roomId: string,
  ): Promise<ClutchRoomSnapshot[]> {
    const cleanRoomId =
      roomId.trim();

    if (!cleanRoomId) {
      return [];
    }

    const sessions =
      await this.repository
        .listInvitedSessionsByRoomId(
          cleanRoomId,
        );

    const snapshots =
      await Promise.all(
        sessions.map(
          async (session) => {
            const [
              participants,
              round,
            ] =
              await Promise.all([
                this.repository
                  .listParticipants(
                    session.clutchId,
                  ),

                this.repository
                  .findCurrentRound(
                    session.clutchId,
                  ),
              ]);

            // FLATLIVE_CLUTCH_INVITE_SNAPSHOT_V12
            const [
              scores,
              roundParticipants,
            ] =
              round
                ? await Promise.all([
                    this.repository
                      .getRoundScores(
                        round.roundId,
                      ),

                    this.repository
                      .listRoundParticipants(
                        round.roundId,
                      ),
                  ])
                : [
                    {},
                    [],
                  ];

            return {
              session,
              participants,
              round,
              roundParticipants,
              scores,
            };
          },
        ),
      );

    return snapshots;
  }

  async getRoomSnapshot(
    roomId: string,
  ): Promise<ClutchRoomSnapshot | null> {
    const normalizedRoomId =
      roomId.trim();

    if (!normalizedRoomId) {
      return null;
    }

    const session =
      await this.repository
        .findActiveSessionByRoomId(
          normalizedRoomId,
        );

    if (!session) {
      return null;
    }

    const [
      participants,
      round,
    ] = await Promise.all([
      this.repository.listParticipants(
        session.clutchId,
      ),

      this.repository.findCurrentRound(
        session.clutchId,
      ),
    ]);

    // FLATLIVE_CLUTCH_ALL_SNAPSHOT_RETURNS_V12
    const [
      scores,
      roundParticipants,
    ] =
      round
        ? await Promise.all([
            this.repository
              .getRoundScores(
                round.roundId,
              ),

            this.repository
              .listRoundParticipants(
                round.roundId,
              ),
          ])
        : [
            {},
            [],
          ];

    return {
      session,
      participants,
      round,
      roundParticipants,
      scores,
    };
  }



  // FLATLIVE_CLUTCH_STALE_PARTICIPATION_RECOVERY_V1
  async cleanupStaleActiveParticipations(
    userId: string,
    currentClutchId: string,
    isRoomAlive: (roomId: string) => boolean,
  ) {
    const cleanUserId = userId.trim();
    const cleanCurrentClutchId = currentClutchId.trim();

    if (!cleanUserId) {
      return { cleaned: 0, staleClutchIds: [] as string[] };
    }

    const active =
      await this.repository
        .listActiveParticipationsByUserId(
          cleanUserId,
        );

    const stale = active.filter((item) => {
      if (item.clutchId === cleanCurrentClutchId) {
        return false;
      }

      return !item.roomId || !isRoomAlive(item.roomId);
    });

    for (const item of stale) {
      await this.repository.leaveParticipant(
        item.clutchId,
        cleanUserId,
      );
    }

    return {
      cleaned: stale.length,
      staleClutchIds: stale.map((item) => item.clutchId),
    };
  }

  // FLATLIVE_CLUTCH_LEAVE_BY_ROOM_FINAL_V1
  async leaveByRoomId(
    roomId: string,
    userId: string,
  ) {
    const cleanRoomId =
      roomId.trim();

    const cleanUserId =
      userId.trim();

    if (
      !cleanRoomId ||
      !cleanUserId
    ) {
      return false;
    }

    const session =
      await this.repository
        .findActiveSessionByRoomId(
          cleanRoomId,
        );

    if (!session) {
      return false;
    }

    await this.repository
      .leaveParticipant(
        session.clutchId,
        cleanUserId,
      );

    return true;
  }

}

export const clutchService =
  new ClutchService();
