import {
  CreateLiveMatchInput,
  LiveMatch,
  LiveMatchParticipant,
} from "./match-types";

const MAX_PARTICIPANTS = 4;
const MIN_PARTICIPANTS = 2;

const globalForMatch =
  globalThis as unknown as {
    flatliveMatches?: Map<
      string,
      LiveMatch
    >;
  };

const matches =
  globalForMatch.flatliveMatches ??
  new Map<string, LiveMatch>();

globalForMatch.flatliveMatches =
  matches;

function makeMatchId() {
  return `match_${Date.now()}_${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

export function createLiveMatch(
  input: CreateLiveMatchInput,
): LiveMatch {
  const now = Date.now();

  const host: LiveMatchParticipant = {
    userId: input.hostUserId,
    roomId: input.hostRoomId,
    nickname: input.hostNickname,
    avatarUrl: input.hostAvatarUrl,
    status: "HOST",
    joinedAt: now,
  };

  const match: LiveMatch = {
    matchId: makeMatchId(),

    hostUserId: input.hostUserId,
    hostRoomId: input.hostRoomId,

    participantIds: [
      input.hostUserId,
    ],

    participants: [
      host,
    ],

    scores: {
      [input.hostUserId]: 0,
    },

    // FLATLIVE_CLUTCH_LEGACY_STORE_TEAM_V1
    matchMode: "SOLO",
    teamAssignments: [],

    status: "INVITING",

    createdAt: now,
    startedAt: null,
    endsAt: null,
    finishedAt: null,
  };

  matches.set(
    match.matchId,
    match,
  );

  return match;
}

export function getLiveMatch(
  matchId: string,
): LiveMatch | null {
  return matches.get(matchId) ?? null;
}

export function inviteLiveMatchParticipant(
  matchId: string,
  participant: Omit<
    LiveMatchParticipant,
    "status" | "joinedAt"
  >,
): LiveMatch {
  const match = matches.get(matchId);

  if (!match) {
    throw new Error(
      "MATCH_NOT_FOUND",
    );
  }

  if (
    match.status !== "INVITING" &&
    match.status !== "READY"
  ) {
    throw new Error(
      "MATCH_NOT_INVITABLE",
    );
  }

  if (
    match.participantIds.includes(
      participant.userId,
    )
  ) {
    return match;
  }

  if (
    match.participantIds.length >=
    MAX_PARTICIPANTS
  ) {
    throw new Error(
      "MATCH_PARTICIPANT_LIMIT",
    );
  }

  match.participantIds.push(
    participant.userId,
  );

  match.participants.push({
    ...participant,
    status: "INVITED",
    joinedAt: null,
  });

  match.scores[
    participant.userId
  ] = 0;

  return match;
}

export function acceptLiveMatchInvite(
  matchId: string,
  userId: string,
): LiveMatch {
  const match = matches.get(matchId);

  if (!match) {
    throw new Error(
      "MATCH_NOT_FOUND",
    );
  }

  const participant =
    match.participants.find(
      (item) =>
        item.userId === userId,
    );

  if (!participant) {
    throw new Error(
      "MATCH_PARTICIPANT_NOT_FOUND",
    );
  }

  participant.status =
    participant.status === "HOST"
      ? "HOST"
      : "ACCEPTED";

  participant.joinedAt =
    participant.joinedAt ??
    Date.now();

  const readyCount =
    match.participants.filter(
      (item) =>
        item.status === "HOST" ||
        item.status === "ACCEPTED",
    ).length;

  if (
    readyCount >=
    MIN_PARTICIPANTS
  ) {
    match.status = "READY";
  }

  return match;
}

export function rejectLiveMatchInvite(
  matchId: string,
  userId: string,
): LiveMatch {
  const match = matches.get(matchId);

  if (!match) {
    throw new Error(
      "MATCH_NOT_FOUND",
    );
  }

  const participant =
    match.participants.find(
      (item) =>
        item.userId === userId,
    );

  if (!participant) {
    throw new Error(
      "MATCH_PARTICIPANT_NOT_FOUND",
    );
  }

  if (
    participant.status ===
    "HOST"
  ) {
    throw new Error(
      "MATCH_HOST_CANNOT_REJECT",
    );
  }

  participant.status =
    "REJECTED";

  return match;
}

export function startLiveMatch(
  matchId: string,
  durationSeconds = 180,
): LiveMatch {
  const match = matches.get(matchId);

  if (!match) {
    throw new Error(
      "MATCH_NOT_FOUND",
    );
  }

  const active =
    match.participants.filter(
      (item) =>
        item.status === "HOST" ||
        item.status === "ACCEPTED",
    );

  if (
    active.length <
    MIN_PARTICIPANTS
  ) {
    throw new Error(
      "MATCH_NOT_ENOUGH_PARTICIPANTS",
    );
  }

  if (
    active.length >
    MAX_PARTICIPANTS
  ) {
    throw new Error(
      "MATCH_PARTICIPANT_LIMIT",
    );
  }

  const now = Date.now();

  // FLATLIVE_CLUTCH_ROUND_CORE_V2
  // 새 라운드 시작 시 참가자는 유지하고
  // 점수와 타이머만 새로 시작한다.
  for (
    const participantId of
    match.participantIds
  ) {
    match.scores[
      participantId
    ] = 0;
  }

  match.status = "LIVE";
  match.startedAt = now;
  match.endsAt =
    now +
    Math.max(
      30,
      durationSeconds,
    ) *
      1000;

  match.finishedAt = null;

  return match;
}

export function addLiveMatchScore(
  matchId: string,
  userId: string,
  amount: number,
): LiveMatch {
  const match = matches.get(matchId);

  if (!match) {
    throw new Error(
      "MATCH_NOT_FOUND",
    );
  }

  if (
    match.status !== "LIVE"
  ) {
    throw new Error(
      "MATCH_NOT_LIVE",
    );
  }

  if (
    !match.participantIds.includes(
      userId,
    )
  ) {
    throw new Error(
      "MATCH_PARTICIPANT_NOT_FOUND",
    );
  }

  const safeAmount =
    Math.max(
      0,
      Math.floor(amount),
    );

  match.scores[userId] =
    (match.scores[userId] ?? 0) +
    safeAmount;

  return match;
}

export function finishLiveMatch(
  matchId: string,
): LiveMatch {
  const match = matches.get(
    matchId,
  );

  if (!match) {
    throw new Error(
      "MATCH_NOT_FOUND",
    );
  }

  if (
    match.status !== "LIVE"
  ) {
    throw new Error(
      "MATCH_NOT_LIVE",
    );
  }

  // 한 판 종료와 클러치 연결 종료는 분리한다.
  // 분할/참가자는 그대로 유지하고 READY로 복귀.
  match.status = "READY";

  match.startedAt = null;
  match.endsAt = null;

  match.finishedAt =
    Date.now();

  return match;
}


export function cancelLiveMatch(
  matchId: string,
): LiveMatch {
  const match = matches.get(matchId);

  if (!match) {
    throw new Error(
      "MATCH_NOT_FOUND",
    );
  }

  match.status =
    "CANCELLED";

  match.finishedAt =
    Date.now();

  return match;
}


// FLATLIVE_CLUTCH_FIND_ACTIVE_BY_ROOM_V1
export function findLiveMatchByRoomId(
  roomId: string,
): LiveMatch | null {
  const cleanRoomId =
    roomId.trim();

  if (!cleanRoomId) {
    return null;
  }

  const candidates =
    Array.from(
      matches.values(),
    )
      .filter((match) => {
        if (
          match.status ===
            "FINISHED" ||
          match.status ===
            "CANCELLED"
        ) {
          return false;
        }

        return match.participants.some(
          (participant) =>
            participant.roomId ===
              cleanRoomId &&
            (
              participant.status ===
                "HOST" ||
              participant.status ===
                "ACCEPTED"
            ),
        );
      })
      .sort(
        (a, b) =>
          b.createdAt -
          a.createdAt,
      );

  return (
    candidates[0] ??
    null
  );
}


export function findLiveMatchInvitesByRoomId(
  roomId: string,
): LiveMatch[] {
  const cleanRoomId =
    roomId.trim();

  if (!cleanRoomId) {
    return [];
  }

  return Array.from(
    matches.values(),
  )
    .filter((match) => {
      if (
        match.status ===
          "FINISHED" ||
        match.status ===
          "CANCELLED"
      ) {
        return false;
      }

      return match.participants.some(
        (participant) =>
          participant.roomId ===
            cleanRoomId &&
          participant.status ===
            "INVITED",
      );
    })
    .sort(
      (a, b) =>
        b.createdAt -
        a.createdAt,
    );
}
