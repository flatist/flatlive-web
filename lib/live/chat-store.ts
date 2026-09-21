export type LiveChatMessage = {
  id: string;
  roomId: string;
  viewerId?: string;
  userId: string;
  username: string;
  nickname: string;
  message: string;
  isBroadcaster?: boolean;
  isManager?: boolean;
  levelLabel?: string | null;
  loungeBadge?: string | null;
  fanTier?: "FAN" | "VIP" | null;
  nicknameTone?: "DEFAULT" | "FAN" | "VIP" | "BROADCASTER";
  messageType?: "CHAT" | "RECOMMEND";
  donationMode?: "single" | "repeat" | "sequence";
  createdAt: number;
};

const globalForChat = globalThis as unknown as {
  flatliveChatMessages?: Map<
    string,
    LiveChatMessage[]
  >;
};

const chatMessages =
  globalForChat.flatliveChatMessages ??
  new Map<string, LiveChatMessage[]>();

globalForChat.flatliveChatMessages =
  chatMessages;

const MAX_MESSAGES_PER_ROOM = 200;

export function addChatMessage(input: {
  roomId: string;
  viewerId?: string;
  userId: string;
  username: string;
  nickname: string;
  message: string;
  isBroadcaster?: boolean;
  isManager?: boolean;
  levelLabel?: string | null;
  loungeBadge?: string | null;
  fanTier?: "FAN" | "VIP" | null;
  nicknameTone?: "DEFAULT" | "FAN" | "VIP" | "BROADCASTER";
  messageType?: "CHAT" | "RECOMMEND";
  donationMode?: "single" | "repeat" | "sequence";
}) {
  const message: LiveChatMessage = {
    id: crypto.randomUUID(),
    roomId: input.roomId,
    viewerId: input.viewerId,
    userId: input.userId,
    username: input.username,
    nickname: input.nickname,
    message: input.message,
    isBroadcaster:
      input.isBroadcaster === true,
    isManager:
      input.isManager === true,
    levelLabel: input.levelLabel ?? null,
    loungeBadge: input.loungeBadge ?? null,
    fanTier: input.fanTier ?? null,
    nicknameTone: input.nicknameTone ?? "DEFAULT",
    messageType:
      input.messageType ?? "CHAT",
    donationMode: input.donationMode,
    createdAt: Date.now(),
  };

  const existing =
    chatMessages.get(input.roomId) ?? [];

  existing.push(message);

  if (
    existing.length >
    MAX_MESSAGES_PER_ROOM
  ) {
    existing.splice(
      0,
      existing.length -
        MAX_MESSAGES_PER_ROOM,
    );
  }

  chatMessages.set(
    input.roomId,
    existing,
  );

  return message;
}

export function listChatMessages(
  roomId: string,
) {
  return [
    ...(chatMessages.get(roomId) ?? []),
  ];
}

export function clearChatMessages(
  roomId: string,
) {
  return chatMessages.delete(roomId);
}
