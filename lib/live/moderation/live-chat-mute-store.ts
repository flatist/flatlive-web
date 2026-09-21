export type LiveChatMuteDuration =
  | "THIRTY_SECONDS"
  | "ONE_MINUTE"
  | "UNTIL_UNMUTED";

export type LiveChatMuteRecord = {
  roomId: string;
  broadcasterUserId: string;
  targetUserId: string;
  duration: LiveChatMuteDuration;
  createdAt: number;
  expiresAt: number | null;
};

const globalForLiveChatMute =
  globalThis as unknown as {
    flatliveChatMutes?: Map<
      string,
      LiveChatMuteRecord
    >;
  };

const chatMutes =
  globalForLiveChatMute.flatliveChatMutes ??
  new Map<string, LiveChatMuteRecord>();

globalForLiveChatMute.flatliveChatMutes =
  chatMutes;

function createKey(
  roomId: string,
  targetUserId: string,
) {
  return `${roomId}:${targetUserId}`;
}

function cleanupExpiredMute(
  roomId: string,
  targetUserId: string,
) {
  const key =
    createKey(
      roomId,
      targetUserId,
    );

  const mute =
    chatMutes.get(key);

  if (
    mute &&
    mute.expiresAt !== null &&
    mute.expiresAt <= Date.now()
  ) {
    chatMutes.delete(key);
    return null;
  }

  return mute ?? null;
}

export function setLiveChatMute(input: {
  roomId: string;
  broadcasterUserId: string;
  targetUserId: string;
  duration: LiveChatMuteDuration;
}) {
  const now = Date.now();

  const expiresAt =
    input.duration ===
    "THIRTY_SECONDS"
      ? now + 30_000
      : input.duration ===
          "ONE_MINUTE"
        ? now + 60_000
        : null;

  const record:
    LiveChatMuteRecord = {
      roomId: input.roomId,
      broadcasterUserId:
        input.broadcasterUserId,
      targetUserId:
        input.targetUserId,
      duration: input.duration,
      createdAt: now,
      expiresAt,
    };

  chatMutes.set(
    createKey(
      input.roomId,
      input.targetUserId,
    ),
    record,
  );

  return record;
}

export function getLiveChatMute(
  roomId: string,
  targetUserId: string,
) {
  return cleanupExpiredMute(
    roomId,
    targetUserId,
  );
}

export function clearLiveChatMute(
  roomId: string,
  targetUserId: string,
) {
  return chatMutes.delete(
    createKey(
      roomId,
      targetUserId,
    ),
  );
}

export function listLiveChatMutes(
  roomId: string,
) {
  const now = Date.now();

  for (
    const [key, mute]
    of chatMutes.entries()
  ) {
    if (
      mute.expiresAt !== null &&
      mute.expiresAt <= now
    ) {
      chatMutes.delete(key);
    }
  }

  return Array.from(
    chatMutes.values(),
  ).filter(
    (mute) =>
      mute.roomId === roomId,
  );
}
