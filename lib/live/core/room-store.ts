export type SignalDescription = {
  type: "offer" | "answer";
  sdp: string;
};

type ViewerSignal = {
  viewerId: string;
  offer: SignalDescription | null;
  answer: SignalDescription | null;
  createdAt: number;
  updatedAt: number;
  closeRequestedAt?: number | null;
  sessionRevision?: number;
};

type LiveRoom = {
  roomId: string;
  title: string;
  category: string;
  broadcasterName: string;
  broadcasterUserId: string;
  broadcasterUsername: string;
  broadcasterAvatarUrl: string;
  viewers: Map<string, ViewerSignal>;
  createdAt: number;
  updatedAt: number;
  broadcasterHeartbeatAt: number;
};

const globalForLive = globalThis as unknown as {
  flatliveTestRooms?: Map<string, LiveRoom>;
};

const rooms =
  globalForLive.flatliveTestRooms ??
  new Map<string, LiveRoom>();

globalForLive.flatliveTestRooms = rooms;

const ROOM_TTL = 30 * 60 * 1000;
const VIEWER_TTL = 10 * 60 * 1000;

// FLATLIVE_GENERAL_LIVE_SIGNALING_SESSION_REBUILD_V1_2
const VIEWER_CLOSE_GRACE_MS = 12 * 1000;

// 방송자가 비정상 종료된 경우를 감지하기 위한 시간.
// 새로고침 중에는 바로 방을 삭제하지 않도록 여유 시간을 둔다.
const BROADCASTER_HEARTBEAT_TTL = 30 * 1000;

function cleanupExpiredRooms() {
  const now = Date.now();

  for (const [roomId, room] of rooms) {
    for (const [viewerId, viewer] of room.viewers) {
      const closeExpired =
        typeof viewer.closeRequestedAt === "number" &&
        now - viewer.closeRequestedAt > VIEWER_CLOSE_GRACE_MS;

      const heartbeatExpired =
        now - viewer.updatedAt > VIEWER_TTL;

      if (closeExpired || heartbeatExpired) {
        room.viewers.delete(viewerId);
      }
    }

    if (
      now - room.broadcasterHeartbeatAt >
      BROADCASTER_HEARTBEAT_TTL
    ) {
      rooms.delete(roomId);
      continue;
    }

    if (
      now - room.updatedAt > ROOM_TTL &&
      room.viewers.size === 0
    ) {
      rooms.delete(roomId);
    }
  }
}

export function createLiveRoom(
  metadata?: {
    title?: string;
    category?: string;
    broadcasterName?: string;
    broadcasterUserId?: string;
    broadcasterUsername?: string;
    broadcasterAvatarUrl?: string;
  },
) {
  cleanupExpiredRooms();

  const roomId = crypto.randomUUID();

  const room: LiveRoom = {
    roomId,
    title:
      metadata?.title?.trim() ||
      "제목 없는 LIVE",
    category:
      metadata?.category?.trim() ||
      "기타",
    broadcasterName:
      metadata?.broadcasterName?.trim() ||
      "FLATIST",
    broadcasterUserId:
      metadata?.broadcasterUserId?.trim() ||
      "",
    broadcasterUsername:
      metadata?.broadcasterUsername?.trim() ||
      "",
    broadcasterAvatarUrl:
      metadata?.broadcasterAvatarUrl?.trim() ||
      "",
    viewers: new Map(),
    createdAt: Date.now(),
    updatedAt: Date.now(),
    broadcasterHeartbeatAt: Date.now(),
  };

  rooms.set(roomId, room);

  return room;
}

export function getLiveRoom(roomId: string) {
  cleanupExpiredRooms();
  return rooms.get(roomId) ?? null;
}

export function createViewer(roomId: string) {
  const room = getLiveRoom(roomId);

  if (!room) {
    return null;
  }

  const viewerId = crypto.randomUUID();

  const viewer: ViewerSignal = {
    viewerId,
    offer: null,
    answer: null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    closeRequestedAt: null,
    sessionRevision: 1,
  };

  room.viewers.set(viewerId, viewer);
  room.updatedAt = Date.now();

  return viewer;
}

export function getViewer(
  roomId: string,
  viewerId: string,
) {
  const room = getLiveRoom(roomId);

  if (!room) {
    return null;
  }

  return room.viewers.get(viewerId) ?? null;
}

export function saveOffer(
  roomId: string,
  viewerId: string,
  offer: SignalDescription,
) {
  const room = getLiveRoom(roomId);

  if (!room) {
    return null;
  }

  const viewer = room.viewers.get(viewerId);

  if (!viewer) {
    return null;
  }

  viewer.offer = offer;
  viewer.answer = null;
  viewer.closeRequestedAt = null;
  viewer.sessionRevision = viewer.sessionRevision ?? 1;
  viewer.updatedAt = Date.now();
  room.updatedAt = Date.now();

  return viewer;
}

export function saveAnswer(
  roomId: string,
  viewerId: string,
  answer: SignalDescription,
) {
  const room = getLiveRoom(roomId);

  if (!room) {
    return null;
  }

  const viewer = room.viewers.get(viewerId);

  if (!viewer) {
    return null;
  }

  viewer.answer = answer;
  viewer.closeRequestedAt = null;
  viewer.sessionRevision = viewer.sessionRevision ?? 1;
  viewer.updatedAt = Date.now();
  room.updatedAt = Date.now();

  return viewer;
}

export function deleteViewer(
  roomId: string,
  viewerId: string,
) {
  const room = getLiveRoom(roomId);

  if (!room) {
    return false;
  }

  const viewer = room.viewers.get(viewerId);
  if (!viewer) {
    return false;
  }

  // FLATLIVE_GENERAL_LIVE_SIGNALING_SESSION_REBUILD_V1_2
  viewer.closeRequestedAt = Date.now();
  viewer.sessionRevision =
    (viewer.sessionRevision ?? 1) + 1;
  room.updatedAt = Date.now();

  return true;
}

export function deleteLiveRoom(roomId: string) {
  return rooms.delete(roomId);
}

export function touchBroadcasterHeartbeat(
  roomId: string,
  broadcasterUserId: string,
) {
  const room = rooms.get(roomId);

  if (!room) {
    return null;
  }

  if (
    !broadcasterUserId ||
    room.broadcasterUserId !== broadcasterUserId
  ) {
    return null;
  }

  room.broadcasterHeartbeatAt = Date.now();
  room.updatedAt = Date.now();

  return room;
}



export function deleteLiveRoomsByBroadcasterUserId(
  broadcasterUserId: string,
) {
  let deleted = 0;

  for (const [roomId, room] of rooms) {
    if (
      room.broadcasterUserId === broadcasterUserId
    ) {
      rooms.delete(roomId);
      deleted += 1;
    }
  }

  return deleted;
}

export type LiveRoomSummary = {
  roomId: string;
  title: string;
  category: string;
  broadcasterName: string;
  broadcasterUserId: string;
  broadcasterUsername: string;
  broadcasterAvatarUrl: string;
  viewerCount: number;
  createdAt: number;
  updatedAt: number;
};

export function listLiveRooms(): LiveRoomSummary[] {
  cleanupExpiredRooms();

  return Array.from(rooms.values())
    .map((room) => ({
      roomId: room.roomId,
      title: room.title,
      category: room.category,
      broadcasterName: room.broadcasterName,
      broadcasterUserId: room.broadcasterUserId,
      broadcasterUsername: room.broadcasterUsername,
      broadcasterAvatarUrl: room.broadcasterAvatarUrl,
      viewerCount: room.viewers.size,
      createdAt: room.createdAt,
      updatedAt: room.updatedAt,
    }))
    .sort((a, b) => b.createdAt - a.createdAt);
}
