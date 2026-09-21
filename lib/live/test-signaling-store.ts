export type SignalDescription = {
  type: "offer" | "answer";
  sdp: string;
};

export type ViewerSignal = {
  viewerId: string;
  userId: string;
  guestId: string;
  username: string;
  nickname: string;
  avatarUrl: string;
  offer: SignalDescription | null;
  answer: SignalDescription | null;
  createdAt: number;
  updatedAt: number;
};

type LiveRoom = {
  roomId: string;
  title: string;
  category: string;
  isAdult: boolean;
  broadcasterName: string;
  broadcasterUserId: string;
  broadcasterUsername: string;
  broadcasterAvatarUrl: string;
  deviceType: "mobile" | "pc";
  viewers: Map<string, ViewerSignal>;
  createdAt: number;
  updatedAt: number;
  broadcasterHeartbeatAt: number;
  broadcasterBackgrounded: boolean;

  chatOverlayEnabled: boolean;
  chatOverlayPosition:
    | "top-left"
    | "top-right"
    | "bottom-left"
    | "bottom-right";
  chatOverlaySize:
    | "small"
    | "medium"
    | "large";
  chatOverlayCount: 3 | 5 | 10;
  chatOverlayOpacity: 50 | 70 | 90;
  chatOverlayX: number;
  chatOverlayY: number;
};

const globalForLive = globalThis as unknown as {
  flatliveTestRooms?: Map<string, LiveRoom>;
};

const rooms =
  globalForLive.flatliveTestRooms ??
  new Map<string, LiveRoom>();

globalForLive.flatliveTestRooms = rooms;

const ROOM_TTL = 30 * 60 * 1000;
// 시청자 heartbeat는 15초 간격.
// 3회 이상 heartbeat가 없으면 비정상 종료로 판단한다.
const VIEWER_TTL = 45 * 1000;

// 방송자가 비정상 종료되거나 장시간 백그라운드 상태인 경우를 감지한다.
// 짧은 화면 잠금/앱 전환은 복구할 수 있도록 2분의 여유 시간을 둔다.
const BROADCASTER_HEARTBEAT_TTL = 2 * 60 * 1000;

function cleanupExpiredRooms() {
  const now = Date.now();

  for (const [roomId, room] of rooms) {
    for (const [viewerId, viewer] of room.viewers) {
      if (now - viewer.updatedAt > VIEWER_TTL) {
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
    isAdult?: boolean;
    broadcasterName?: string;
    broadcasterUserId?: string;
    broadcasterUsername?: string;
    broadcasterAvatarUrl?: string;
    deviceType?: "mobile" | "pc";
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
    isAdult:
      metadata?.isAdult === true,
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
    deviceType:
      metadata?.deviceType === "mobile"
        ? "mobile"
        : "pc",
    viewers: new Map(),
    createdAt: Date.now(),
    updatedAt: Date.now(),
    broadcasterHeartbeatAt: Date.now(),
    broadcasterBackgrounded: false,

    chatOverlayEnabled: true,
    chatOverlayPosition: "bottom-left",
    chatOverlaySize: "medium",
    chatOverlayCount: 5,
    chatOverlayOpacity: 70,
    chatOverlayX: 8,
    chatOverlayY: 72,
  };

  rooms.set(roomId, room);

  return room;
}

export function getLiveRoom(roomId: string) {
  cleanupExpiredRooms();
  return rooms.get(roomId) ?? null;
}

export function createViewer(
  roomId: string,
  identity?: {
    userId?: string;
    guestId?: string;
    username?: string;
    nickname?: string;
    avatarUrl?: string;
  },
) {
  const room = getLiveRoom(roomId);

  if (!room) {
    return null;
  }

  const viewerId = crypto.randomUUID();

  const viewer: ViewerSignal = {
    viewerId,
    userId:
      identity?.userId?.trim() || "",
    guestId:
      identity?.guestId?.trim() || "",
    username:
      identity?.username?.trim() || "",
    nickname:
      identity?.nickname?.trim() || "",
    avatarUrl:
      identity?.avatarUrl?.trim() || "",
    offer: null,
    answer: null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
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


/*
 * FLATLIVE_MANAGER_VIEWER_LIST_V1
 * 기존 signaling 상태를 읽기만 한다.
 * WebRTC offer/answer 값은 외부로 노출하지 않는다.
 */
export function listLiveViewers(
  roomId: string,
) {
  const room = getLiveRoom(roomId);

  if (!room) {
    return [];
  }

  return Array.from(
    room.viewers.values(),
  ).map((viewer) => ({
    viewerId: viewer.viewerId,
    userId: viewer.userId,
    guestId: viewer.guestId,
    username: viewer.username,
    nickname: viewer.nickname,
    avatarUrl: viewer.avatarUrl,
    isGuest:
      !viewer.userId ||
      !!viewer.guestId,
  }));
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
  viewer.updatedAt = Date.now();
  room.updatedAt = Date.now();

  return viewer;
}

export function touchViewerHeartbeat(
  roomId: string,
  viewerId: string,
) {
  const room = getLiveRoom(roomId);

  if (!room) {
    return null;
  }

  const viewer = room.viewers.get(viewerId);

  if (!viewer) {
    return null;
  }

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

  const deleted = room.viewers.delete(viewerId);
  room.updatedAt = Date.now();

  return deleted;
}

export function updateLiveRoomTitle(
  roomId: string,
  broadcasterUserId: string,
  title: string,
) {
  const room = getLiveRoom(roomId);

  if (!room) {
    return null;
  }

  const nextTitle = title.trim();

  if (
    !broadcasterUserId ||
    room.broadcasterUserId !==
      broadcasterUserId ||
    !nextTitle
  ) {
    return null;
  }

  room.title = nextTitle;
  room.updatedAt = Date.now();

  return room;
}

export function updateLiveRoomChatOverlay(
  roomId: string,
  broadcasterUserId: string,
  settings: {
    enabled: boolean;
    position:
      | "top-left"
      | "top-right"
      | "bottom-left"
      | "bottom-right";
    size:
      | "small"
      | "medium"
      | "large";
    count: 3 | 5 | 10;
    opacity: 50 | 70 | 90;
    x?: number;
    y?: number;
  },
) {
  const room = getLiveRoom(roomId);

  if (!room) {
    return null;
  }

  if (
    !broadcasterUserId ||
    room.broadcasterUserId !==
      broadcasterUserId
  ) {
    return null;
  }

  room.chatOverlayEnabled =
    settings.enabled;

  room.chatOverlayPosition =
    settings.position;

  room.chatOverlaySize =
    settings.size;

  room.chatOverlayCount =
    settings.count;

  room.chatOverlayOpacity =
    settings.opacity;

  if (
    typeof settings.x === "number" &&
    Number.isFinite(settings.x)
  ) {
    room.chatOverlayX =
      Math.max(
        0,
        Math.min(100, settings.x),
      );
  }

  if (
    typeof settings.y === "number" &&
    Number.isFinite(settings.y)
  ) {
    room.chatOverlayY =
      Math.max(
        0,
        Math.min(100, settings.y),
      );
  }

  room.updatedAt = Date.now();

  return room;
}


export function deleteLiveRoom(roomId: string) {
  return rooms.delete(roomId);
}

export function touchBroadcasterHeartbeat(
  roomId: string,
  broadcasterUserId: string,
) {
  const room = getLiveRoom(roomId);

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



export function setBroadcasterBackgrounded(
  roomId: string,
  broadcasterUserId: string,
  backgrounded: boolean,
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

  room.broadcasterBackgrounded =
    backgrounded;

  if (!backgrounded) {
    room.broadcasterHeartbeatAt =
      Date.now();
  }

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
  isAdult: boolean;
  broadcasterName: string;
  broadcasterUserId: string;
  broadcasterUsername: string;
  broadcasterAvatarUrl: string;
  deviceType: "mobile" | "pc";
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
      isAdult: room.isAdult === true,
      broadcasterName: room.broadcasterName,
      broadcasterUserId: room.broadcasterUserId,
      broadcasterUsername: room.broadcasterUsername,
      broadcasterAvatarUrl: room.broadcasterAvatarUrl,
      deviceType: room.deviceType,
      viewerCount: room.viewers.size,
      createdAt: room.createdAt,
      updatedAt: room.updatedAt,
    }))
    .sort((a, b) => b.createdAt - a.createdAt);
}
