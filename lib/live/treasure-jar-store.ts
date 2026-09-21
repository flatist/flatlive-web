import { randomUUID } from "crypto";

import { listLiveRooms } from "@/lib/live/test-signaling-store";

export type TreasureJarKind =
  | "TREASURE"
  | "PORTAL";

export type TreasureJarStatus =
  | "ACTIVE"
  | "SETTLING"
  | "FINISHED"
  | "CANCELLED";

export type TreasureJarParticipant = {
  userId: string;
  joinedAt: number;
};

export type TreasureJarWinner = {
  userId: string;
  amount: number;
};

export type TreasureJarEvent = {
  id: string;
  roomId: string;
  kind: TreasureJarKind;
  creatorUserId: string;
  rewardFlat: number;
  winnerCount: number;
  createdAt: number;
  expiresAt: number;
  status: TreasureJarStatus;
  participants: TreasureJarParticipant[];
  winners: TreasureJarWinner[];
  targetRoomId: string | null;
  targetRoomTitle: string | null;
  targetRoomIds: string[];
  targetRoomTitles: string[];
  finishedAt: number | null;
};

type TreasureJarGlobal = {
  flatliveTreasureJarEvents?: Map<
    string,
    TreasureJarEvent
  >;
};

const globalForTreasure =
  globalThis as unknown as TreasureJarGlobal;

const events =
  globalForTreasure.flatliveTreasureJarEvents ??
  new Map<string, TreasureJarEvent>();

globalForTreasure.flatliveTreasureJarEvents =
  events;

const EVENT_RETENTION_MS =
  30 * 60 * 1000;

function cleanupOldEvents() {
  const now = Date.now();

  for (const [id, event] of events) {
    const reference =
      event.finishedAt ??
      event.expiresAt;

    if (
      now - reference >
      EVENT_RETENTION_MS
    ) {
      events.delete(id);
    }
  }
}

function cloneEvent(
  event: TreasureJarEvent,
): TreasureJarEvent {
  return {
    ...event,
    participants:
      event.participants.map(
        (participant) => ({
          ...participant,
        }),
      ),
    winners:
      event.winners.map(
        (winner) => ({
          ...winner,
        }),
      ),
    targetRoomIds: [...(event.targetRoomIds ?? (event.targetRoomId ? [event.targetRoomId] : []))],
    targetRoomTitles: [...(event.targetRoomTitles ?? (event.targetRoomTitle ? [event.targetRoomTitle] : []))],
  };
}

function choosePortalTargets(
  sourceRoomId: string,
  count: number,
) {
  const candidates =
    listLiveRooms().filter(
      (room) =>
        room.roomId !== sourceRoomId,
    );

  return candidates
    .map((room) => ({ room, order: Math.random() }))
    .sort((a, b) => a.order - b.order)
    .slice(0, Math.max(0, Math.floor(count)))
    .map(({ room }) => room);
}

export function createTreasureJarEvent(
  input: {
    roomId: string;
    kind: TreasureJarKind;
    creatorUserId: string;
    rewardFlat?: number;
    winnerCount?: number;
    durationSeconds?: number;
    targetRoomCount?: number;
  },
) {
  cleanupOldEvents();

  const now = Date.now();

  const durationSeconds =
    Math.min(
      600,
      Math.max(
        30,
        Math.floor(
          input.durationSeconds ?? 180,
        ),
      ),
    );

  const targets =
    input.kind === "PORTAL"
      ? choosePortalTargets(
          input.roomId,
          input.targetRoomCount ?? 1,
        )
      : [];

  const event: TreasureJarEvent = {
    id:
      `jar_${Date.now()}_${randomUUID()}`,
    roomId:
      input.roomId,
    kind:
      input.kind,
    creatorUserId:
      input.creatorUserId,
    rewardFlat:
      input.kind === "TREASURE" || input.kind === "PORTAL"
        ? Math.max(
            1,
            Math.floor(
              input.rewardFlat ?? 20,
            ),
          )
        : 0,
    winnerCount:
      input.kind === "TREASURE" || input.kind === "PORTAL"
        ? Math.min(
            500,
            Math.max(
              10,
              Math.floor(
                input.winnerCount ?? 10,
              ),
            ),
          )
        : 0,
    createdAt:
      now,
    expiresAt:
      now +
      durationSeconds * 1000,
    status:
      "ACTIVE",
    participants:
      [],
    winners:
      [],
    targetRoomId:
      targets[0]?.roomId ?? null,
    targetRoomTitle:
      targets[0]?.title ?? null,
    targetRoomIds:
      targets.map((target) => target.roomId),
    targetRoomTitles:
      targets.map((target) => String(target.title ?? "")),
    finishedAt:
      null,
  };

  events.set(
    event.id,
    event,
  );

  return cloneEvent(event);
}

export function getTreasureJarEvent(
  eventId: string,
) {
  cleanupOldEvents();

  const event =
    events.get(eventId);

  return event
    ? cloneEvent(event)
    : null;
}

export function listTreasureJarEvents(
  roomId: string,
) {
  cleanupOldEvents();

  return Array.from(
    events.values(),
  )
    .filter(
      (event) =>
        event.roomId === roomId ||
        (event.kind === "PORTAL" &&
          (event.targetRoomIds ?? (event.targetRoomId ? [event.targetRoomId] : [])).includes(roomId)),
    )
    .sort(
      (a, b) =>
        b.createdAt -
        a.createdAt,
    )
    .map(cloneEvent);
}

export function joinTreasureJarEvent(
  eventId: string,
  userId: string,
) {
  cleanupOldEvents();

  const event =
    events.get(eventId);

  if (
    !event ||
    (event.kind !== "TREASURE" && event.kind !== "PORTAL") ||
    event.status !==
      "ACTIVE"
  ) {
    return null;
  }

  const now =
    Date.now();

  if (
    now <
      event.expiresAt ||
    now >=
      event.expiresAt +
        10_000
  ) {
    return null;
  }

  const exists =
    event.participants.some(
      (participant) =>
        participant.userId ===
        userId,
    );

  if (!exists) {
    event.participants.push({
      userId,
      joinedAt:
        Date.now(),
    });
  }

  return cloneEvent(event);
}

export function extendTreasureJarEvent(
  eventId: string,
  durationSeconds = 60,
) {
  const event =
    events.get(eventId);

  if (
    !event ||
    (event.kind !== "TREASURE" && event.kind !== "PORTAL") ||
    event.status ===
      "FINISHED" ||
    event.status ===
      "CANCELLED"
  ) {
    return null;
  }

  const safeSeconds =
    Math.min(
      600,
      Math.max(
        10,
        Math.floor(
          durationSeconds,
        ),
      ),
    );

  event.status =
    "ACTIVE";
  event.participants =
    [];
  event.expiresAt =
    Date.now() +
    safeSeconds * 1000;

  return cloneEvent(event);
}

export function beginTreasureSettlement(
  eventId: string,
) {
  const event =
    events.get(eventId);

  if (
    !event ||
    (event.kind !== "TREASURE" && event.kind !== "PORTAL") ||
    event.status !==
      "ACTIVE" ||
    Date.now() <
      event.expiresAt +
        10_000
  ) {
    return null;
  }

  event.status =
    "SETTLING";

  return cloneEvent(event);
}

export function continueTreasureSettlement(
  eventId: string,
  input: {
    winners:
      TreasureJarWinner[];
    remainingRewardFlat:
      number;
    durationSeconds?: number;
  },
) {
  const event =
    events.get(eventId);

  if (
    !event ||
    (event.kind !== "TREASURE" && event.kind !== "PORTAL")
  ) {
    return null;
  }

  const merged =
    new Map<
      string,
      TreasureJarWinner
    >();

  for (
    const winner of [
      ...event.winners,
      ...input.winners,
    ]
  ) {
    const previous =
      merged.get(
        winner.userId,
      );

    merged.set(
      winner.userId,
      {
        userId:
          winner.userId,
        amount:
          Math.min(
            20,
            (previous?.amount ?? 0) +
              winner.amount,
          ),
      },
    );
  }

  event.winners =
    Array.from(
      merged.values(),
    );

  event.rewardFlat =
    Math.max(
      0,
      Math.floor(
        input.remainingRewardFlat,
      ),
    );

  // FLATLIVE_TREASURE_CLAIM_AFTER_COUNTDOWN_V2_13
  // 다음 라운드에서는 다시 카운트다운 후 새로 눌러야 하므로
  // 직전 라운드 클릭 목록을 비운다.
  event.participants =
    [];

  if (
    event.rewardFlat <= 0
  ) {
    event.status =
      "FINISHED";
    event.finishedAt =
      Date.now();

    return cloneEvent(
      event,
    );
  }

  const safeSeconds =
    Math.min(
      600,
      Math.max(
        10,
        Math.floor(
          input.durationSeconds ??
            60,
        ),
      ),
    );

  event.status =
    "ACTIVE";
  event.expiresAt =
    Date.now() +
    safeSeconds * 1000;

  return cloneEvent(event);
}

export function finishTreasureSettlement(
  eventId: string,
  winners:
    TreasureJarWinner[],
) {
  const event =
    events.get(eventId);

  if (!event) {
    return null;
  }

  event.status =
    "FINISHED";
  event.winners =
    winners.map(
      (winner) => ({
        ...winner,
      }),
    );
  event.finishedAt =
    Date.now();

  return cloneEvent(event);
}

export function cancelTreasureSettlement(
  eventId: string,
) {
  const event =
    events.get(eventId);

  if (!event) {
    return null;
  }

  if (
    event.status ===
    "SETTLING"
  ) {
    event.status =
      "ACTIVE";
  }

  return cloneEvent(event);
}
