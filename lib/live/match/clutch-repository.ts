export type ClutchSessionStatus =
  | "INVITING"
  | "READY"
  | "LIVE"
  | "FINISHED"
  | "CANCELLED";

export type ClutchParticipantStatus =
  | "INVITED"
  | "ACCEPTED"
  | "REJECTED"
  | "LEFT";


export type ActiveClutchParticipation = {
  clutchId: string;
  roomId: string;
};

export type ClutchParticipantRecord = {
  clutchId: string;
  userId: string;
  roomId: string;
  nickname: string;
  avatarUrl: string | null;
  status: ClutchParticipantStatus;
  joinedAt: Date | null;
  leftAt: Date | null;
  createdAt: Date;
};

export type ClutchSessionRecord = {
  clutchId: string;
  status: ClutchSessionStatus;
  createdByUserId: string;
  createdAt: Date;
  updatedAt: Date;
  endedAt: Date | null;
};

export type ClutchRoundStatus =
  | "READY"
  | "LIVE"
  | "FINISHED";


export type ClutchMatchMode =
  | "SOLO"
  | "TEAM";

export type ClutchTeamAssignmentInput = {
  userId: string;
  teamNo: 1 | 2;
  seatNo: 1 | 2 | 3 | 4;
};


/* FLATLIVE_CLUTCH_ROUND_PARTICIPANT_RECORD_V12 */
export type ClutchRoundParticipantRecord = {
  roundId: string;
  userId: string;
  teamNo: 1 | 2 | null;
  seatNo: 1 | 2 | 3 | 4;
};

export type ClutchRoundRecord = {
  roundId: string;
  clutchId: string;
  roundNumber: number;
  status: ClutchRoundStatus;
  matchMode: ClutchMatchMode;
  durationSeconds: number;
  startedByUserId: string | null;
  startedAt: Date | null;
  endsAt: Date | null;
  finishedAt: Date | null;
  createdAt: Date;
};

export type CreateClutchSessionInput = {
  clutchId: string;
  createdByUserId: string;
  roomId: string;
  nickname: string;
  avatarUrl?: string | null;
};

export type InviteClutchParticipantInput = {
  clutchId: string;
  userId: string;
  roomId: string;
  nickname: string;
  avatarUrl?: string | null;
};

export type StartClutchRoundInput = {
  clutchId: string;
  startedByUserId: string;
  durationSeconds?: number;
  matchMode?: ClutchMatchMode;
  teamAssignments?: ClutchTeamAssignmentInput[];
};

export type FinishClutchRoundInput = {
  clutchId: string;
  finishedByUserId: string;
};

export type RecordVerifiedDonationScoreInput = {
  donationId: string;
  walletTransactionId: string;
  senderUserId: string;
  receiverUserId: string;
  flatAmount: number;
};


export interface ClutchRepository {
  startRound(
    input: StartClutchRoundInput,
  ): Promise<ClutchRoundRecord>;

  finishRound(
    input: FinishClutchRoundInput,
  ): Promise<ClutchRoundRecord>;


  createSessionWithCreator(
    input: CreateClutchSessionInput,
  ): Promise<ClutchSessionRecord>;

  inviteParticipant(
    input: InviteClutchParticipantInput,
  ): Promise<ClutchParticipantRecord>;

  acceptParticipant(
    clutchId: string,
    userId: string,
  ): Promise<ClutchParticipantRecord>;

  rejectParticipant(
    clutchId: string,
    userId: string,
  ): Promise<ClutchParticipantRecord>;

  findSessionById(
    clutchId: string,
  ): Promise<ClutchSessionRecord | null>;

  listInvitedSessionsByRoomId(
    roomId: string,
  ): Promise<ClutchSessionRecord[]>;

  leaveParticipant(
    clutchId: string,
    userId: string,
  ): Promise<void>;

  findActiveSessionByRoomId(
    roomId: string,
  ): Promise<ClutchSessionRecord | null>;

  listActiveParticipationsByUserId(
    userId: string,
  ): Promise<ActiveClutchParticipation[]>;

  listParticipants(
    clutchId: string,
  ): Promise<ClutchParticipantRecord[]>;

  findCurrentRound(
    clutchId: string,
  ): Promise<ClutchRoundRecord | null>;


  // FLATLIVE_CLUTCH_LIST_ROUND_PARTICIPANTS_V12
  listRoundParticipants(
    roundId: string,
  ): Promise<ClutchRoundParticipantRecord[]>;

  

  recordVerifiedDonationScore(
    input: RecordVerifiedDonationScoreInput,
  ): Promise<boolean>;
getRoundScores(
    roundId: string,
  ): Promise<Record<string, number>>;
}
