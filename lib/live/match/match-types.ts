/* FLATLIVE_CLUTCH_TEAM_TYPES_V1 */

export type LiveMatchMode =
  | "SOLO"
  | "TEAM";

export type LiveMatchTeamAssignment = {
  userId: string;
  teamNo: 1 | 2;
  seatNo: 1 | 2 | 3 | 4;
};

export type LiveMatchStatus =
  | "INVITING"
  | "READY"
  | "LIVE"
  | "FINISHED"
  | "CANCELLED";

export type LiveMatchParticipantStatus =
  | "HOST"
  | "INVITED"
  | "ACCEPTED"
  | "REJECTED"
  | "LEFT";

export type LiveMatchParticipant = {
  userId: string;
  roomId: string;
  nickname: string;
  avatarUrl?: string;
  status: LiveMatchParticipantStatus;
  joinedAt: number | null;
};

export type LiveMatch = {
  matchId: string;

  hostUserId: string;
  hostRoomId: string;

  participantIds: string[];

  participants: LiveMatchParticipant[];

  scores: Record<string, number>;

  matchMode: LiveMatchMode;

  teamAssignments:
    LiveMatchTeamAssignment[];

  status: LiveMatchStatus;

  createdAt: number;
  startedAt: number | null;
  endsAt: number | null;
  finishedAt: number | null;
};

export type CreateLiveMatchInput = {
  hostUserId: string;
  hostRoomId: string;
  hostNickname: string;
  hostAvatarUrl?: string;
};

export type LiveMatchApiResponse = {
  ok: boolean;
  match?: LiveMatch;
  error?: string;
};
